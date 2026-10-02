import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ROLES, type Role } from "@/config/enums";
import { ROLE_HOME, routes } from "@/config/routes";
import { auth } from "@/lib/auth";
import { DomainError } from "@/lib/errors";

// The real authorization boundary (ARCHITECTURE §5, AUTH-05 AC3). proxy.ts is only optimistic.

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  onboardingCompleted: boolean;
};

function toCurrentUser(u: Record<string, unknown>): CurrentUser | null {
  const role = u.role;
  if (typeof u.id !== "string" || !ROLES.includes(role as Role)) return null;
  return {
    id: u.id,
    email: String(u.email ?? ""),
    name: String(u.name ?? ""),
    role: role as Role,
    emailVerified: u.emailVerified === true,
    onboardingCompleted: u.onboardingCompleted === true,
  };
}

/** Validates the session against the database. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return toCurrentUser(session.user as unknown as Record<string, unknown>);
});

type Requirement = { role?: Role | Role[]; onboarded?: boolean };

function allowed(user: CurrentUser, role?: Role | Role[]) {
  if (!role) return true;
  return (Array.isArray(role) ? role : [role]).includes(user.role);
}

/** For Server Actions and Route Handlers: throws a typed error instead of redirecting. */
export async function requireUser(req: Requirement = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new DomainError("UNAUTHENTICATED", "Please sign in to continue.");
  if (!allowed(user, req.role)) {
    throw new DomainError("FORBIDDEN", "You don't have access to this.");
  }
  if (req.onboarded !== false && user.role !== "admin" && !user.onboardingCompleted) {
    throw new DomainError("FORBIDDEN", "Please complete your profile first.");
  }
  return user;
}

/** For pages and layouts: redirects (AUTH-05 AC1–AC2, PRF-01 AC1). */
export async function requirePageUser(
  req: Requirement & { path?: string } = {},
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = req.path ? `?next=${encodeURIComponent(req.path)}` : "";
    redirect(`${routes.login}${next}`);
  }
  if (!allowed(user, req.role)) redirect(ROLE_HOME[user.role]);
  if (req.onboarded !== false && user.role !== "admin" && !user.onboardingCompleted) {
    redirect(routes.onboarding);
  }
  return user;
}

/** Owner check for loaded docs; admins pass (API.md conventions). */
export function assertOwner(ownerId: unknown, user: CurrentUser, { allowAdmin = true } = {}) {
  if (allowAdmin && user.role === "admin") return;
  if (String(ownerId) !== user.id) throw new DomainError("NOT_FOUND", "Not found.");
}
