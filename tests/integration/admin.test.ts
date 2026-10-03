import { describe, expect, it } from "vitest";

import {
  getAdminOverview,
  listAdminAds,
  listAdminUsers,
  listAdminVideos,
} from "@/features/admin/queries";
import {
  adminAdsQuerySchema,
  adminUsersQuerySchema,
  adminVideosQuerySchema,
} from "@/features/admin/schemas";
import { approveAd, deleteAd, removeAd } from "@/features/ads/service";
import { getMarketplaceAd } from "@/features/marketplace/queries";
import { getCreatorVideo } from "@/features/videos/queries";
import { videoMetaSchema } from "@/features/videos/schemas";
import {
  finalizeVideoUpload,
  setVideoHidden,
  startNewVideoUpload,
} from "@/features/videos/service";
import { putObject } from "@/lib/storage";
import { ModerationLog } from "@/models/moderation-log";

import { createBusiness, fileMeta, fixtureBytes, JPEG, uploadAd } from "../support/ads";
import { createTestUser } from "../support/users";

describe("ADM-01 overview", () => {
  it("counts pending, live, users by role and recent uploads", async () => {
    const before = await getAdminOverview();
    const admin = await createTestUser("admin");
    const business = await createBusiness("Count Co");
    await createTestUser("creator");
    const a = await uploadAd(business, "ad-1s-vertical.mp4", { title: "Pending one" });
    const b = await uploadAd(business, "ad-1s-vertical.mp4", { title: "Live one" });
    await approveAd(admin, b.start.id);
    const after = await getAdminOverview();
    expect(after.pendingReview - before.pendingReview).toBe(1);
    expect(after.liveAds - before.liveAds).toBe(1);
    expect(after.usersByRole.business - before.usersByRole.business).toBe(1);
    expect(after.usersByRole.creator - before.usersByRole.creator).toBe(1);
    expect(after.uploadsLast24h.ads - before.uploadsLast24h.ads).toBe(2);
    expect(a.start.id).toBeTruthy();
  });
});

describe("ADM-03 content moderation", () => {
  it("ads table searches, filters and includes deleted ads", async () => {
    const business = await createBusiness("Zebra Foods");
    const { start } = await uploadAd(business, "ad-1s-vertical.mp4", { title: "Striped snack" });
    const byTitle = await listAdminAds(adminAdsQuerySchema.parse({ q: "striped" }));
    expect(byTitle.rows.map((r) => r.id)).toContain(start.id);
    const byBusiness = await listAdminAds(adminAdsQuerySchema.parse({ q: "zebra" }));
    expect(byBusiness.rows.map((r) => r.id)).toContain(start.id);
    const pending = await listAdminAds(
      adminAdsQuerySchema.parse({ status: "pending_review", q: "striped" }),
    );
    expect(pending.rows).toHaveLength(1);
    await deleteAd(business, start.id);
    const deleted = await listAdminAds(
      adminAdsQuerySchema.parse({ status: "deleted", q: "striped" }),
    );
    expect(deleted.rows[0]).toMatchObject({ id: start.id, deleted: true });
  });

  it("Remove needs a live ad, is logged and makes the ad unplayable for non-admins (AC1)", async () => {
    const admin = await createTestUser("admin");
    const creator = await createTestUser("creator", { onboarded: true });
    const business = await createBusiness();
    const { start } = await uploadAd(business);
    await expect(removeAd(admin, start.id, "Breaks rules")).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await approveAd(admin, start.id);
    await removeAd(admin, start.id, "Breaks rules");
    expect(await getMarketplaceAd(creator, start.id)).toBeNull();
    expect(await getMarketplaceAd(admin, start.id)).not.toBeNull();
    const log = await ModerationLog.findOne({ targetId: start.id, action: "remove" }).lean();
    expect(log).toMatchObject({ reason: "Breaks rules", targetType: "ad" });
  });

  it("videos table searches; hide/unhide is logged", async () => {
    const admin = await createTestUser("admin");
    const creator = await createTestUser("creator", { onboarded: true });
    const start = await startNewVideoUpload(
      creator,
      videoMetaSchema.parse({ title: "Secret plans" }),
      fileMeta({ durationSec: 10 }),
    );
    const v = await putObject(start.video.pathname, fixtureBytes("video-10s.mp4"), "video/mp4");
    const p = await putObject(start.poster.pathname, JPEG, "image/jpeg");
    await finalizeVideoUpload(creator, start.id, { videoUrl: v.url, posterUrl: p.url });

    const found = await listAdminVideos(adminVideosQuerySchema.parse({ q: "secret" }));
    expect(found.rows[0]).toMatchObject({
      id: start.id,
      creatorEmail: creator.email,
      hidden: false,
    });
    await setVideoHidden(admin, start.id, true, "Copyright");
    expect(
      (await listAdminVideos(adminVideosQuerySchema.parse({ hidden: "1", q: "secret" }))).rows,
    ).toHaveLength(1);
    expect((await getCreatorVideo(creator, start.id))?.url).toBeNull();
    await setVideoHidden(admin, start.id, false);
    const actions = (
      await ModerationLog.find({ targetId: start.id }).sort({ createdAt: 1 }).lean()
    ).map((l) => [l.action, l.reason]);
    expect(actions).toEqual([
      ["hide", "Copyright"],
      ["unhide", null],
    ]);
  });
});

describe("ADM-04 users", () => {
  it("searches by email, filters by role and shows content counts", async () => {
    const business = await createBusiness("Users Co");
    await uploadAd(business);
    const res = await listAdminUsers(
      adminUsersQuerySchema.parse({ q: business.email.slice(0, 14), role: "business" }),
    );
    expect(res.rows[0]).toMatchObject({
      email: business.email,
      role: "business",
      displayName: "Users Co",
      counts: { ads: 1 },
    });
    const creators = await listAdminUsers(adminUsersQuerySchema.parse({ role: "creator" }));
    expect(creators.rows.every((r) => r.role === "creator")).toBe(true);
  });
});
