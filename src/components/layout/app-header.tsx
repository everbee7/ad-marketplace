import Link from "next/link";

import type { Role } from "@/config/enums";
import { ROLE_HOME } from "@/config/routes";

import { AccountMenu } from "./account-menu";
import { BoltMark } from "./logo";
import { RoleNav, type NavItem } from "./role-nav";

// App header (DESIGN §6): bolt logo left, page title centred, role-specific actions right.

export const NAV: Record<Role, NavItem[]> = {
  business: [
    { href: "/business", label: "Ad library", exact: true },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/business/profile", label: "Profile" },
  ],
  creator: [
    { href: "/creator", label: "Home", exact: true },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/creator/saved", label: "Saved" },
    { href: "/creator/videos", label: "Videos" },
    { href: "/creator/projects", label: "Projects" },
  ],
  admin: [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/review", label: "Review" },
    { href: "/admin/ads", label: "Ads" },
    { href: "/admin/videos", label: "Videos" },
    { href: "/admin/users", label: "Users" },
    { href: "/marketplace", label: "Marketplace" },
  ],
};

const TITLES: Record<Role, string> = {
  business: "Business portal",
  creator: "Creator portal",
  admin: "Admin",
};

export function AppHeader({
  role,
  email,
  displayName,
}: {
  role: Role;
  email: string;
  displayName?: string;
}) {
  return (
    <header className="relative z-10 border-b border-border/60">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 pt-6 pb-4 sm:px-10">
        <Link
          href={ROLE_HOME[role]}
          aria-label="Flashd home"
          className="flex size-11 items-center justify-center"
        >
          <BoltMark className="size-5" circled={false} />
        </Link>
        <p className="page-title truncate text-center text-sm tracking-[0.18em] sm:text-[22px] sm:tracking-[0.36em]">
          {TITLES[role]}
        </p>
        <AccountMenu email={email} displayName={displayName} role={role} />
      </div>
      <RoleNav items={NAV[role]} />
    </header>
  );
}
