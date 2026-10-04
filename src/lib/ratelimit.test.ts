import { describe, expect, it } from "vitest";

import { limits } from "@/config/limits";

import { enforce, hit, peek, reset } from "./ratelimit";

describe("PRD §10 rate limits (lib/ratelimit)", () => {
  it("counts hits in a fixed window and blocks after the limit", async () => {
    const now = Date.UTC(2026, 0, 1, 10, 0, 0);
    const { max } = limits.rate.loginFailures;
    for (let i = 1; i <= max; i++) {
      const r = await hit("loginFailures", "a@example.com", now);
      expect(r.ok).toBe(true);
      expect(r.count).toBe(i);
    }
    expect((await hit("loginFailures", "a@example.com", now)).ok).toBe(false);
    expect((await peek("loginFailures", "a@example.com", now)).ok).toBe(false);
  });

  it("starts a new window after windowSec", async () => {
    const now = Date.UTC(2026, 0, 1, 11, 0, 0);
    for (let i = 0; i < 6; i++) await hit("loginFailures", "b@example.com", now);
    const later = now + limits.rate.loginFailures.windowSec * 1000;
    expect((await hit("loginFailures", "b@example.com", later)).count).toBe(1);
  });

  it("reset clears the window and enforce throws RATE_LIMITED", async () => {
    const key = "c@example.com";
    for (let i = 0; i < limits.rate.save.max; i++) await hit("save", key);
    await expect(enforce("save", key)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await reset("save", key);
    await expect(enforce("save", key)).resolves.toBeUndefined();
  });
});
