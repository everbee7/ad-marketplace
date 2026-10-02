import "server-only";

import { connectDb } from "@/lib/db";
import { Profile, type ProfileDoc } from "@/models/profile";
import { toObjectId } from "@/models/shared";

import type { ProfileDTO } from "./schemas";

export function toProfileDTO(doc: ProfileDoc): ProfileDTO | null {
  if (doc.role === "business" && doc.business) {
    const b = doc.business;
    return {
      role: "business",
      companyName: b.companyName,
      logoUrl: b.logoUrl,
      website: b.website,
      category: b.category,
      description: b.description,
    };
  }
  if (doc.role === "creator" && doc.creator) {
    const c = doc.creator;
    return {
      role: "creator",
      displayName: c.displayName,
      avatarUrl: c.avatarUrl,
      niche: c.niche,
      bio: c.bio,
      youtube: c.socialLinks?.youtube ?? null,
      tiktok: c.socialLinks?.tiktok ?? null,
      instagram: c.socialLinks?.instagram ?? null,
      other: c.socialLinks?.other ?? null,
    };
  }
  return null;
}

export async function getProfile(userId: string): Promise<ProfileDTO | null> {
  const id = toObjectId(userId);
  if (!id) return null;
  await connectDb();
  const doc = await Profile.findOne({ userId: id }).lean<ProfileDoc>();
  return doc ? toProfileDTO(doc) : null;
}

/** Business card data for the Marketplace (MKT-03). */
export async function getBusinessCard(userId: string): Promise<{
  companyName: string;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
} | null> {
  const p = await getProfile(userId);
  if (!p || p.role !== "business") return null;
  return {
    companyName: p.companyName,
    logoUrl: p.logoUrl,
    website: p.website,
    description: p.description,
  };
}
