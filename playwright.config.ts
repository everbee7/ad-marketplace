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
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "node scripts/e2e-server.mjs",
        url: `${baseURL}/api/health`,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
      },
});
