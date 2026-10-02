import { describe, expect, it } from "vitest";

import { AD_STATUSES } from "@/config/enums";

import { AD_TRANSITIONS, canTransition, computeInMarketplace } from "./lifecycle";

describe("PRD §9.1 ad lifecycle", () => {
  it("matches the PRD transition table", () => {
    expect(AD_TRANSITIONS).toEqual({
      uploading: ["pending_review", "failed"],
      failed: ["uploading"],
      pending_review: ["live", "rejected"],
      live: ["unlisted", "removed", "pending_review"],
      unlisted: ["live"],
      rejected: ["pending_review"],
      removed: [],
    });
  });

  it("removed is terminal and nothing goes back to uploading except failed", () => {
    for (const s of AD_STATUSES) expect(canTransition("removed", s)).toBe(false);
    for (const s of AD_STATUSES) expect(canTransition(s, "uploading")).toBe(s === "failed");
  });
});

describe("ADR-0006 Marketplace visibility", () => {
  const base = { approvedAt: null, pendingVideo: null, video: {}, deletedAt: null };
  it("live ads are visible; other statuses are not", () => {
    for (const status of AD_STATUSES) {
      expect(computeInMarketplace({ ...base, status })).toBe(status === "live");
    }
  });
  it("AD-05 AC2: a previously approved ad stays visible while a replacement is reviewed", () => {
    expect(
      computeInMarketplace({
        ...base,
        status: "pending_review",
        approvedAt: new Date(),
        pendingVideo: {},
      }),
    ).toBe(true);
  });
  it("deleted ads are never visible", () => {
    expect(computeInMarketplace({ ...base, status: "live", deletedAt: new Date() })).toBe(false);
  });
});
