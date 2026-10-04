import { randomUUID } from "node:crypto";

import type { Role } from "@/config/enums";
import { auth } from "@/lib/auth";
import type { CurrentUser } from "@/lib/permissions";

/** Creates a verified user directly (tests only) and returns it as requireUser() would. */
export async function createTestUser(
  role: Role,
  opts: { onboarded?: boolean } = {},
): Promise<CurrentUser> {
  const ctx = await auth.$context;
  const email = `${role}-${randomUUID().slice(0, 8)}@example.com`;
  const onboardingCompleted = opts.onboarded ?? role === "admin";
  const user = await ctx.internalAdapter.createUser(
    { email, name: role, emailVerified: true, role, onboardingCompleted },
    { method: "admin" },
  );
  return { id: user.id, email, name: role, role, emailVerified: true, onboardingCompleted };
}

export async function isOnboarded(userId: string): Promise<boolean> {
  const ctx = await auth.$context;
  const u = await ctx.internalAdapter.findUserById(userId);
  return (u as unknown as { onboardingCompleted?: boolean } | null)?.onboardingCompleted === true;
}
