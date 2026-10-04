import type { Role } from "./enums";

export const routes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  checkEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  onboarding: "/onboarding",
  marketplace: "/marketplace",
  business: "/business",
  creator: "/creator",
  admin: "/admin",
} as const;

export const ROLE_HOME: Record<Role, string> = {
  business: routes.business,
  creator: routes.creator,
  admin: routes.admin,
};

/** Areas only one role may enter (AUTH-05). The marketplace is shared by every signed-in role. */
export const ROLE_AREAS: Record<Role, string> = {
  business: "/business",
  creator: "/creator",
  admin: "/admin",
};

export const PROTECTED_PREFIXES = [
  "/business",
  "/creator",
  "/admin",
  "/onboarding",
  "/marketplace",
];

function inArea(path: string, prefix: string) {
  return path === prefix || path.startsWith(prefix + "/");
}

/** Role area that owns a path, or null for shared/public paths. */
export function areaOf(path: string): Role | null {
  for (const [role, prefix] of Object.entries(ROLE_AREAS) as [Role, string][]) {
    if (inArea(path, prefix)) return role;
  }
  return null;
}

/**
 * AUTH-03 AC2: a `next` param is used only when it is a same-site path the role may visit.
 * Rejects absolute URLs and protocol-relative paths (open-redirect guard).
 */
export function safeNextPath(next: string | null | undefined, role: Role): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return null;
  const path = next.split(/[?#]/)[0] ?? "";
  const owner = areaOf(path);
  if (owner && owner !== role) return null;
  if (path.startsWith("/api")) return null;
  return next;
}
