import { readFileSync } from "node:fs";
import path from "node:path";

import { adMetaSchema, type AdMetaInput, type FileMeta } from "@/features/ads/schemas";
import { finalizeAdUpload, startNewAdUpload, startReplaceUpload } from "@/features/ads/service";
import { saveProfile } from "@/features/profiles/service";
import { profileSchema } from "@/features/profiles/schemas";
import type { CurrentUser } from "@/lib/permissions";
import { putObject } from "@/lib/storage";

import { makeFixtures } from "../../scripts/make-fixtures";

import { createTestUser } from "./users";

makeFixtures();

export const fixtureBytes = (f: string) => readFileSync(path.join("tests", "fixtures", "media", f));

export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

export function fileMeta(over: Partial<FileMeta> = {}): FileMeta {
  return {
    name: "ad.mp4",
    size: 300_000,
    type: "video/mp4",
    durationSec: 1,
    width: 360,
    height: 640,
    codec: "avc1",
    ...over,
  };
}

export async function createBusiness(name = "Acme Snacks"): Promise<CurrentUser> {
  const user = await createTestUser("business");
  await saveProfile(
    user,
    profileSchema.parse({ role: "business", companyName: name, category: "Food & Drink" }),
  );
  return { ...user, onboardingCompleted: true };
}

/** Simulates the browser: reserve paths, upload the bytes to them, then finalize. */
export async function uploadAd(
  user: CurrentUser,
  fixture = "ad-1s-vertical.mp4",
  meta: Partial<AdMetaInput> = {},
  adId?: string,
) {
  const start = adId
    ? await startReplaceUpload(user, adId, fileMeta())
    : await startNewAdUpload(
        user,
        adMetaSchema.parse({ title: "Crunchy", category: "Food & Drink", ...meta }),
        fileMeta(),
      );
  const video = await putObject(start.video.pathname, fixtureBytes(fixture), "video/mp4");
  const poster = await putObject(start.poster.pathname, JPEG, "image/jpeg");
  const result = await finalizeAdUpload(user, start.id, {
    videoUrl: video.url,
    posterUrl: poster.url,
  });
  return { start, result, videoUrl: video.url, posterUrl: poster.url };
}
