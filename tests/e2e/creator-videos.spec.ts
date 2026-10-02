import path from "node:path";

import { expect, test } from "@playwright/test";

import { completeCreatorOnboarding, signUpAndVerify } from "./helpers";

// Phase 1B / M4: VID-01, VID-02.

const media = (f: string) => path.join(process.cwd(), "tests", "fixtures", "media", f);

test("VID-01/02: upload, list, rename and delete a video", async ({ page }) => {
  await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);

  await page.goto("/creator/videos/new");
  await expect(page.getByRole("button", { name: "Upload video" })).toBeEnabled();
  await page.locator('input[type="file"][accept*="video"]').setInputFiles(media("video-10s.mp4"));
  await expect(page.getByLabel("Title")).toHaveValue("video-10s");
  await page.getByLabel("Title").fill("Morning vlog");
  await page.getByRole("button", { name: "Upload video" }).click();
  await expect(page).toHaveURL(/\/creator\/videos$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Morning vlog" })).toBeVisible();
  await expect(page.getByText("Ready")).toBeVisible();
  await expect(page.getByText("0:10")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create project" })).toBeVisible();

  await page.getByRole("button", { name: "Actions for Morning vlog" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Video title").fill("Evening vlog");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Evening vlog" })).toBeVisible();

  await page.getByRole("button", { name: "Actions for Evening vlog" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByText("No projects use this video.")).toBeVisible();
  await page.getByRole("button", { name: "Delete video" }).click();
  await expect(page.getByText("No videos yet")).toBeVisible();
});

test("VID-01 AC1: HEVC is refused in the browser, WebM is accepted", async ({ page }) => {
  await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);
  await page.goto("/creator/videos/new");
  await expect(page.getByRole("button", { name: "Upload video" })).toBeEnabled();
  await page.locator('input[type="file"][accept*="video"]').setInputFiles(media("ad-1s-hevc.mp4"));
  await page.getByRole("button", { name: "Upload video" }).click();
  await expect(
    page.getByText(
      "This video format isn't supported. Please export it as MP4 (H.264) and try again.",
    ),
  ).toBeVisible();

  await page.locator('input[type="file"][accept*="video"]').setInputFiles(media("video-6s.webm"));
  await page.getByLabel("Title").fill("Web clip");
  await page.getByRole("button", { name: "Upload video" }).click();
  await expect(page).toHaveURL(/\/creator\/videos$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Web clip" })).toBeVisible();
});

test("creator home shows the journey and empty states", async ({ page }) => {
  await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);
  await page.goto("/creator");
  await expect(page.getByText("Your studio")).toBeVisible();
  await expect(page.getByText("No videos yet")).toBeVisible();
});
