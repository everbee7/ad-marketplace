import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { ADMIN, completeBusinessOnboarding, logIn, logOut, signUpAndVerify } from "./helpers";

// Phase 1A: AD-01..07 and ADM-02. PRD §13 paths 1, 2 and 5.

const media = (f: string) => path.join(process.cwd(), "tests", "fixtures", "media", f);

async function addAd(page: Page, title: string, fixture = "ad-1s-vertical.mp4") {
  await page.goto("/business/ads/new");
  await expect(page.getByRole("button", { name: "Upload ad" })).toBeEnabled();
  await page.locator('input[type="file"][accept*="video"]').setInputFiles(media(fixture));
  await page.getByLabel("Title").fill(title);
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Food & Drink" }).click();
  await page.getByLabel("Tags").fill("snacks, crunchy");
  await page.getByRole("button", { name: "Upload ad" }).click();
}

async function reviewHead(page: Page, title: string) {
  await page.goto("/admin/review");
  // The queue is oldest first; other tests may have queued ads, so approve/reject until ours is shown.
  for (let i = 0; i < 20; i++) {
    if (await page.getByRole("heading", { name: title }).isVisible()) return;
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Approved. The ad is live.")).toBeVisible();
    await page.reload();
  }
  throw new Error(`${title} never reached the head of the queue`);
}

test("PRD §13 paths 1 + 2: business uploads an ad, admin approves, it goes live", async ({
  page,
}) => {
  const email = await signUpAndVerify(page, "business");
  await completeBusinessOnboarding(page, "Crunch Co");
  await addAd(page, "Crunch time");

  // AD-01 AC3: verified and In review without a reload.
  await expect(page).toHaveURL(/\/business\/ads\/[a-f0-9]{24}$/);
  await expect(page.getByRole("heading", { name: "Crunch time" })).toBeVisible();
  await expect(page.getByText("In review").first()).toBeVisible();
  await page.goto("/business");
  await expect(page.getByRole("link", { name: "Crunch time" })).toBeVisible();
  await logOut(page);

  await logIn(page, ADMIN.email, ADMIN.password);
  await reviewHead(page, "Crunch time");
  await expect(page.getByText("Crunch Co")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved. The ad is live.")).toBeVisible();
  await logOut(page);

  await logIn(page, email);
  await page.goto("/business?status=live");
  await expect(page.getByRole("link", { name: "Crunch time" })).toBeVisible();
});

test("AD-01 AC1: HEVC and wrong durations are rejected in the browser", async ({ page }) => {
  await signUpAndVerify(page, "business");
  await completeBusinessOnboarding(page);
  await addAd(page, "Too long", "ad-3s-too-long.mp4");
  await expect(page.getByText("Burst ads must be 0.5–2 seconds long.")).toBeVisible();
  await page.locator('input[type="file"][accept*="video"]').setInputFiles(media("ad-1s-hevc.mp4"));
  await page.getByRole("button", { name: "Upload ad" }).click();
  await expect(
    page.getByText(
      "This video format isn't supported. Please export it as MP4 (H.264) and try again.",
    ),
  ).toBeVisible();
  await page.goto("/business");
  await expect(page.getByText("No ads yet")).toBeVisible();
});

test("PRD §13 path 5: reject with reason → business edits → resubmits → back in the queue", async ({
  page,
}) => {
  const email = await signUpAndVerify(page, "business");
  await completeBusinessOnboarding(page, "Reject Co");
  await addAd(page, "Blurry snack");
  await expect(page.getByText("In review").first()).toBeVisible();
  await logOut(page);

  await logIn(page, ADMIN.email, ADMIN.password);
  await reviewHead(page, "Blurry snack");
  await page.getByRole("button", { name: "Reject" }).click();
  await page.getByRole("radio", { name: "Poor quality" }).click();
  await page.getByLabel("Note (optional)").fill("Too blurry to read the logo");
  await page.getByRole("button", { name: "Reject ad" }).click();
  await expect(page.getByText("Rejected. The business can see the reason.")).toBeVisible();
  await logOut(page);

  await logIn(page, email);
  await page.goto("/business?status=rejected");
  await page.getByRole("link", { name: "Blurry snack" }).click();
  await expect(page.getByText("Poor quality: Too blurry to read the logo").first()).toBeVisible();
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit$/, { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
  await expect(page.getByLabel("Title")).toHaveValue("Blurry snack");
  await page.getByLabel("Title").fill("Sharp snack");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Sharp snack" })).toBeVisible();
  await page.getByRole("button", { name: "Resubmit" }).click();
  await expect(page.getByText("In review").first()).toBeVisible();
  await logOut(page);

  await logIn(page, ADMIN.email, ADMIN.password);
  await reviewHead(page, "Sharp snack");
});

test("AD-06 / AD-07: unlist, relist and delete with a confirm dialog", async ({ page }) => {
  const email = await signUpAndVerify(page, "business");
  await completeBusinessOnboarding(page, "Toggle Co");
  await addAd(page, "Toggle ad");
  await expect(page.getByText("In review").first()).toBeVisible();
  await logOut(page);
  await logIn(page, ADMIN.email, ADMIN.password);
  await reviewHead(page, "Toggle ad");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved. The ad is live.")).toBeVisible();
  await logOut(page);

  await logIn(page, email);
  await page.getByRole("link", { name: "Toggle ad" }).click();
  await page.getByRole("button", { name: "Unlist" }).click();
  await expect(page.getByText("Ad unlisted")).toBeVisible();
  await expect(page.getByText("Unlisted").first()).toBeVisible();
  await page.getByRole("button", { name: "Relist" }).click();
  await expect(page.getByText("Ad relisted")).toBeVisible();
  await expect(page.getByText("Live").first()).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No projects use this ad.")).toBeVisible();
  await page.getByRole("button", { name: "Delete ad" }).click();
  await expect(page).toHaveURL(/\/business$/);
  await expect(page.getByText("No ads yet")).toBeVisible();
});
