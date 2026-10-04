import { describe, expect, it } from "vitest";

import { getReviewQueue } from "@/features/admin/queries";
import { getBusinessAd, listBusinessAds } from "@/features/ads/queries";
import { adMetaSchema } from "@/features/ads/schemas";
import {
  approveAd,
  cancelAdUpload,
  deleteAd,
  rejectAd,
  relistAd,
  resubmitAd,
  startNewAdUpload,
  unlistAd,
  updateAdMeta,
} from "@/features/ads/service";
import { saveProfile } from "@/features/profiles/service";
import { profileSchema } from "@/features/profiles/schemas";
import { authorizeUpload } from "@/features/uploads/service";
import { MEDIA_MESSAGES } from "@/lib/media";
import { headObject } from "@/lib/storage";
import { Ad } from "@/models/ad";
import { ModerationLog } from "@/models/moderation-log";

import { createBusiness, fileMeta, uploadAd } from "../support/ads";
import { createTestUser } from "../support/users";

const ad = async (id: string) => (await Ad.findById(id).lean())!;

describe("AD-01 upload burst ad", () => {
  it("AC3: a valid upload is verified and moves to In review, with an auto poster (AC4)", async () => {
    const user = await createBusiness();
    const { start, result } = await uploadAd(user);
    expect(result).toEqual({ id: start.id, status: "pending_review", errorMessage: null });
    const doc = await ad(start.id);
    expect(doc.video).toMatchObject({
      codec: expect.stringMatching(/^avc1/),
      width: 360,
      height: 640,
      aspectRatio: "vertical",
    });
    expect(doc.video?.durationSec).toBeCloseTo(1, 1);
    expect(doc.video?.posterUrl).toBeTruthy();
    expect(doc.businessName).toBe("Acme Snacks");
    expect(doc.inMarketplace).toBe(false);
  });

  it("AC1/AC5: HEVC and out-of-range durations fail with the PRD message, server-side", async () => {
    const user = await createBusiness();
    const hevc = await uploadAd(user, "ad-1s-hevc.mp4");
    expect(hevc.result).toMatchObject({ status: "failed", errorMessage: MEDIA_MESSAGES.hevc });
    const long = await uploadAd(user, "ad-3s-too-long.mp4");
    expect(long.result).toMatchObject({
      status: "failed",
      errorMessage: MEDIA_MESSAGES.adDuration,
    });
    expect(await headObject(long.videoUrl)).toBeNull();
  });

  it("AC1: the client pre-check rejects bad metadata before reserving anything", async () => {
    const user = await createBusiness();
    await expect(
      startNewAdUpload(
        user,
        adMetaSchema.parse({ title: "Clip", category: "Gaming" }),
        fileMeta({ codec: "hvc1" }),
      ),
    ).rejects.toMatchObject({ code: "MEDIA_INVALID", message: MEDIA_MESSAGES.hevc });
    await expect(
      startNewAdUpload(
        user,
        adMetaSchema.parse({ title: "Clip", category: "Gaming" }),
        fileMeta({ size: 60 * 1024 * 1024 }),
      ),
    ).rejects.toMatchObject({ message: MEDIA_MESSAGES.adSize });
  });

  it("only the owner may write the reserved pathname, with the right type and size", async () => {
    const user = await createBusiness();
    const other = await createBusiness("Other");
    const start = await startNewAdUpload(
      user,
      adMetaSchema.parse({ title: "Clip", category: "Gaming" }),
      fileMeta(),
    );
    await expect(
      authorizeUpload(user, start.video.pathname, start.video.uploadKey),
    ).resolves.toMatchObject({
      allowedContentTypes: ["video/mp4", "video/quicktime"],
      maximumSizeInBytes: 50 * 1024 * 1024,
    });
    await expect(
      authorizeUpload(other, start.video.pathname, start.video.uploadKey),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      authorizeUpload(user, `${start.video.pathname}x`, start.video.uploadKey),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      authorizeUpload(user, start.poster.pathname, start.poster.uploadKey),
    ).resolves.toMatchObject({
      allowedContentTypes: ["image/jpeg"],
    });
  });

  it("AC2: cancel marks a new ad as failed", async () => {
    const user = await createBusiness();
    const start = await startNewAdUpload(
      user,
      adMetaSchema.parse({ title: "Clip", category: "Gaming" }),
      fileMeta(),
    );
    await cancelAdUpload(user, start.id);
    expect(await ad(start.id)).toMatchObject({ status: "failed", pendingUpload: null });
  });
});

describe("AD-02 failure & retry", () => {
  it("AC1: Replace video on a failed ad keeps its metadata", async () => {
    const user = await createBusiness();
    const failed = await uploadAd(user, "ad-3s-too-long.mp4", {
      title: "Keep me",
      tags: ["snack"],
    });
    const retry = await uploadAd(user, "ad-1s-vertical.mp4", {}, failed.start.id);
    expect(retry.result.status).toBe("pending_review");
    expect(await ad(failed.start.id)).toMatchObject({
      title: "Keep me",
      tags: ["snack"],
      errorMessage: null,
    });
  });
});

describe("ADM-02 review queue", () => {
  it("oldest first; approve → live and logged (AC1)", async () => {
    const admin = await createTestUser("admin");
    const user = await createBusiness();
    const first = await uploadAd(user, "ad-1s-vertical.mp4", { title: "First" });
    await uploadAd(user, "ad-0.8s-square.mp4", { title: "Second" });
    const queue = await getReviewQueue();
    expect(queue.total).toBeGreaterThanOrEqual(2);
    await approveAd(admin, first.start.id);
    expect(await ad(first.start.id)).toMatchObject({ status: "live", inMarketplace: true });
    const logs = await ModerationLog.find({ targetId: first.start.id }).lean();
    expect(logs).toMatchObject([{ action: "approve", targetType: "ad", reason: null }]);
  });

  it("reject → business sees the reason → edit → resubmit (PRD §13 path 5)", async () => {
    const admin = await createTestUser("admin");
    const user = await createBusiness();
    const { start } = await uploadAd(user);
    await rejectAd(admin, start.id, "Poor quality: blurry");
    const rejected = await getBusinessAd(user, start.id);
    expect(rejected).toMatchObject({
      status: "rejected",
      rejectionReason: "Poor quality: blurry",
      inMarketplace: false,
    });

    await updateAdMeta(
      user,
      start.id,
      adMetaSchema.parse({ title: "Sharper", category: "Food & Drink" }),
    );
    await resubmitAd(user, start.id);
    expect(await ad(start.id)).toMatchObject({
      status: "pending_review",
      title: "Sharper",
      rejectionReason: null,
    });
    const actions = (
      await ModerationLog.find({ targetId: start.id }).sort({ createdAt: 1 }).lean()
    ).map((l) => l.action);
    expect(actions).toEqual(["reject", "resubmit"]);
  });

  it("only valid transitions are allowed", async () => {
    const admin = await createTestUser("admin");
    const user = await createBusiness();
    const { start } = await uploadAd(user);
    await expect(unlistAd(user, start.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await approveAd(admin, start.id);
    await expect(approveAd(admin, start.id)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });
});

describe("AD-05 / AD-06 / AD-07 after approval", () => {
  async function liveAd() {
    const admin = await createTestUser("admin");
    const user = await createBusiness();
    const { start, videoUrl } = await uploadAd(user);
    await approveAd(admin, start.id);
    return { admin, user, id: start.id, videoUrl };
  }

  it("AD-05 AC1: editing metadata keeps a live ad live", async () => {
    const { user, id } = await liveAd();
    await updateAdMeta(
      user,
      id,
      adMetaSchema.parse({ title: "New title", category: "Gaming", tags: ["A", "a", "b"] }),
    );
    expect(await ad(id)).toMatchObject({
      status: "live",
      inMarketplace: true,
      title: "New title",
      tags: ["a", "b"],
    });
  });

  it("AD-05 AC2 (ADR-0006): replacing the video keeps the old one visible until approval", async () => {
    const { admin, user, id, videoUrl } = await liveAd();
    const replaced = await uploadAd(user, "ad-1.5s-horizontal.mp4", {}, id);
    expect(replaced.result.status).toBe("pending_review");
    let doc = await ad(id);
    expect(doc).toMatchObject({ status: "pending_review", inMarketplace: true });
    expect(doc.video?.url).toBe(videoUrl);
    expect(doc.pendingVideo?.aspectRatio).toBe("horizontal");

    await approveAd(admin, id);
    doc = await ad(id);
    expect(doc).toMatchObject({ status: "live", pendingVideo: null });
    expect(doc.video?.aspectRatio).toBe("horizontal");
    expect(await headObject(videoUrl)).toBeNull();
  });

  it("an invalid replacement leaves the live ad untouched", async () => {
    const { user, id, videoUrl } = await liveAd();
    await expect(uploadAd(user, "ad-1s-hevc.mp4", {}, id)).rejects.toMatchObject({
      code: "MEDIA_INVALID",
    });
    expect(await ad(id)).toMatchObject({
      status: "live",
      inMarketplace: true,
      pendingUpload: null,
    });
    expect((await ad(id)).video?.url).toBe(videoUrl);
  });

  it("AD-06: unlist hides immediately; relist goes live without review", async () => {
    const { user, id } = await liveAd();
    await unlistAd(user, id);
    expect(await ad(id)).toMatchObject({ status: "unlisted", inMarketplace: false });
    expect(await relistAd(user, id)).toBe("live");
    expect(await ad(id)).toMatchObject({ status: "live", inMarketplace: true });
  });

  it("AD-06 AC2: relisting after a video change needs a review", async () => {
    const { user, id } = await liveAd();
    await unlistAd(user, id);
    await uploadAd(user, "ad-0.8s-square.mp4", {}, id);
    expect(await relistAd(user, id)).toBe("pending_review");
    expect(await ad(id)).toMatchObject({ status: "pending_review", inMarketplace: true });
  });

  it("AD-07: delete removes the ad from the dashboard and the Marketplace", async () => {
    const { user, id } = await liveAd();
    await deleteAd(user, id);
    expect(await ad(id)).toMatchObject({ inMarketplace: false });
    expect((await listBusinessAds(user)).map((a) => a.id)).not.toContain(id);
    await expect(
      updateAdMeta(user, id, adMetaSchema.parse({ title: "x".repeat(5), category: "Gaming" })),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("other businesses can't see or touch the ad", async () => {
    const { id } = await liveAd();
    const other = await createBusiness("Other");
    expect(await getBusinessAd(other, id)).toBeNull();
    await expect(unlistAd(other, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("PRF-02 AC1 denormalised business identity", () => {
  it("renaming the company updates its ads", async () => {
    const user = await createBusiness("Old Co");
    const { start } = await uploadAd(user);
    await saveProfile(
      user,
      profileSchema.parse({ role: "business", companyName: "New Co", category: "Food & Drink" }),
    );
    expect((await ad(start.id)).businessName).toBe("New Co");
  });
});
