import "server-only";

import { ROLES, type Role } from "@/config/enums";
import { posterOf } from "@/features/ads/queries";
import { countUsersByRole, searchUsers, usersByIds } from "@/lib/auth";
import { escapeRegex } from "@/lib/text";
import { CreatorVideo, type CreatorVideoDoc } from "@/models/creator-video";
import { Project } from "@/models/project";
import { toObjectId } from "@/models/shared";

import {
  ADMIN_PAGE_SIZE,
  type AdminAdRowDTO,
  type AdminAdsQuery,
  type AdminOverviewDTO,
  type AdminUserRowDTO,
  type AdminUsersQuery,
  type AdminVideoRowDTO,
  type AdminVideosQuery,
  type Paged,
} from "./schemas";

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

// Admin read models. Admins see everything, including removed, hidden and deleted content
// (ADM-03 AC1: playable only for admins).

/** ADM-01. */
export async function getAdminOverview(): Promise<AdminOverviewDTO> {
  await connectDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [pendingReview, liveAds, byRole, ads, videos] = await Promise.all([
    Ad.countDocuments({ status: "pending_review", deletedAt: null }),
    Ad.countDocuments({ status: "live", deletedAt: null }),
    countUsersByRole(),
    Ad.countDocuments({ createdAt: { $gte: since } }),
    CreatorVideo.countDocuments({ createdAt: { $gte: since } }),
  ]);
  const usersByRole = Object.fromEntries(ROLES.map((r) => [r, byRole[r] ?? 0])) as Record<
    Role,
    number
  >;
  return { pendingReview, liveAds, usersByRole, uploadsLast24h: { ads, videos } };
}

/** ADM-03 ads table: search by title/business, filter by status (or deleted). */
export async function listAdminAds(q: AdminAdsQuery): Promise<Paged<AdminAdRowDTO>> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (q.status === "deleted") filter.deletedAt = { $ne: null };
  else if (q.status) Object.assign(filter, { status: q.status, deletedAt: null });
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: "i" };
    filter.$or = [{ title: rx }, { businessName: rx }];
  }
  const [docs, total] = await Promise.all([
    Ad.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .lean<AdDoc[]>(),
    Ad.countDocuments(filter),
  ]);
  return {
    total,
    page: q.page,
    pageSize: ADMIN_PAGE_SIZE,
    rows: docs.map((a) => ({
      id: String(a._id),
      title: a.title,
      businessName: a.businessName,
      status: a.status,
      deleted: !!a.deletedAt,
      inMarketplace: a.inMarketplace,
      posterUrl: posterOf(a),
      videoUrl: a.video?.url ?? a.pendingVideo?.url ?? null,
      createdAt: a.createdAt.toISOString(),
      removalReason: a.removalReason,
      rejectionReason: a.rejectionReason,
    })),
  };
}

/** ADM-03 creator videos table: search by title, optionally only hidden ones. */
export async function listAdminVideos(q: AdminVideosQuery): Promise<Paged<AdminVideoRowDTO>> {
  await connectDb();
  const filter: Record<string, unknown> = { deletedAt: null };
  if (q.hidden) filter.hiddenByAdmin = true;
  if (q.q) filter.title = { $regex: escapeRegex(q.q), $options: "i" };
  const [docs, total] = await Promise.all([
    CreatorVideo.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .lean<CreatorVideoDoc[]>(),
    CreatorVideo.countDocuments(filter),
  ]);
  const owners = await usersByIds(docs.map((d) => String(d.creatorId)));
  return {
    total,
    page: q.page,
    pageSize: ADMIN_PAGE_SIZE,
    rows: docs.map((v) => ({
      id: String(v._id),
      title: v.title,
      creatorEmail: owners.get(String(v.creatorId))?.email ?? null,
      status: v.status,
      hidden: v.hiddenByAdmin,
      posterUrl: v.video?.posterUrl ?? null,
      videoUrl: v.video?.url ?? null,
      durationSec: v.video?.durationSec ?? null,
      createdAt: v.createdAt.toISOString(),
    })),
  };
}

/** ADM-04: search by email, filter by role, with profile name and content counts. */
export async function listAdminUsers(q: AdminUsersQuery): Promise<Paged<AdminUserRowDTO>> {
  await connectDb();
  const { rows, total } = await searchUsers({
    email: q.q,
    role: q.role,
    page: q.page,
    pageSize: ADMIN_PAGE_SIZE,
  });
  const ids = rows.map((r) => r.id);
  const oids = ids.map((id) => toObjectId(id));
  const [profiles, adCounts, videoCounts, projectCounts] = await Promise.all([
    Profile.find({ userId: { $in: oids } }, { userId: 1, business: 1, creator: 1 }).lean(),
    Ad.aggregate<{ _id: unknown; n: number }>([
      {
        $match: {
          deletedAt: null,
          businessId: { $in: ids.map((id) => toObjectId(id)) },
        },
      },
      { $group: { _id: "$businessId", n: { $sum: 1 } } },
    ]),
    CreatorVideo.aggregate<{ _id: unknown; n: number }>([
      {
        $match: {
          deletedAt: null,
          creatorId: { $in: ids.map((id) => toObjectId(id)) },
        },
      },
      { $group: { _id: "$creatorId", n: { $sum: 1 } } },
    ]),
    Project.aggregate<{ _id: unknown; n: number }>([
      {
        $match: {
          deletedAt: null,
          creatorId: { $in: ids.map((id) => toObjectId(id)) },
        },
      },
      { $group: { _id: "$creatorId", n: { $sum: 1 } } },
    ]),
  ]);
  const byUser = (list: { _id: unknown; n: number }[]) =>
    new Map(list.map((c) => [String(c._id), c.n]));
  const ads = byUser(adCounts);
  const videos = byUser(videoCounts);
  const projects = byUser(projectCounts);
  const profileBy = new Map(profiles.map((p) => [String(p.userId), p]));
  return {
    total,
    page: q.page,
    pageSize: ADMIN_PAGE_SIZE,
    rows: rows.map((u) => {
      const p = profileBy.get(u.id);
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        emailVerified: u.emailVerified,
        onboardingCompleted: u.onboardingCompleted,
        createdAt: u.createdAt.toISOString(),
        displayName: p?.business?.companyName ?? p?.creator?.displayName ?? null,
        counts: {
          ads: ads.get(u.id) ?? 0,
          videos: videos.get(u.id) ?? 0,
          projects: projects.get(u.id) ?? 0,
        },
      };
    }),
  };
}
