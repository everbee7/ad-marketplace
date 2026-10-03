import { ClipboardCheck, Film, Upload, Users, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getAdminOverview } from "@/features/admin/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

/** ADM-01: pending review, live ads, users by role, uploads in the last 24 h. */
export default async function AdminOverviewPage() {
  await requirePageUser({ role: "admin", path: "/admin" });
  const o = await getAdminOverview();
  const stats = [
    {
      label: "Waiting for review",
      value: o.pendingReview,
      href: "/admin/review",
      icon: ClipboardCheck,
      accent: o.pendingReview > 0,
    },
    { label: "Live ads", value: o.liveAds, href: "/admin/ads?status=live", icon: Zap },
    {
      label: "Businesses",
      value: o.usersByRole.business,
      href: "/admin/users?role=business",
      icon: Users,
    },
    {
      label: "Creators",
      value: o.usersByRole.creator,
      href: "/admin/users?role=creator",
      icon: Users,
    },
    { label: "Ad uploads · 24 h", value: o.uploadsLast24h.ads, href: "/admin/ads", icon: Upload },
    {
      label: "Video uploads · 24 h",
      value: o.uploadsLast24h.videos,
      href: "/admin/videos",
      icon: Film,
    },
  ];
  return (
    <section className="flex flex-col gap-8">
      <h1 className="panel-title">Overview</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, href, icon: Icon, accent }) => (
          <li key={label}>
            <Link
              href={href}
              className={
                accent
                  ? "flex items-center gap-4 rounded-xl border border-primary bg-surface p-5 shadow-glow-primary"
                  : "flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary"
              }
            >
              <span className="flex size-11 items-center justify-center rounded-full border border-border-strong">
                <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span>
                <span className="block font-display text-2xl font-bold tabular-nums">{value}</span>
                <span className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                  {label}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
