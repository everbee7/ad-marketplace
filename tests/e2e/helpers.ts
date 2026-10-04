import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@e2e.flashd.local", password: "adminpass1" };
export const PASSWORD = "secret123";

export const uniqueEmail = (tag: string) => `${tag}-${randomUUID().slice(0, 8)}@e2e.flashd.local`;

const OUTBOX = path.join(process.cwd(), ".data", "mail", "outbox.jsonl");

/** Polls the console-email outbox for the latest link sent to `to`. */
export async function mailLink(to: string, subject: RegExp): Promise<string> {
  for (let i = 0; i < 40; i++) {
    try {
      const lines = (await readFile(OUTBOX, "utf8")).trim().split("\n");
      const mail = lines
        .map((l) => JSON.parse(l) as { to: string; subject: string; text: string })
        .filter((m) => m.to === to && subject.test(m.subject))
        .at(-1);
      const link = mail?.text.match(/https?:\/\/\S+/)?.[0];
      if (link) return link;
    } catch {
      // outbox not written yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to}`);
}

export async function signUpAndVerify(
  page: Page,
  role: "business" | "creator",
  email = uniqueEmail(role),
) {
  await page.goto(`/signup?role=${role}`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(await mailLink(email, /Verify/));
  await expect(page).toHaveURL(/\/onboarding/);
  return email;
}

export async function completeBusinessOnboarding(page: Page, companyName = "Acme Snacks") {
  await page.getByLabel("Company name").fill(companyName);
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Food & Drink" }).click();
  await page.getByRole("button", { name: "Enter the portal" }).click();
  await expect(page).toHaveURL(/\/business$/);
}

export async function completeCreatorOnboarding(page: Page, displayName = "Jo Creates") {
  await page.getByLabel("Display name").fill(displayName);
  await page.getByRole("combobox", { name: "Niche" }).click();
  await page.getByRole("option", { name: "Gaming" }).click();
  await page.getByRole("button", { name: "Enter the portal" }).click();
  await expect(page).toHaveURL(/\/creator$/);
}

export async function logIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function logOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/$/);
}
