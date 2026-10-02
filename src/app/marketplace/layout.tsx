import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/permissions";

// OQ-6 default: login required to browse (PRD §15). Shared by every role.
export const metadata: Metadata = { robots: { index: false } };

export default async function MarketplaceLayout({ children }: LayoutProps<"/marketplace">) {
  const user = await requirePageUser({ path: "/marketplace" });
  return <AppShell user={user}>{children}</AppShell>;
}
