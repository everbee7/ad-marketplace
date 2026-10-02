import { describe, expect, it } from "vitest";

import {
  deleteObjects,
  headObject,
  localFilePath,
  ownsUrl,
  pathnameFromUrl,
  putObject,
  readObject,
  withRandomSuffix,
} from "./storage";

describe("lib/storage (local driver)", () => {
  it("rejects path traversal", () => {
    expect(() => localFilePath("../secret")).toThrow();
    expect(() => localFilePath("ads//x")).toThrow();
    expect(() => localFilePath("ads/a b")).toThrow();
    expect(localFilePath("ads/abc/video-x.mp4")).toContain("uploads");
  });

  it("adds an unguessable suffix", () => {
    const p = withRandomSuffix("ads/1/video", "mp4");
    expect(p).toMatch(/^ads\/1\/video-[\w-]{21}\.mp4$/);
  });

  it("writes, inspects, reads and deletes an object", async () => {
    const pathname = withRandomSuffix("test/obj", "bin");
    const stored = await putObject(pathname, Buffer.from("hello"), "application/octet-stream");
    expect(stored.url).toBe(`/api/dev-files/${pathname}`);
    expect(pathnameFromUrl(stored.url)).toBe(pathname);
    expect(ownsUrl(stored.url, "test/")).toBe(true);
    expect(ownsUrl(stored.url, "ads/")).toBe(false);
    expect(ownsUrl("https://evil.example/api/dev-files/test/x", "test/")).toBe(false);
    expect(ownsUrl(`http://localhost:3000${stored.url}`, "test/")).toBe(true);

    const meta = await headObject(stored.url);
    expect(meta).toMatchObject({ size: 5, contentType: "application/octet-stream" });
    expect((await readObject(stored.url, 10)).toString()).toBe("hello");
    await expect(readObject(stored.url, 2)).rejects.toThrow(/too large/);

    await deleteObjects([stored.url]);
    expect(await headObject(stored.url)).toBeNull();
  });
});
