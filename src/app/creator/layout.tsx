import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { robots: { index: false } };

export default async function CreatorLayout({ children }: LayoutProps<"/creator">) {
  const user = await requirePageUser({ role: "creator" });
  return <AppShell user={user}>{children}</AppShell>;
}
