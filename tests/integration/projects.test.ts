import { beforeAll, describe, expect, it } from "vitest";

import { approveAd, deleteAd, unlistAd } from "@/features/ads/service";
import { BURST_MESSAGES } from "@/features/projects/bursts";
import { getProjectEditor, listProjects } from "@/features/projects/queries";
import {
  createProject,
  deleteProject,
  duplicateProject,
  renameProject,
  saveProject,
  updateBursts,
} from "@/features/projects/service";
import { videoMetaSchema } from "@/features/videos/schemas";
import { finalizeVideoUpload, startNewVideoUpload } from "@/features/videos/service";
import type { CurrentUser } from "@/lib/permissions";
import { putObject } from "@/lib/storage";
import { Ad } from "@/models/ad";

import { createBusiness, fileMeta, fixtureBytes, JPEG, uploadAd } from "../support/ads";
import { createTestUser } from "../support/users";

let admin: CurrentUser;
let business: CurrentUser;

async function liveAd(title = "Burst ad", fixture = "ad-1s-vertical.mp4") {
  const { start } = await uploadAd(business, fixture, { title });
  await approveAd(admin, start.id);
  return start.id;
}

async function readyVideo(user: CurrentUser, title = "My vlog") {
  const start = await startNewVideoUpload(
    user,
    videoMetaSchema.parse({ title }),
    fileMeta({ name: "v.mp4", durationSec: 10, width: 640, height: 360 }),
  );
  const v = await putObject(start.video.pathname, fixtureBytes("video-10s.mp4"), "video/mp4");
  const p = await putObject(start.poster.pathname, JPEG, "image/jpeg");
  await finalizeVideoUpload(user, start.id, { videoUrl: v.url, posterUrl: p.url });
  return start.id;
}

const projectCount = async (adId: string) => (await Ad.findById(adId).lean())?.projectCount;

beforeAll(async () => {
  admin = await createTestUser("admin");
  business = await createBusiness("Proj Co");
});

describe("PRJ-01 create project", () => {
  it("from a Ready video, named after it; from an ad, placed at 0.0 s", async () => {
    const creator = await createTestUser("creator", { onboarded: true });
    const videoId = await readyVideo(creator, "Trip to Rome");
    const adId = await liveAd();
    const plain = await getProjectEditor(creator, await createProject(creator, videoId));
    expect(plain).toMatchObject({ name: "Trip to Rome", status: "draft", revision: 0, bursts: [] });
    const fromAd = await getProjectEditor(creator, await createProject(creator, videoId, adId));
    expect(fromAd?.bursts).toMatchObject([{ atSec: 0, ad: { id: adId, available: true } }]);
    expect(await projectCount(adId)).toBe(1);
  });

  it("refuses someone else's video and non-live ads", async () => {
    const creator = await createTestUser("creator", { onboarded: true });
    const other = await createTestUser("creator", { onboarded: true });
    const videoId = await readyVideo(creator);
    await expect(createProject(other, videoId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const { start } = await uploadAd(business, "ad-1s-vertical.mp4", { title: "Pending" });
    await expect(createProject(creator, videoId, start.id)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });
});

describe("PRJ-03 / PRJ-04 bursts and saving", () => {
  it("enforces the rules server-side and keeps projectCount in sync", async () => {
    const creator = await createTestUser("creator", { onboarded: true });
    const id = await createProject(creator, await readyVideo(creator));
    const a = await liveAd("Ad A");
    const b = await liveAd("Ad B");

    await expect(
      updateBursts(creator, id, 0, [
        { id: "burst01", adId: a, atSec: 1 },
        { id: "burst02", adId: b, atSec: 1.5 },
      ]),
    ).rejects.toMatchObject({ code: "VALIDATION", message: BURST_MESSAGES.spacing });

    const saved = await updateBursts(creator, id, 0, [
      { id: "burst02", adId: b, atSec: 10 },
      { id: "burst01", adId: a, atSec: 0 },
      { id: "burst03", adId: a, atSec: 5 },
    ]);
    expect(saved).toMatchObject({ revision: 1, status: "draft" });
    const editor = await getProjectEditor(creator, id);
    expect(editor?.bursts.map((x) => [x.id, x.atSec])).toEqual([
      ["burst01", 0],
      ["burst03", 5],
      ["burst02", 10],
    ]);
    expect(await projectCount(a)).toBe(1); // one project, even with two bursts of A
    expect(await projectCount(b)).toBe(1);

    await updateBursts(creator, id, 1, [{ id: "burst01", adId: a, atSec: 0 }]);
    expect(await projectCount(b)).toBe(0);
  });

  it("AC: optimistic concurrency rejects a stale revision", async () => {
    const creator = await createTestUser("creator", { onboarded: true });
    const id = await createProject(creator, await readyVideo(creator));
    await updateBursts(creator, id, 0, []);
    await expect(updateBursts(creator, id, 0, [])).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("PRJ-04 AC2: Save marks the project saved; a later edit makes it a draft again", async () => {
    const creator = await createTestUser("creator", { onboarded: true });
    const id = await createProject(creator, await readyVideo(creator));
    const saved = await saveProject(creator, id, 0);
    expect(saved).toMatchObject({ status: "saved", revision: 1 });
    expect((await updateBursts(creator, id, 1, [])).status).toBe("draft");
  });
});

describe("PRJ-05 / PRJ-06 list, reopen, rename, duplicate, delete", () => {
  it("restores exactly and manages the list", async () => {
    const creator = await createTestUser("creator", { onboarded: true });
    const adId = await liveAd();
    const id = await createProject(creator, await readyVideo(creator, "Original"), adId);
    await updateBursts(creator, id, 0, [
      { id: "keep01", adId, atSec: 0 },
      { id: "keep02", adId, atSec: 7.3 },
    ]);
    const first = await getProjectEditor(creator, id);
    const reopened = await getProjectEditor(creator, id);
    expect(reopened).toEqual(first); // PRJ-06 AC1

    await renameProject(creator, id, "Renamed");
    const copyId = await duplicateProject(creator, id);
    expect(await projectCount(adId)).toBe(2);
    const list = await listProjects(creator);
    expect(list.map((p) => p.name)).toEqual(["Renamed (copy)", "Renamed"]);
    expect(list[1]).toMatchObject({ videoTitle: "Original", burstCount: 2, status: "draft" });

    await deleteProject(creator, copyId);
    expect(await projectCount(adId)).toBe(1);
    expect(await getProjectEditor(creator, copyId)).toBeNull();
    expect(
      await getProjectEditor(await createTestUser("creator", { onboarded: true }), id),
    ).toBeNull();
  });
});

describe("PRJ-07 unavailable ads (J4)", () => {
  it("unlisted or deleted ads stay placed but show as unavailable without a playable URL", async () => {
    const creator = await createTestUser("creator", { onboarded: true });
    const keep = await liveAd("Keep");
    const unlisted = await liveAd("Gone soon");
    const deleted = await liveAd("Deleted soon");
    const id = await createProject(creator, await readyVideo(creator));
    await updateBursts(creator, id, 0, [
      { id: "aaaaaa1", adId: keep, atSec: 0 },
      { id: "aaaaaa2", adId: unlisted, atSec: 3 },
      { id: "aaaaaa3", adId: deleted, atSec: 6 },
    ]);
    await unlistAd(business, unlisted);
    await deleteAd(business, deleted);
    const editor = await getProjectEditor(creator, id);
    expect(editor?.bursts.map((b) => [b.ad.available, !!b.ad.url])).toEqual([
      [true, true],
      [false, false],
      [false, false],
    ]);
    expect((await listProjects(creator))[0]?.unavailableCount).toBe(2);

    // Keeping an unavailable burst in place is allowed; placing it anew is not.
    const res = await updateBursts(creator, id, 1, [
      { id: "aaaaaa1", adId: keep, atSec: 0 },
      { id: "aaaaaa2", adId: unlisted, atSec: 4 },
    ]);
    expect(res.revision).toBe(2);
    const fresh = await createProject(creator, await readyVideo(creator));
    await expect(
      updateBursts(creator, fresh, 0, [{ id: "bbbbbb1", adId: unlisted, atSec: 0 }]),
    ).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });
});
