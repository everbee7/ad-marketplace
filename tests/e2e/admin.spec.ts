import path from "node:path";

import { expect, test } from "@playwright/test";

import { ADMIN, completeCreatorOnboarding, logIn, logOut, signUpAndVerify } from "./helpers";

// Phase 1D / M7: ADM-01, ADM-03, ADM-04 (ADM-02 is covered by business-ads.spec).

const media = (f: string) => path.join(process.cwd(), "tests", "fixtures", "media", f);

test("ADM-01/03/04: overview, ads search, hide a creator video, users", async ({ page }) => {
  test.setTimeout(240_000);
  const creator = await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page, "Hide Me Studio");
  await page.goto("/creator/videos/new");
  await expect(page.getByRole("button", { name: "Upload video" })).toBeEnabled();
  await page.locator('input[type="file"][accept*="video"]').setInputFiles(media("video-10s.mp4"));
  await page.getByLabel("Title").fill("Questionable clip");
  await page.getByRole("button", { name: "Upload video" }).click();
  await expect(page).toHaveURL(/\/creator\/videos$/, { timeout: 60_000 });
  await logOut(page);

  await logIn(page, ADMIN.email, ADMIN.password);
  await expect(page.getByText("Live ads")).toBeVisible();
  await expect(page.getByText("Creators")).toBeVisible();

  await page.goto("/admin/ads?q=crunchy&status=live");
  await expect(page.getByRole("link", { name: "Crunchy Chips Burst" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Crunchy Chips Burst" })).toBeVisible();

  await page.goto("/admin/videos?q=questionable");
  await expect(page.getByText(creator)).toBeVisible();
  await page.getByRole("button", { name: "Hide Questionable clip" }).click();
  await expect(page.getByText("Video hidden")).toBeVisible();
  await expect(page.getByText("Hidden", { exact: true })).toBeVisible();

  await page.goto(`/admin/users?q=${encodeURIComponent(creator)}`);
  await expect(page.getByText("Hide Me Studio")).toBeVisible();
  await expect(page.getByText("1 videos · 0 projects")).toBeVisible();
  await logOut(page);

  // ADM-03 AC1: the creator can no longer use the hidden video.
  await logIn(page, creator);
  await page.goto("/creator/videos");
  await expect(page.getByText("Hidden by admin")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create project" })).toBeHidden();
});
