import { describe, expect, it } from "vitest";

import { areaOf, safeNextPath } from "./routes";

describe("AUTH-03 AC2 / AUTH-05 role areas and next param", () => {
  it("maps paths to their owning role", () => {
    expect(areaOf("/business")).toBe("business");
    expect(areaOf("/business/ads/1")).toBe("business");
    expect(areaOf("/creator/projects")).toBe("creator");
    expect(areaOf("/admin/review")).toBe("admin");
    expect(areaOf("/businessman")).toBeNull();
    expect(areaOf("/marketplace")).toBeNull();
  });

  it("accepts a same-site path the role may visit", () => {
    expect(safeNextPath("/creator/projects?x=1", "creator")).toBe("/creator/projects?x=1");
    expect(safeNextPath("/marketplace/abc", "business")).toBe("/marketplace/abc");
  });

  it("rejects another role's area, external and protocol-relative URLs", () => {
    expect(safeNextPath("/admin", "creator")).toBeNull();
    expect(safeNextPath("https://evil.example", "creator")).toBeNull();
    expect(safeNextPath("//evil.example", "creator")).toBeNull();
    expect(safeNextPath("/\\evil.example", "creator")).toBeNull();
    expect(safeNextPath("/api/auth/sign-out", "creator")).toBeNull();
    expect(safeNextPath(null, "creator")).toBeNull();
  });
});
