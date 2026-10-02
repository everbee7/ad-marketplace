import { expect, test } from "@playwright/test";

import {
  ADMIN,
  completeBusinessOnboarding,
  completeCreatorOnboarding,
  logIn,
  logOut,
  signUpAndVerify,
} from "./helpers";

// M1 Accounts: AUTH-01..05, PRF-01..02 and PRD §13 path 6 (role guard).

test("AUTH-01/02, PRF-01: business signs up, verifies, onboards, logs out and back in", async ({
  page,
}) => {
  const email = await signUpAndVerify(page, "business");
  // PRF-01 AC1: the role area stays locked until onboarding is done.
  await page.goto("/business");
  await expect(page).toHaveURL(/\/onboarding/);
  await completeBusinessOnboarding(page);
  await expect(page.getByText("Business portal")).toBeVisible();

  await logOut(page);
  await page.goto("/business");
  await expect(page).toHaveURL(/\/login\?next=%2Fbusiness/);
  await logIn(page, email);
  await expect(page).toHaveURL(/\/business$/);
});

test("PRD §13 path 6: role guard between creator, business and admin areas", async ({ page }) => {
  await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);
  for (const path of ["/business", "/business/profile", "/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/creator$/);
  }
  await logOut(page);

  await logIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin$/);
  for (const path of ["/business", "/creator"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin$/);
  }
});

test("AUTH-03 AC2: the next param is honoured only for the user's own area", async ({ page }) => {
  const email = await signUpAndVerify(page, "creator");
  await completeCreatorOnboarding(page);
  await logOut(page);
  await page.goto("/creator/profile");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/creator\/profile$/);
});

test("AUTH-01 AC2 and AUTH-03 AC1: duplicate email and unverified login", async ({ page }) => {
  const email = await signUpAndVerify(page, "creator");
  await page.context().clearCookies();
  await page.goto("/signup");
  await page.getByRole("radio", { name: /Creator/ }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("secret123");
  await page.getByLabel("Confirm password").fill("secret123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists.")).toBeVisible();

  const fresh = `unverified-${Date.now()}@e2e.flashd.local`;
  await page.getByLabel("Email").fill(fresh);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await logIn(page, fresh);
  await expect(page.getByText("Please verify your email.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend email" })).toBeVisible();
});

test("PRF-02: edit profile", async ({ page }) => {
  await signUpAndVerify(page, "business");
  await completeBusinessOnboarding(page, "Old Name");
  await page.goto("/business/profile");
  await expect(page.getByLabel("Company name")).toHaveValue("Old Name");
  await page.getByLabel("Company name").fill("New Name Co");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Company name")).toHaveValue("New Name Co");
});
