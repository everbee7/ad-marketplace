import { describe, expect, it } from "vitest";

import { approveAd } from "@/features/ads/service";
import { getCreatorVideo, listCreatorVideos } from "@/features/videos/queries";
import { videoMetaSchema } from "@/features/videos/schemas";
import {
  cancelVideoUpload,
  deleteVideo,
  finalizeVideoUpload,
  renameVideo,
  setVideoHidden,
  startNewVideoUpload,
  startVideoRetry,
} from "@/features/videos/service";
import { authorizeUpload } from "@/features/uploads/service";
import { MEDIA_MESSAGES } from "@/lib/media";
import type { CurrentUser } from "@/lib/permissions";
import { headObject, putObject } from "@/lib/storage";
import { Ad } from "@/models/ad";
import { CreatorVideo } from "@/models/creator-video";
import { Project } from "@/models/project";

import { createBusiness, fileMeta, fixtureBytes, JPEG, uploadAd } from "../support/ads";
import { createTestUser } from "../support/users";

const creator = () => createTestUser("creator", { onboarded: true });
const meta = (title = "My vlog") => videoMetaSchema.parse({ title });

async function uploadVideo(
  user: CurrentUser,
  fixture = "video-10s.mp4",
  type = "video/mp4",
  videoId?: string,
) {
  const file = fileMeta({
    name: fixture,
    type,
    durationSec: 10,
    width: 640,
    height: 360,
    codec: type === "video/webm" ? "vp09" : "avc1",
  });
  const start = videoId
    ? await startVideoRetry(user, videoId, file)
    : await startNewVideoUpload(user, meta(), file);
  const video = await putObject(start.video.pathname, fixtureBytes(fixture), type);
  const poster = await putObject(start.poster.pathname, JPEG, "image/jpeg");
  const res = await finalizeVideoUpload(user, start.id, {
    videoUrl: video.url,
    posterUrl: poster.url,
  });
  return { start, res, videoUrl: video.url };
}

describe("VID-01 upload video", () => {
  it("AC2: MP4 and WebM go Uploading → Ready", async () => {
    const user = await creator();
    const mp4 = await uploadVideo(user);
    expect(mp4.res.status).toBe("ready");
    const webm = await uploadVideo(user, "video-6s.webm", "video/webm");
    expect(webm.res.status).toBe("ready");
    const doc = await CreatorVideo.findById(mp4.start.id).lean();
    expect(doc?.video).toMatchObject({ aspectRatio: "horizontal", durationSec: 10, width: 640 });
  });

  it("AC1: pre-checks reject HEVC, long and oversized videos with clear messages", async () => {
    const user = await creator();
    await expect(
      startNewVideoUpload(user, meta(), fileMeta({ codec: "hvc1", durationSec: 5 })),
    ).rejects.toMatchObject({
      message: MEDIA_MESSAGES.hevc,
    });
    await expect(
      startNewVideoUpload(user, meta(), fileMeta({ durationSec: 16 * 60 })),
    ).rejects.toMatchObject({
      message: MEDIA_MESSAGES.videoDuration,
    });
    await expect(
      startNewVideoUpload(user, meta(), fileMeta({ durationSec: 5, size: 3 * 1024 * 1024 * 1024 })),
    ).rejects.toMatchObject({ message: MEDIA_MESSAGES.videoSize });
  });

  it("AC2: a failed upload can be retried on the same video", async () => {
    const user = await creator();
    const start = await startNewVideoUpload(user, meta("Retry me"), fileMeta({ durationSec: 10 }));
    await cancelVideoUpload(user, start.id);
    expect(await CreatorVideo.findById(start.id).lean()).toMatchObject({
      status: "failed",
      errorMessage: "Upload cancelled.",
    });
    const retry = await uploadVideo(user, "video-10s.mp4", "video/mp4", start.id);
    expect(retry.res.status).toBe("ready");
    expect(await CreatorVideo.findById(start.id).lean()).toMatchObject({
      title: "Retry me",
      status: "ready",
      errorMessage: null,
    });
  });

  it("AC3: videos are private to the owner and admins; uploads only to reserved paths", async () => {
    const owner = await creator();
    const other = await creator();
    const admin = await createTestUser("admin");
    const business = await createBusiness();
    const { start } = await uploadVideo(owner);
    expect(await getCreatorVideo(owner, start.id)).toMatchObject({
      url: expect.stringContaining("/api/dev-files/videos/"),
    });
    expect(await getCreatorVideo(other, start.id)).toBeNull();
    expect(await getCreatorVideo(business, start.id)).toBeNull();
    expect(await getCreatorVideo(admin, start.id)).not.toBeNull();

    const pending = await startNewVideoUpload(owner, meta(), fileMeta({ durationSec: 10 }));
    await expect(
      authorizeUpload(owner, pending.video.pathname, pending.video.uploadKey),
    ).resolves.toMatchObject({
      maximumSizeInBytes: 2 * 1024 * 1024 * 1024,
    });
    await expect(
      authorizeUpload(other, pending.video.pathname, pending.video.uploadKey),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ADM-03 AC1: a hidden video can't be played by its owner, only by admins", async () => {
    const owner = await creator();
    const admin = await createTestUser("admin");
    const { start } = await uploadVideo(owner);
    await setVideoHidden(admin, start.id, true);
    expect(await getCreatorVideo(owner, start.id)).toMatchObject({ hidden: true, url: null });
    expect((await getCreatorVideo(admin, start.id))?.url).toBeTruthy();
  });
});

describe("VID-02 my videos", () => {
  it("lists newest first with project counts, renames", async () => {
    const user = await creator();
    const a = await uploadVideo(user);
    const b = await uploadVideo(user);
    await renameVideo(user, a.start.id, "Renamed");
    const list = await listCreatorVideos(user);
    expect(list.map((v) => v.id)).toEqual([b.start.id, a.start.id]);
    expect(list[1]).toMatchObject({ title: "Renamed", projectCount: 0, status: "ready" });
  });

  it("AC1: delete removes the video, its projects and the ads' project counts", async () => {
    const user = await creator();
    const admin = await createTestUser("admin");
    const business = await createBusiness();
    const ad = await uploadAd(business);
    await approveAd(admin, ad.start.id);
    const { start, videoUrl } = await uploadVideo(user);
    await Project.create([
      {
        creatorId: user.id,
        name: "P1",
        creatorVideoId: start.id,
        bursts: [{ id: "b1", adId: ad.start.id, atSec: 0 }],
      },
      { creatorId: user.id, name: "P2", creatorVideoId: start.id, bursts: [] },
    ]);
    await Ad.updateOne({ _id: ad.start.id }, { $set: { projectCount: 1 } });
    expect((await getCreatorVideo(user, start.id))?.projectCount).toBe(2);

    expect(await deleteVideo(user, start.id)).toEqual({ deletedProjects: 2 });
    expect(await getCreatorVideo(user, start.id)).toBeNull();
    expect(await Project.countDocuments({ creatorVideoId: start.id, deletedAt: null })).toBe(0);
    expect((await Ad.findById(ad.start.id).lean())?.projectCount).toBe(0);
    expect(await headObject(videoUrl)).toBeNull();
  });
});
