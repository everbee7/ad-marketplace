import "server-only";

import type { Types } from "mongoose";

import { DURATION_BANDS } from "@/config/enums";
import { limits } from "@/config/limits";
import { posterOf } from "@/features/ads/queries";
import { connectDb } from "@/lib/db";
import type { CurrentUser } from "@/lib/permissions";
import { Ad, type AdDoc } from "@/models/ad";
import { Profile } from "@/models/profile";
import { SavedAd } from "@/models/saved-ad";
import { toObjectId } from "@/models/shared";

import type {
  AdCardDTO,
  MarketplaceAdDetailDTO,
  MarketplacePage,
  MarketplaceQuery,
} from "./schemas";

// Keyset pagination: the cursor encodes the sort key + _id, so ads added meanwhile never cause
// duplicates or gaps (MKT-01 AC2). Only `inMarketplace` ads are listed (MKT-01 AC1, ADR-0006).

type SortSpec = { field: "createdAt" | "saveCount" | "projectCount" };
const SORTS: Record<MarketplaceQuery["sort"], SortSpec> = {
  newest: { field: "createdAt" },
  most_saved: { field: "saveCount" },
  most_used: { field: "projectCount" },
};

type Cursor = { v: number; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString()) as Partial<Cursor>;
    return typeof c.v === "number" && typeof c.id === "string" && toObjectId(c.id)
      ? (c as Cursor)
      : null;
  } catch {
    return null;
  }
}

function sortValue(ad: AdDoc, field: SortSpec["field"]): number {
  return field === "createdAt" ? ad.createdAt.getTime() : ad[field];
}

export function toAdCard(ad: AdDoc, saved?: Set<string>): AdCardDTO | null {
  if (!ad.video) return null;
  const id = String(ad._id);
  return {
    id,
    title: ad.title,
    businessName: ad.businessName,
    businessLogoUrl: ad.businessLogoUrl,
    category: ad.category,
    durationSec: ad.video.durationSec,
    aspectRatio: ad.video.aspectRatio,
    posterUrl: posterOf(ad),
    videoUrl: ad.video.url,
    ...(saved ? { saved: saved.has(id) } : {}),
  };
}

/** Which of these ads the creator has saved (MKT-04 AC2: one source of truth). */
export async function savedSet(
  user: CurrentUser,
  adIds: Types.ObjectId[],
): Promise<Set<string> | undefined> {
  if (user.role !== "creator" || adIds.length === 0)
    return user.role === "creator" ? new Set() : undefined;
  const rows = await SavedAd.find(
    { creatorId: toObjectId(user.id), adId: { $in: adIds } },
    { adId: 1 },
  ).lean();
  return new Set(rows.map((r) => String(r.adId)));
}

/** MKT-01 / MKT-02. */
export async function searchMarketplace(
  user: CurrentUser,
  q: MarketplaceQuery,
): Promise<MarketplacePage> {
  await connectDb();
  const { field } = SORTS[q.sort];
  const filter: Record<string, unknown> = { inMarketplace: true, deletedAt: null };
  if (q.q) filter.$text = { $search: q.q };
  if (q.category.length) filter.category = { $in: q.category };
  if (q.duration) {
    // Half-open, gap-free bands; the outer edges absorb the ± tolerance of accepted ads.
    const band = DURATION_BANDS[q.duration];
    const range: Record<string, number> = {};
    if (q.duration !== "short") range.$gte = band.min;
    if (q.duration !== "long") range.$lt = band.max;
    filter["video.durationSec"] = range;
  }
  if (q.aspect) filter["video.aspectRatio"] = q.aspect;

  const cursor = decodeCursor(q.cursor);
  if (cursor) {
    const v = field === "createdAt" ? new Date(cursor.v) : cursor.v;
    const id = toObjectId(cursor.id);
    filter.$or = [{ [field]: { $lt: v } }, { [field]: v, _id: { $lt: id } }];
  }

  const pageSize = limits.marketplace.pageSize;
  const docs = await Ad.find(filter)
    .sort({ [field]: -1, _id: -1 })
    .limit(pageSize + 1)
    .lean<AdDoc[]>();
  const page = docs.slice(0, pageSize);
  const saved = await savedSet(
    user,
    page.map((d) => d._id),
  );
  const last = page.at(-1);
  return {
    items: page.map((d) => toAdCard(d, saved)).filter((c): c is AdCardDTO => c !== null),
    nextCursor:
      docs.length > pageSize && last
        ? encodeCursor({ v: sortValue(last, field), id: String(last._id) })
        : null,
  };
}

/** MKT-03: visible to everyone when in the Marketplace; otherwise only to its owner and admins (AC1). */
export async function getMarketplaceAd(
  user: CurrentUser,
  id: string,
): Promise<MarketplaceAdDetailDTO | null> {
  const oid = toObjectId(id);
  if (!oid) return null;
  await connectDb();
  const ad = await Ad.findOne({ _id: oid, deletedAt: null }).lean<AdDoc>();
  if (!ad?.video) return null;
  const isOwner = String(ad.businessId) === user.id;
  if (!ad.inMarketplace && !isOwner && user.role !== "admin") return null;
  const [profile, saved] = await Promise.all([
    Profile.findOne({ userId: ad.businessId }, { business: 1 }).lean(),
    savedSet(user, [ad._id]),
  ]);
  const card = toAdCard(ad, saved)!;
  return {
    ...card,
    description: ad.description,
    tags: ad.tags,
    width: ad.video.width,
    height: ad.video.height,
    available: ad.inMarketplace,
    isOwner,
    business: {
      id: String(ad.businessId),
      name: profile?.business?.companyName ?? ad.businessName,
      logoUrl: profile?.business?.logoUrl ?? ad.businessLogoUrl,
      website: profile?.business?.website ?? null,
      description: profile?.business?.description ?? null,
    },
  };
}

/** MKT-05: newest saved first; ads no longer in the Marketplace come back as unavailable (AC2). */
export async function listSavedAds(user: CurrentUser): Promise<AdCardDTO[]> {
  await connectDb();
  const rows = await SavedAd.find({ creatorId: toObjectId(user.id) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(500)
    .lean();
  if (rows.length === 0) return [];
  const ads = await Ad.find({ _id: { $in: rows.map((r) => r.adId) } }).lean<AdDoc[]>();
  const byId = new Map(ads.map((a) => [String(a._id), a]));
  const cards: AdCardDTO[] = [];
  for (const row of rows) {
    const ad = byId.get(String(row.adId));
    if (!ad) continue;
    const available = ad.inMarketplace && !ad.deletedAt;
    const card = toAdCard(ad, new Set([String(ad._id)]));
    if (card) {
      cards.push(
        available
          ? { ...card, available }
          : {
              ...card,
              available,
              videoUrl: "",
              posterUrl: null,
              title: ad.deletedAt ? "Deleted ad" : card.title,
            },
      );
    }
  }
  return cards;
}
