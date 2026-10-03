import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/cron/cleanup/route";
import { adMetaSchema } from "@/features/ads/schemas";
import { approveAd, deleteAd, startNewAdUpload, startReplaceUpload } from "@/features/ads/service";
import { runCleanup } from "@/features/maintenance/cleanup";
import { videoMetaSchema } from "@/features/videos/schemas";
import { startNewVideoUpload } from "@/features/videos/service";
import { headObject } from "@/lib/storage";
import { Ad } from "@/models/ad";
import { CreatorVideo } from "@/models/creator-video";

import { createBusiness, fileMeta, uploadAd } from "../support/ads";
import { createTestUser } from "../support/users";

const DAY = 24 * 60 * 60 * 1000;

describe("NFR reliability: daily cleanup", () => {
  it("fails uploads stuck for more than 24 h and drops abandoned replacements", async () => {
    const business = await createBusiness();
    const admin = await createTestUser("admin");
    const creator = await createTestUser("creator", { onboarded: true });
    const stuckAd = await startNewAdUpload(
      business,
      adMetaSchema.parse({ title: "Stuck ad", category: "Gaming" }),
      fileMeta(),
    );
    const live = await uploadAd(business);
    await approveAd(admin, live.start.id);
    await startReplaceUpload(business, live.start.id, fileMeta());
    const stuckVideo = await startNewVideoUpload(
      creator,
      videoMetaSchema.parse({ title: "Stuck video" }),
      fileMeta({ durationSec: 5 }),
    );

    const stats = await runCleanup(new Date(Date.now() + 25 * 60 * 60 * 1000));
    expect(stats.staleAdUploads).toBeGreaterThanOrEqual(2);
    expect(stats.staleVideoUploads).toBeGreaterThanOrEqual(1);
    expect(await Ad.findById(stuckAd.id).lean()).toMatchObject({
      status: "failed",
      pendingUpload: null,
    });
    expect(await Ad.findById(live.start.id).lean()).toMatchObject({
      status: "live",
      inMarketplace: true,
      pendingUpload: null,
    });
    expect(await CreatorVideo.findById(stuckVideo.id).lean()).toMatchObject({
      status: "failed",
      pendingUpload: null,
    });
  });

  it("purges media of deleted ads after the 7-day grace period, once", async () => {
    const business = await createBusiness();
    const { start, videoUrl } = await uploadAd(business);
    await deleteAd(business, start.id);
    await runCleanup(new Date(Date.now() + 2 * DAY));
    expect(await headObject(videoUrl)).not.toBeNull(); // still in grace
    await runCleanup(new Date(Date.now() + 8 * DAY));
    expect(await headObject(videoUrl)).toBeNull();
    expect((await Ad.findById(start.id).lean())?.mediaPurgedAt).toBeInstanceOf(Date);
  });

  it("the cron route requires the Bearer secret", async () => {
    const denied = await GET(new Request("http://localhost/api/cron/cleanup"));
    expect(denied.status).toBe(401);
    const wrong = await GET(
      new Request("http://localhost/api/cron/cleanup", {
        headers: { authorization: "Bearer nope" },
      }),
    );
    expect(wrong.status).toBe(401);
    const ok = await GET(
      new Request("http://localhost/api/cron/cleanup", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ stats: expect.any(Object) });
  });
});
