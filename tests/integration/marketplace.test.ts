import { beforeAll, describe, expect, it } from "vitest";

import { approveAd, deleteAd, unlistAd } from "@/features/ads/service";
import { getMarketplaceAd, listSavedAds, searchMarketplace } from "@/features/marketplace/queries";
import { parseMarketplaceQuery } from "@/features/marketplace/schemas";
import { saveAd, unsaveAd } from "@/features/marketplace/service";
import type { CurrentUser } from "@/lib/permissions";
import { Ad } from "@/models/ad";

import { createBusiness, uploadAd } from "../support/ads";
import { createTestUser } from "../support/users";

let admin: CurrentUser;
let business: CurrentUser;
let creator: CurrentUser;

async function liveAd(
  title: string,
  fixture = "ad-1s-vertical.mp4",
  meta: Record<string, unknown> = {},
) {
  const { start } = await uploadAd(business, fixture, { title, ...meta });
  await approveAd(admin, start.id);
  return start.id;
}

const search = (params: Record<string, string | string[]>) =>
  searchMarketplace(creator, parseMarketplaceQuery(params));

beforeAll(async () => {
  admin = await createTestUser("admin");
  business = await createBusiness("Market Co");
  creator = await createTestUser("creator", { onboarded: true });
});

describe("MKT-01 browse", () => {
  it("AC1: only live (in-Marketplace) ads are listed", async () => {
    const live = await liveAd("Visible snack");
    const { start: pending } = await uploadAd(business, "ad-1s-vertical.mp4", {
      title: "Pending snack",
    });
    const ids = (await search({})).items.map((i) => i.id);
    expect(ids).toContain(live);
    expect(ids).not.toContain(pending.id);
    await unlistAd(business, live);
    expect((await search({})).items.map((i) => i.id)).not.toContain(live);
  });

  it("AC2: 24 per page, keyset cursor, no duplicates or gaps while new ads arrive", async () => {
    // Bulk-create live ads by cloning a real one (faster than 30 uploads).
    const base = await Ad.findById(await liveAd("Template")).lean();
    const now = Date.now();
    await Ad.insertMany(
      Array.from({ length: 30 }, (_, i) => ({
        ...base,
        _id: undefined,
        title: `Bulk ${i}`,
        createdAt: new Date(now - (i + 1) * 1000),
        updatedAt: new Date(),
      })),
    );
    const seen: string[] = [];
    let cursor: string | undefined;
    let first = true;
    do {
      const page = await search(cursor ? { cursor } : {});
      if (first) {
        expect(page.items).toHaveLength(24);
        // A new ad lands while the user scrolls: it must not shift the next page.
        await liveAd("Late arrival");
        first = false;
      }
      seen.push(...page.items.map((i) => i.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(new Set(seen).size).toBe(seen.length);
    const all = await Ad.countDocuments({ inMarketplace: true, deletedAt: null });
    expect(seen.length).toBe(all - 1); // everything except the late arrival (it sorts above page 1)
  });
});

describe("MKT-02 search, filter, sort", () => {
  it("keyword search covers title, tags and business name", async () => {
    const id = await liveAd("Zesty lemonade", "ad-1s-vertical.mp4", { tags: ["citrus"] });
    expect((await search({ q: "lemonade" })).items.map((i) => i.id)).toContain(id);
    expect((await search({ q: "citrus" })).items.map((i) => i.id)).toContain(id);
    expect((await search({ q: "Market" })).items.length).toBeGreaterThan(0);
    expect((await search({ q: "nonexistentword" })).items).toHaveLength(0);
  });

  it("filters by category, duration band and aspect", async () => {
    const wide = await liveAd("Wide shot", "ad-1.5s-horizontal.mp4", { category: "Gaming" });
    const square = await liveAd("Square shot", "ad-0.8s-square.mp4", { category: "Finance" });
    const ids = async (p: Record<string, string | string[]>) =>
      (await search(p)).items.map((i) => i.id);
    expect(await ids({ category: ["Gaming", "Finance"] })).toEqual(
      expect.arrayContaining([wide, square]),
    );
    expect(await ids({ category: "Gaming" })).not.toContain(square);
    expect(await ids({ aspect: "horizontal" })).toContain(wide);
    expect(await ids({ aspect: "horizontal" })).not.toContain(square);
    expect(await ids({ duration: "short" })).toContain(square);
    expect(await ids({ duration: "long" })).toContain(wide);
    expect(await ids({ duration: "medium" })).not.toContain(wide);
  });

  it("sorts by most saved", async () => {
    const popular = await liveAd("Popular");
    await saveAd(creator, popular);
    const top = (await search({ sort: "most_saved" })).items[0];
    expect(top?.id).toBe(popular);
  });

  it("AC1: query parsing tolerates bad input", () => {
    expect(
      parseMarketplaceQuery({ sort: "bogus", aspect: "round", category: ["Nope", "Gaming"] }),
    ).toMatchObject({
      sort: "newest",
      aspect: undefined,
      category: [],
    });
  });
});

describe("MKT-03 ad detail", () => {
  it("AC1: non-live ads are 404 except for owner and admins", async () => {
    const { start } = await uploadAd(business, "ad-1s-vertical.mp4", { title: "Not yet" });
    expect(await getMarketplaceAd(creator, start.id)).toBeNull();
    expect(await getMarketplaceAd(business, start.id)).toMatchObject({
      isOwner: true,
      available: false,
    });
    expect(await getMarketplaceAd(admin, start.id)).not.toBeNull();
    const live = await liveAd("Detail me");
    expect(await getMarketplaceAd(creator, live)).toMatchObject({
      title: "Detail me",
      saved: false,
      business: { name: "Market Co" },
    });
  });
});

describe("MKT-04 / MKT-05 save and saved page", () => {
  it("save is idempotent and keeps saveCount in sync", async () => {
    const id = await liveAd("Save me");
    await saveAd(creator, id);
    await saveAd(creator, id);
    expect((await Ad.findById(id).lean())?.saveCount).toBe(1);
    expect((await getMarketplaceAd(creator, id))?.saved).toBe(true);
    await unsaveAd(creator, id);
    await unsaveAd(creator, id);
    expect((await Ad.findById(id).lean())?.saveCount).toBe(0);
  });

  it("can't save an ad that isn't live", async () => {
    const { start } = await uploadAd(business, "ad-1s-vertical.mp4", { title: "Not live" });
    await expect(saveAd(creator, start.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("MKT-05 AC1/AC2: newest saved first; unavailable ads are flagged and removable", async () => {
    const me = await createTestUser("creator", { onboarded: true });
    const a = await liveAd("First saved");
    const b = await liveAd("Second saved");
    await saveAd(me, a);
    await saveAd(me, b);
    await deleteAd(business, a);
    const saved = await listSavedAds(me);
    expect(saved.map((s) => s.id)).toEqual([b, a]);
    expect(saved[0]).toMatchObject({ available: true, saved: true });
    expect(saved[1]).toMatchObject({ available: false, videoUrl: "" });
    await unsaveAd(me, a);
    expect((await listSavedAds(me)).map((s) => s.id)).toEqual([b]);
  });
});
