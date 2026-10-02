import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { robots: { index: false } };

export default async function BusinessLayout({ children }: LayoutProps<"/business">) {
  const user = await requirePageUser({ role: "business" });
  return <AppShell user={user}>{children}</AppShell>;
}
