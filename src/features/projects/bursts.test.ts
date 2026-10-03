import { describe, expect, it } from "vitest";

import {
  BURST_MESSAGES,
  burstsProblem,
  clampTimestamp,
  nearestFreeSlot,
  parseTimestamp,
  placementFor,
  type PlacedBurst,
} from "./bursts";

const p = (id: string, atSec: number): PlacedBurst => ({ id, adId: "a", atSec });

describe("PRJ-03 placement rules (PRD §10)", () => {
  it("clamps to [0, end] and snaps to 0.1 s", () => {
    expect(clampTimestamp(-2, 10)).toBe(0);
    expect(clampTimestamp(3.14159, 10)).toBe(3.1);
    expect(clampTimestamp(3.15, 10)).toBe(3.2);
    expect(clampTimestamp(42, 10)).toBe(10);
    expect(clampTimestamp(42, 9.87)).toBe(9.8);
  });

  it("parses m:ss.s timestamps", () => {
    expect(parseTimestamp("1:05.5")).toBe(65.5);
    expect(parseTimestamp("0:00.0")).toBe(0);
    expect(parseTimestamp("12.3")).toBe(12.3);
    expect(parseTimestamp("75")).toBe(75);
    expect(parseTimestamp("1:75")).toBeNull();
    expect(parseTimestamp("abc")).toBeNull();
  });

  it("AC1: rejects positions closer than 1.0 s with a reason", () => {
    const bursts = [p("x", 2)];
    expect(placementFor(bursts, 2.5, 10)).toEqual({ ok: false, message: BURST_MESSAGES.spacing });
    expect(placementFor(bursts, 3, 10)).toEqual({ ok: true, atSec: 3 });
    expect(placementFor(bursts, 2.5, 10, "x")).toEqual({ ok: true, atSec: 2.5 }); // moving itself
  });

  it("allows bursts at 0.0 (before) and at the end (after)", () => {
    expect(burstsProblem([p("a", 0), p("b", 10)], 10)).toBeNull();
  });

  it("at most 10 bursts", () => {
    const ten = Array.from({ length: 10 }, (_, i) => p(String(i), i * 1.5));
    expect(burstsProblem(ten, 20)).toBeNull();
    expect(placementFor(ten, 19, 20)).toEqual({ ok: false, message: BURST_MESSAGES.max });
    expect(burstsProblem([...ten, p("x", 19.9)], 20)).toBe(BURST_MESSAGES.max);
  });

  it("server-side validation catches unsorted spacing, precision and range problems", () => {
    expect(burstsProblem([p("a", 5), p("b", 4.5)], 10)).toBe(BURST_MESSAGES.spacing);
    expect(burstsProblem([p("a", 1.25)], 10)).toMatch(/0\.1 s/);
    expect(burstsProblem([p("a", 11)], 10)).toMatch(/between/);
    expect(burstsProblem([p("a", 1), p("a", 3)], 10)).toMatch(/Duplicate/);
  });

  it("finds the nearest free slot for Add burst at the playhead", () => {
    expect(nearestFreeSlot([p("a", 5)], 5.2, 10)).toBe(6); // 0.8 away beats 4.0 (1.2 away)
    expect(nearestFreeSlot([p("a", 5)], 4.6, 10)).toBe(4);
    expect(nearestFreeSlot([], 3.33, 10)).toBe(3.3);
    expect(nearestFreeSlot([p("a", 0), p("b", 1)], 0.4, 1)).toBeNull();
  });
});
