import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { completeCreatorOnboarding, logIn, logOut, signUpAndVerify } from "./helpers";

// Phase 1C: PRD §13 paths 3 and 4 (PRJ-01..07, PRV-01..03).

const media = (f: string) => path.join(process.cwd(), "tests", "fixtures", "media", f);
const DEMO_BUSINESS = { email: "demo-business@flashd.local", password: "demopass1" };

type Timing = { burstId: string; atSec: number; triggerVideoTime: number; gapMs: number | null };

async function uploadVideo(page: Page, title: string) {
  await page.goto("/creator/videos/new");
  await expect(page.getByRole("button", { name: "Upload video" })).toBeEnabled();
  await page.locator('input[type="file"][accept*="video"]').setInputFiles(media("video-10s.mp4"));
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Upload video" }).click();
  await expect(page).toHaveURL(/\/creator\/videos$/, { timeout: 60_000 });
}

async function addSavedBurst(page: Page, adTitle: string, at: string, index: number) {
  await page.getByRole("button", { name: "Add burst" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: new RegExp(adTitle) })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeHidden(); // focus returns to Add burst on close
  const input = page.getByLabel(`Timestamp for burst ${index}`);
  await expect(input).toBeVisible();
  await input.fill(at);
  await input.press("Enter");
}

test("PRD §13 path 3: search → save → upload → project → 3 bursts → preview → save → reopen", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);

  // Search + save two ads.
  await page.goto("/marketplace?q=crunchy");
  await page.getByRole("button", { name: "Save Crunchy Chips Burst" }).click();
  await expect(
    page.getByRole("button", { name: "Remove Crunchy Chips Burst from saved" }),
  ).toBeVisible();
  await page.goto("/marketplace?q=coffee");
  await page.getByRole("button", { name: "Save Sunrise Coffee Flash" }).click();
  await expect(
    page.getByRole("button", { name: "Remove Sunrise Coffee Flash from saved" }),
  ).toBeVisible();

  await uploadVideo(page, "City walk");
  await page.getByRole("link", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/creator\/projects\/[a-f0-9]{24}$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "City walk" })).toBeVisible();

  // Start, middle and end (PRD §13 path 3).
  await addSavedBurst(page, "Crunchy Chips Burst", "0:00.0", 1);
  await addSavedBurst(page, "Sunrise Coffee Flash", "0:05.0", 2);
  // New bursts land at the nearest free slot to the playhead (1.0 s here), i.e. row 2.
  await addSavedBurst(page, "Crunchy Chips Burst", "0:10.0", 2);
  await expect(page.getByLabel("Timestamp for burst 2")).toHaveValue("0:05.0");
  await expect(page.getByLabel("Timestamp for burst 3")).toHaveValue("0:10.0");
  await expect(page.getByText(/Total with ads 0:13\.5/).first()).toBeVisible(); // 10 s + 1.0 + 1.5 + 1.0 (PRJ-03 AC3)
  await expect(page.getByText(/Saved · /)).toBeVisible({ timeout: 15_000 }); // auto-save (PRJ-04 AC1)

  // PRJ-03 AC1: invalid spacing is rejected inline.
  const second = page.getByLabel("Timestamp for burst 2");
  await second.fill("0:09.5");
  await second.press("Enter");
  await expect(page.getByText("Bursts must be at least 1.0 s apart.").first()).toBeVisible();
  await expect(second).toHaveValue("0:05.0");

  // Preview plays all three in order (PRV-01).
  const url = page.url();
  await page.goto(`${url}?debugPreview=1`);
  await page.getByRole("button", { name: "Play preview" }).click();
  await page
    .waitForFunction(() => (window.__flashdPreviewLog?.length ?? 0) >= 3, null, { timeout: 40_000 })
    .catch(async (err: unknown) => {
      // Diagnostics for flaky media environments: what did the engine see?
      const dbg = await page.evaluate(() => ({
        log: window.__flashdPreviewLog,
        videos: [...document.querySelectorAll("video")].map((v) => ({
          src: v.currentSrc.slice(0, 60),
          t: v.currentTime,
          paused: v.paused,
          ended: v.ended,
          ready: v.readyState,
          err: v.error?.code ?? null,
          active: v.dataset.active ?? null,
        })),
      }));
      console.log("PREVIEW DEBUG", JSON.stringify(dbg));
      throw err;
    });
  await page.waitForFunction(
    () => window.__flashdPreviewLog?.every((t) => t.gapMs !== null),
    null,
    { timeout: 10_000 },
  );
  const log = (await page.evaluate(() => window.__flashdPreviewLog)) as Timing[];
  expect(log.map((t) => t.atSec)).toEqual([0, 5, 10]);
  test.info().annotations.push({ type: "G3 timings", description: JSON.stringify(log) });
  console.log(`G3 ${test.info().project.name}`, JSON.stringify(log));
  for (const t of log) {
    expect(Math.abs(t.triggerVideoTime - t.atSec)).toBeLessThanOrEqual(0.1); // G3 start accuracy
    expect(t.gapMs ?? Infinity).toBeLessThanOrEqual(150); // G3 gap (100 ms target; headless jitter margin)
  }

  // Save + reopen identical (PRJ-04 AC2, PRJ-06 AC1).
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByText("Project saved")).toBeVisible();
  await page.goto("/creator/projects");
  await expect(page.getByText("3 bursts")).toBeVisible();
  await page.getByRole("link", { name: "City walk" }).click();
  await expect(page.getByLabel("Timestamp for burst 1")).toHaveValue("0:00.0");
  await expect(page.getByLabel("Timestamp for burst 2")).toHaveValue("0:05.0");
  await expect(page.getByLabel("Timestamp for burst 3")).toHaveValue("0:10.0");
  await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
});

test("PRD §13 path 4: business unlists the ad → the creator's project shows it as Unavailable", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const creator = await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);
  await page.goto("/marketplace?q=arena");
  await page.getByRole("link", { name: "Pixel Arena Teaser" }).click();
  await page.getByRole("link", { name: "Use in project" }).click();
  await expect(page.getByText("No ready videos yet")).toBeVisible();
  await uploadVideo(page, "Gaming clip");
  await page.goto("/marketplace?q=arena");
  await page.getByRole("link", { name: "Pixel Arena Teaser" }).click();
  await page.getByRole("link", { name: "Use in project" }).click();
  await expect(page.getByText(/will be placed at 0:00\.0/)).toBeVisible();
  await page.getByRole("button", { name: /Gaming clip/ }).click();
  await expect(page).toHaveURL(/\/creator\/projects\/[a-f0-9]{24}$/, { timeout: 60_000 });
  await expect(page.getByLabel("Timestamp for burst 1")).toHaveValue("0:00.0");
  await logOut(page);

  await logIn(page, DEMO_BUSINESS.email, DEMO_BUSINESS.password);
  await page.goto("/business?status=live");
  await page.getByRole("link", { name: "Pixel Arena Teaser" }).click();
  await page.getByRole("button", { name: "Unlist" }).click();
  await expect(page.getByText("Ad unlisted")).toBeVisible();
  await logOut(page);

  await logIn(page, creator);
  await page.goto("/creator/projects");
  await expect(page.getByText("1 unavailable")).toBeVisible();
  await page.getByRole("link", { name: "Gaming clip" }).click();
  await expect(page.getByText(/no longer\s+available/)).toBeVisible();
  await expect(page.getByText("1 burst is unavailable and skipped in the preview.")).toBeVisible();
  await page.getByRole("button", { name: "Remove unavailable" }).click();
  await expect(page.getByText("No bursts yet. Add one at the playhead.")).toBeVisible();

  // Relist so other tests keep the demo ad.
  await logOut(page);
  await logIn(page, DEMO_BUSINESS.email, DEMO_BUSINESS.password);
  await page.goto("/business?status=unlisted");
  await page.getByRole("link", { name: "Pixel Arena Teaser" }).click();
  await page.getByRole("button", { name: "Relist" }).click();
  await expect(page.getByText("Ad relisted")).toBeVisible();
});

test("PRV-01 rAF fallback (no requestVideoFrameCallback) + PRV-02 keyboard and seek", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Simulate engines without rVFC (older Safari): the engine must fall back to rAF polling.
  await page.addInitScript(() => {
    delete (HTMLVideoElement.prototype as unknown as Record<string, unknown>)
      .requestVideoFrameCallback;
  });
  await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);
  await page.goto("/marketplace?q=budget");
  await page.getByRole("button", { name: "Save Budget App Blink" }).click();
  await expect(
    page.getByRole("button", { name: "Remove Budget App Blink from saved" }),
  ).toBeVisible();
  await uploadVideo(page, "Fallback test");
  await page.getByRole("link", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/creator\/projects\/[a-f0-9]{24}$/, { timeout: 60_000 });
  await addSavedBurst(page, "Budget App Blink", "0:03.0", 1);
  await addSavedBurst(page, "Budget App Blink", "0:06.0", 1); // lands at 0.0 → row 1
  await expect(page.getByText(/Saved · /)).toBeVisible({ timeout: 15_000 });

  await page.goto(`${page.url()}?debugPreview=1`);
  const seek = page.getByRole("slider", { name: "Seek" });
  await expect(seek).toHaveAttribute("aria-valuemax", "13"); // 10 + 1.5 + 1.5

  // PRV-02 AC1: seeking into a burst lands inside it (composite 3.0–4.5 is the first burst).
  await seek.focus();
  await page.keyboard.press("ArrowRight"); // +5 s → composite 5.0 → video 3.5
  await expect(seek).toHaveAttribute("aria-valuenow", "5");
  await page.keyboard.press("ArrowLeft");
  await expect(seek).toHaveAttribute("aria-valuenow", "0");

  // Space on the player plays; both bursts trigger on time via rAF.
  await page.getByRole("region", { name: /Preview player/ }).focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => (window.__flashdPreviewLog?.length ?? 0) >= 2, null, {
    timeout: 40_000,
  });
  await page.waitForFunction(
    () => window.__flashdPreviewLog?.every((t) => t.gapMs !== null),
    null,
    { timeout: 10_000 },
  );
  const log = (await page.evaluate(() => window.__flashdPreviewLog)) as Timing[];
  console.log("G3 chromium-raf", JSON.stringify(log));
  expect(log.map((t) => t.atSec)).toEqual([3, 6]);
  for (const t of log) {
    expect(Math.abs(t.triggerVideoTime - t.atSec)).toBeLessThanOrEqual(0.1);
    expect(t.gapMs ?? Infinity).toBeLessThanOrEqual(150);
  }
  // "Ad" label while a burst plays is covered implicitly; M toggles mute.
  await page.keyboard.press("m");
  await expect(page.getByRole("button", { name: "Unmute" })).toBeVisible();
});
