import { defineConfig, devices } from "@playwright/test";

// E2E: one spec per PRD §13 path in tests/e2e. Locally Playwright starts the app with the local
// storage driver and console email; set E2E_BASE_URL to run against a deployed preview instead.

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  // `next dev` compiles routes on first hit; a rare first-load glitch gets one retry.
  retries: 1,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Safari-engine run of the preview timing (G3), without requestVideoFrameCallback (rAF fallback).
    // Playwright WebKit on Windows/Linux cannot decode H.264, so it only runs on macOS or on demand.
    ...(process.platform === "darwin" || process.env.E2E_WEBKIT
      ? [
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
            testMatch: /projects.spec.ts/,
            grep: /path 3/,
          },
        ]
      : []),
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "node scripts/e2e-server.mjs",
        url: `${baseURL}/api/health`,
        timeout: 600_000, // includes the production build
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
      },
});
