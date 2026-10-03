import { expect, test } from "@playwright/test";

// @smoke: safe against any deployment (no seeded data, no email). Run by .github/workflows/e2e.yml
// against the Preview/Staging URL: `E2E_BASE_URL=… npx playwright test --grep @smoke`.

test("@smoke landing, health, auth pages and route protection", async ({ page, request }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page.getByText("Ad time. Back.")).toBeVisible();

  // ARCHITECTURE §9 security headers.
  const headers = res!.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();

  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ ok: true, db: "up" });

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Enter the portal" })).toBeVisible();
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();

  // AUTH-05 AC1.
  await page.goto("/creator/projects");
  await expect(page).toHaveURL(/\/login\?next=%2Fcreator%2Fprojects/);

  // Cron endpoint is not public.
  expect((await request.get("/api/cron/cleanup")).status()).toBe(401);
});
