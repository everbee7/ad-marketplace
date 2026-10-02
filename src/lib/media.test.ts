import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { makeFixtures } from "../../scripts/make-fixtures";

import { adFileProblem, adProbeProblem, bufferSource, MEDIA_MESSAGES, probeMp4 } from "./media";

const fixture = (f: string) => readFileSync(path.join("tests", "fixtures", "media", f));

beforeAll(() => {
  makeFixtures();
});

describe("AD-01 AC1/AC5 media checks (lib/media)", () => {
  it("reads codec, duration and dimensions from an H.264 ad", async () => {
    const p = await probeMp4(bufferSource(fixture("ad-1s-vertical.mp4")));
    expect(p).toMatchObject({ codec: "avc1", width: 360, height: 640 });
    expect(p.durationSec).toBeCloseTo(1, 1);
    expect(adProbeProblem(p)).toBeNull();
  });

  it("rejects HEVC with the PRD message", async () => {
    const p = await probeMp4(bufferSource(fixture("ad-1s-hevc.mp4")));
    expect(p.codec).toBe("hvc1");
    expect(adProbeProblem(p)).toBe(MEDIA_MESSAGES.hevc);
  });

  it("rejects durations outside 0.5–2.0 s (± 0.05)", async () => {
    expect(adProbeProblem(await probeMp4(bufferSource(fixture("ad-3s-too-long.mp4"))))).toBe(
      MEDIA_MESSAGES.adDuration,
    );
    expect(adProbeProblem(await probeMp4(bufferSource(fixture("ad-0.3s-too-short.mp4"))))).toBe(
      MEDIA_MESSAGES.adDuration,
    );
    expect(
      adProbeProblem({
        codec: "avc1",
        codecString: "avc1",
        durationSec: 2.04,
        width: 1,
        height: 1,
      }),
    ).toBeNull();
    expect(
      adProbeProblem({
        codec: "avc1",
        codecString: "avc1",
        durationSec: 2.06,
        width: 1,
        height: 1,
      }),
    ).toBe(MEDIA_MESSAGES.adDuration);
  });

  it("rejects non-MP4 data and wrong containers/sizes", async () => {
    await expect(probeMp4(bufferSource(fixture("video-6s.webm")))).rejects.toThrow();
    expect(adFileProblem({ type: "video/webm", size: 10 })).toBe(MEDIA_MESSAGES.adType);
    expect(adFileProblem({ type: "video/mp4", size: 51 * 1024 * 1024 })).toBe(
      MEDIA_MESSAGES.adSize,
    );
    expect(adFileProblem({ type: "", size: 10, name: "clip.MOV" })).toBeNull();
  });
});
