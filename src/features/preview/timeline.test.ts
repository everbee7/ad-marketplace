import { describe, expect, it } from "vitest";

import {
  burstSegments,
  burstStart,
  compositeDuration,
  formatTime,
  fromComposite,
  nextBurstIndex,
  sortBursts,
  toComposite,
  type TimelineBurst,
} from "./timeline";

// ARCHITECTURE §8.1: the most heavily tested code in the repo.

const VIDEO = 10;
const b = (id: string, atSec: number, durationSec = 1): TimelineBurst => ({
  id,
  atSec,
  durationSec,
});
const start = b("start", 0, 1.5);
const middle = b("middle", 5, 1);
const end = b("end", 10, 2);
const all = [start, middle, end];

describe("PRJ-03 AC3 / PRV-01 composite duration", () => {
  it("is the video plus every burst", () => {
    expect(compositeDuration(VIDEO, [])).toBe(10);
    expect(compositeDuration(VIDEO, all)).toBe(14.5);
  });
});

describe("toComposite", () => {
  it("adds the bursts strictly before the video time", () => {
    expect(toComposite(0, all)).toBe(0); // burst at 0 starts the composite
    expect(toComposite(0.5, all)).toBe(2);
    expect(toComposite(5, all)).toBe(6.5); // start of the middle burst
    expect(toComposite(5.1, all)).toBeCloseTo(7.6);
    expect(toComposite(10, all)).toBe(12.5); // start of the end burst
  });
});

describe("fromComposite", () => {
  it("maps into a burst at 0, the video, the middle burst and the end burst", () => {
    expect(fromComposite(0, VIDEO, all)).toEqual({ kind: "burst", burstIndex: 0, offset: 0 });
    expect(fromComposite(1, VIDEO, all)).toEqual({ kind: "burst", burstIndex: 0, offset: 1 });
    expect(fromComposite(1.5, VIDEO, all)).toEqual({ kind: "video", videoTime: 0 });
    expect(fromComposite(4, VIDEO, all)).toEqual({ kind: "video", videoTime: 2.5 });
    expect(fromComposite(6.5, VIDEO, all)).toEqual({ kind: "burst", burstIndex: 1, offset: 0 });
    const inMiddle = fromComposite(7, VIDEO, all);
    expect(inMiddle.kind).toBe("burst");
    expect(inMiddle.kind === "burst" && inMiddle.offset).toBeCloseTo(0.5);
    expect(fromComposite(7.5, VIDEO, all)).toEqual({ kind: "video", videoTime: 5 });
    expect(fromComposite(12.5, VIDEO, all)).toEqual({ kind: "burst", burstIndex: 2, offset: 0 });
    expect(fromComposite(14.4, VIDEO, all).kind).toBe("burst");
  });

  it("clamps before 0 and after the end", () => {
    expect(fromComposite(-3, VIDEO, [])).toEqual({ kind: "video", videoTime: 0 });
    expect(fromComposite(99, VIDEO, [middle])).toEqual({ kind: "video", videoTime: 10 });
  });

  it("round-trips video positions outside bursts", () => {
    for (const v of [0.1, 2, 4.9, 5.5, 9.9]) {
      const pos = fromComposite(toComposite(v, all), VIDEO, all);
      expect(pos.kind).toBe("video");
      expect(pos.kind === "video" && pos.videoTime).toBeCloseTo(v);
    }
  });

  it("handles adjacent bursts 1.0 s apart (minimum spacing)", () => {
    const adj = [b("a", 3, 2), b("b", 4, 2)];
    expect(fromComposite(3, VIDEO, adj)).toEqual({ kind: "burst", burstIndex: 0, offset: 0 });
    expect(fromComposite(5, VIDEO, adj)).toEqual({ kind: "video", videoTime: 3 });
    expect(fromComposite(6, VIDEO, adj)).toEqual({ kind: "burst", burstIndex: 1, offset: 0 });
    expect(fromComposite(8, VIDEO, adj)).toEqual({ kind: "video", videoTime: 4 });
  });

  it("with no bursts is the identity", () => {
    expect(fromComposite(3.3, VIDEO, [])).toEqual({ kind: "video", videoTime: 3.3 });
    expect(toComposite(3.3, [])).toBe(3.3);
  });
});

describe("segments, starts and next burst", () => {
  it("burst segments sit at their composite times", () => {
    expect(burstSegments(all)).toEqual([
      { id: "start", start: 0, end: 1.5 },
      { id: "middle", start: 6.5, end: 7.5 },
      { id: "end", start: 12.5, end: 14.5 },
    ]);
    expect(burstStart(1, all)).toBe(6.5);
    expect(() => burstStart(9, all)).toThrow(RangeError);
  });

  it("nextBurstIndex skips played bursts", () => {
    expect(nextBurstIndex(0, all, new Set())).toBe(0);
    expect(nextBurstIndex(0, all, new Set(["start"]))).toBe(1);
    expect(nextBurstIndex(5, all, new Set(["start"]))).toBe(1);
    expect(nextBurstIndex(5.01, all, new Set(["start"]))).toBe(2);
    expect(nextBurstIndex(10, all, new Set(["start", "middle", "end"]))).toBe(-1);
  });

  it("sorts and formats", () => {
    expect(sortBursts([end, start, middle]).map((x) => x.id)).toEqual(["start", "middle", "end"]);
    expect(formatTime(0)).toBe("0:00.0");
    expect(formatTime(65.25)).toBe("1:05.3");
  });
});
