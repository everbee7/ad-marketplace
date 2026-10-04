import "server-only";

import type { z } from "zod";

import { syncBusinessIdentity } from "@/features/ads/service";
import { verifyImageUrl } from "@/features/uploads/service";
import { auth } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/permissions";
import { deleteObjects } from "@/lib/storage";
import { Profile, type ProfileDoc } from "@/models/profile";
import { toObjectId } from "@/models/shared";

import type { profileSchema } from "./schemas";

type ProfileData = z.output<typeof profileSchema>;

/** PRF-01 (first save) and PRF-02 (edits). Marks onboarding complete once required fields are saved. */
export async function saveProfile(user: CurrentUser, data: ProfileData): Promise<ProfileDoc> {
  if (user.role !== data.role)
    throw new DomainError("FORBIDDEN", "This profile doesn't match your account.");
  await connectDb();
  const userId = toObjectId(user.id);
  if (!userId) throw new DomainError("FORBIDDEN", "Invalid account.");

  const previous = await Profile.findOne({ userId }).lean();
  let update: Partial<ProfileDoc>;
  let replacedImage: string | null = null;

  if (data.role === "business") {
    const logoUrl = await verifyImageUrl(user, data.logoUrl, "logo");
    if (previous?.business?.logoUrl && previous.business.logoUrl !== logoUrl) {
      replacedImage = previous.business.logoUrl;
    }
    update = {
      role: "business",
      business: {
        companyName: data.companyName,
        logoUrl,
        website: data.website,
        category: data.category,
        description: data.description,
      },
      creator: null,
    };
  } else {
    const avatarUrl = await verifyImageUrl(user, data.avatarUrl, "avatar");
    if (previous?.creator?.avatarUrl && previous.creator.avatarUrl !== avatarUrl) {
      replacedImage = previous.creator.avatarUrl;
    }
    update = {
      role: "creator",
      creator: {
        displayName: data.displayName,
        avatarUrl,
        niche: data.niche,
        bio: data.bio,
        socialLinks: {
          youtube: data.youtube,
          tiktok: data.tiktok,
          instagram: data.instagram,
          other: data.other,
        },
      },
      business: null,
    };
  }

  const saved = await Profile.findOneAndUpdate(
    { userId },
    { $set: update, $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true, lean: true },
  );
  if (!saved) throw new DomainError("INTERNAL", "Profile could not be saved.");

  if (!user.onboardingCompleted) {
    const ctx = await auth.$context;
    await ctx.internalAdapter.updateUser(user.id, { onboardingCompleted: true });
  }
  if (replacedImage) await deleteObjects([replacedImage]);
  // PRF-02 AC1: Marketplace cards show the new name/logo straight away.
  if (saved.business) {
    await syncBusinessIdentity(user.id, saved.business.companyName, saved.business.logoUrl);
  }
  return saved;
}
