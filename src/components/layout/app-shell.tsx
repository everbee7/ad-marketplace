import type { ReactNode } from "react";

import type { Role } from "@/config/enums";
import { getProfile } from "@/features/profiles/queries";
import type { CurrentUser } from "@/lib/permissions";

import { AppHeader } from "./app-header";
import { SiteFooter } from "./site-footer";

/** Shell for every signed-in area. The decorative ambient glow follows DESIGN §4 (aria-hidden). */
export async function AppShell({
  user,
  role,
  children,
}: {
  user: CurrentUser;
  role?: Role;
  children: ReactNode;
}) {
  const profile = user.role === "admin" ? null : await getProfile(user.id);
  const displayName =
    profile?.role === "business"
      ? profile.companyName
      : profile?.role === "creator"
        ? profile.displayName
        : undefined;
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,var(--primary-ambient),transparent_70%)]"
      />
      <AppHeader role={role ?? user.role} email={user.email} displayName={displayName} />
      <main id="main" className="relative mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
