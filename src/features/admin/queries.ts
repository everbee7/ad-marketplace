import "server-only";

import type { ReviewItemDTO } from "@/features/ads/schemas";
import { auth } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Ad, type AdDoc } from "@/models/ad";
import { Profile } from "@/models/profile";

/** ADM-02: pending ads, oldest first. Returns the head of the queue plus the total. */
export async function getReviewQueue(): Promise<{ item: ReviewItemDTO | null; total: number }> {
  await connectDb();
  const filter = { status: "pending_review" as const, deletedAt: null };
  const [ad, total] = await Promise.all([
    Ad.findOne(filter).sort({ submittedAt: 1, _id: 1 }).lean<AdDoc>(),
    Ad.countDocuments(filter),
  ]);
  if (!ad) return { item: null, total };
  const video = ad.pendingVideo ?? ad.video;
  if (!video) return { item: null, total };

  const [profile, ctx] = await Promise.all([
    Profile.findOne({ userId: ad.businessId }, { business: 1 }).lean(),
    auth.$context,
  ]);
  const owner = await ctx.internalAdapter.findUserById(String(ad.businessId));
  return {
    total,
    item: {
      id: String(ad._id),
      title: ad.title,
      description: ad.description,
      category: ad.category,
      tags: ad.tags,
      videoUrl: video.url,
      posterUrl: video.posterUrl,
      durationSec: video.durationSec,
      aspectRatio: video.aspectRatio,
      isReplacement: !!ad.pendingVideo && !!ad.approvedAt,
      submittedAt: ad.submittedAt?.toISOString() ?? null,
      business: {
        id: String(ad.businessId),
        name: profile?.business?.companyName ?? ad.businessName,
        logoUrl: profile?.business?.logoUrl ?? null,
        email: owner?.email ?? null,
        website: profile?.business?.website ?? null,
      },
    },
  };
}
