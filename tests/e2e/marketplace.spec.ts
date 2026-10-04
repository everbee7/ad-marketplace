import { expect, test } from "@playwright/test";

import { completeCreatorOnboarding, signUpAndVerify } from "./helpers";

// Phase 1B / M3: MKT-01..05 against the demo ads seeded in global-setup (scripts/seed-demo.ts).

test.beforeEach(async ({ page }) => {
  await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);
});

test("MKT-01/02: browse, search and filter with state in the URL", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByRole("link", { name: "Crunchy Chips Burst" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pixel Arena Teaser" })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search ads" }).fill("coffee");
  await expect(page).toHaveURL(/q=coffee/);
  await expect(page.getByRole("link", { name: "Sunrise Coffee Flash" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Crunchy Chips Burst" })).toBeHidden();

  // AC1: shareable URL, back button restores the previous filter.
  await page.goto("/marketplace?category=Gaming&aspect=square");
  await expect(page.getByRole("link", { name: "Pixel Arena Teaser" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sunrise Coffee Flash" })).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/q=coffee/);

  // AC2: empty state with Clear filters.
  await page.goto("/marketplace?q=zzzznothing");
  await expect(page.getByText("No ads match your filters")).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByRole("link", { name: "Crunchy Chips Burst" })).toBeVisible();
});

test("MKT-03/04/05: detail page, optimistic save, consistent saved state", async ({ page }) => {
  await page.goto("/marketplace");
  await page.getByRole("button", { name: "Save Crunchy Chips Burst" }).click();
  await expect(
    page.getByRole("button", { name: "Remove Crunchy Chips Burst from saved" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: "Crunchy Chips Burst" }).click();
  await expect(page.getByRole("heading", { name: "Crunchy Chips Burst" })).toBeVisible();
  await expect(page.getByText("Snacks for creators who move fast.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: "Use in project" })).toBeVisible();

  await page.goto("/creator/saved");
  await expect(page.getByRole("link", { name: "Crunchy Chips Burst" })).toBeVisible();
  // The card disappears optimistically; wait for the server action before reloading.
  const unsaved = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().includes("/creator/saved"),
  );
  await page.getByRole("button", { name: "Remove Crunchy Chips Burst from saved" }).click();
  await unsaved;
  await expect(page.getByRole("link", { name: "Crunchy Chips Burst" })).toBeHidden();
  await page.reload();
  await expect(page.getByText("No saved ads yet")).toBeVisible();
});

test("MKT-03 AC1: a non-live ad is 404 for creators", async ({ page }) => {
  const res = await page.goto("/marketplace/ffffffffffffffffffffffff");
  expect(res?.status()).toBe(404);
});
