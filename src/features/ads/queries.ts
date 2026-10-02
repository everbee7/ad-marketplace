import "server-only";

import type { AdStatus } from "@/config/enums";
import { connectDb } from "@/lib/db";
import type { CurrentUser } from "@/lib/permissions";
import { Ad, type AdDoc } from "@/models/ad";
import { toObjectId } from "@/models/shared";

import type { AdDetailDTO, BusinessAdDTO } from "./schemas";

export function posterOf(
  ad: Pick<AdDoc, "customThumbnailUrl" | "video" | "pendingVideo">,
): string | null {
  return ad.customThumbnailUrl ?? ad.video?.posterUrl ?? ad.pendingVideo?.posterUrl ?? null;
}

export function toBusinessAdDTO(ad: AdDoc): BusinessAdDTO {
  return {
    id: String(ad._id),
    title: ad.title,
    status: ad.status,
    category: ad.category,
    posterUrl: posterOf(ad),
    durationSec: ad.video?.durationSec ?? null,
    aspectRatio: ad.video?.aspectRatio ?? null,
    saveCount: ad.saveCount,
    projectCount: ad.projectCount,
    createdAt: ad.createdAt.toISOString(),
    hasPendingVideo: !!ad.pendingVideo,
    errorMessage: ad.errorMessage ?? null,
  };
}

/** AD-03: the business's own ads, newest first, optionally filtered by status. */
export async function listBusinessAds(
  user: CurrentUser,
  status?: AdStatus,
): Promise<BusinessAdDTO[]> {
  await connectDb();
  const ads = await Ad.find({
    businessId: toObjectId(user.id),
    deletedAt: null,
    ...(status ? { status } : {}),
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(500)
    .lean<AdDoc[]>();
  return ads.map(toBusinessAdDTO);
}

export async function countBusinessAdsByStatus(
  user: CurrentUser,
): Promise<Partial<Record<AdStatus, number>>> {
  await connectDb();
  const rows = await Ad.aggregate<{ _id: AdStatus; n: number }>([
    { $match: { businessId: toObjectId(user.id), deletedAt: null } },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

/** AD-04: detail for the owner (or an admin). Null when not found or not visible. */
export async function getBusinessAd(user: CurrentUser, id: string): Promise<AdDetailDTO | null> {
  const oid = toObjectId(id);
  if (!oid) return null;
  await connectDb();
  const ad = await Ad.findOne({ _id: oid, deletedAt: null }).lean<AdDoc>();
  if (!ad || (user.role !== "admin" && String(ad.businessId) !== user.id)) return null;
  return {
    ...toBusinessAdDTO(ad),
    description: ad.description,
    tags: ad.tags,
    videoUrl: ad.video?.url ?? null,
    pendingVideoUrl: ad.pendingVideo?.url ?? null,
    customThumbnailUrl: ad.customThumbnailUrl,
    rejectionReason: ad.rejectionReason,
    removalReason: ad.removalReason,
    inMarketplace: ad.inMarketplace,
    statusHistory: ad.statusHistory.map((h) => ({
      status: h.status,
      at: h.at.toISOString(),
      reason: h.reason,
    })),
  };
}
