import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  ADMIN,
  completeBusinessOnboarding,
  completeCreatorOnboarding,
  logIn,
  logOut,
  signUpAndVerify,
} from "./helpers";

// Visual pass for checkpoint demos: `SCREENSHOTS=1 npx playwright test screens`.
// Images land in test-results/screens (gitignored). Not part of the normal suite.

test.skip(!process.env.SCREENSHOTS, "screenshots only on demand");

const out = (name: string) => path.join("test-results", "screens", `${name}.png`);
const media = (f: string) => path.join(process.cwd(), "tests", "fixtures", "media", f);

test("Checkpoint A screens", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/signup?role=business");
  await page.screenshot({ path: out("signup"), fullPage: true });

  await signUpAndVerify(page, "business");
  await page.screenshot({ path: out("onboarding-business"), fullPage: true });
  await completeBusinessOnboarding(page, "Crunch Co");
  await page.screenshot({ path: out("business-empty"), fullPage: true });

  await page.goto("/business/ads/new");
  await expect(page.getByRole("button", { name: "Upload ad" })).toBeEnabled();
  await page
    .locator('input[type="file"][accept*="video"]')
    .setInputFiles(media("ad-1s-vertical.mp4"));
  await page.getByLabel("Title").fill("Crunch time");
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Food & Drink" }).click();
  await page.screenshot({ path: out("ad-new"), fullPage: true });
  await page.getByRole("button", { name: "Upload ad" }).click();
  await expect(page).toHaveURL(/\/business\/ads\/[a-f0-9]{24}$/, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out("ad-detail"), fullPage: true });
  await page.goto("/business");
  await page.screenshot({ path: out("business-dashboard"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: out("business-dashboard-mobile"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await logOut(page);

  await logIn(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/review");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out("admin-review"), fullPage: true });
});

test("Phase 1B screens", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);
  await page.goto("/marketplace");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: out("marketplace"), fullPage: true });
  await page.getByRole("link", { name: "Sunrise Coffee Flash" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out("marketplace-detail"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marketplace");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out("marketplace-mobile"), fullPage: true });
});

test("no console errors on key pages", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${page.url()}: ${m.text().slice(0, 200)}`);
  });
  await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);
  for (const p of ["/marketplace", "/creator/saved", "/creator/profile"]) {
    await page.goto(p);
    await page.waitForTimeout(1500);
  }
  expect(errors).toEqual([]);
});
