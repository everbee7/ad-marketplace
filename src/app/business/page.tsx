import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AD_STATUSES, type AdStatus } from "@/config/enums";
import { BusinessAdCard } from "@/features/ads/components/business-ad-card";
import { AD_STATUS_INFO } from "@/features/ads/lifecycle";
import { countBusinessAdsByStatus, listBusinessAds } from "@/features/ads/queries";
import { statusFilterSchema } from "@/features/ads/schemas";
import { requirePageUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ad library" };

/** AD-03: my ads, newest first, filterable by status (AC1). */
export default async function BusinessDashboard({ searchParams }: PageProps<"/business">) {
  const user = await requirePageUser({ role: "business", path: "/business" });
  const status = statusFilterSchema.parse((await searchParams).status) as AdStatus | undefined;
  const [ads, counts] = await Promise.all([
    listBusinessAds(user, status),
    countBusinessAdsByStatus(user),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="panel-title">Ad library</h1>
        <Button asChild>
          <Link href="/business/ads/new">
            <Plus className="size-4" aria-hidden="true" /> Add ad
          </Link>
        </Button>
      </div>

      {total > 0 && (
        <nav aria-label="Filter by status" className="mt-8 flex flex-wrap gap-2">
          <FilterLink href="/business" active={!status} label="All" count={total} />
          {AD_STATUSES.filter((s) => counts[s]).map((s) => (
            <FilterLink
              key={s}
              href={`/business?status=${s}`}
              active={status === s}
              label={AD_STATUS_INFO[s].label}
              count={counts[s] ?? 0}
            />
          ))}
        </nav>
      )}

      {ads.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-6 text-center">
          <p className="eyebrow">{status ? "No ads with this status" : "No ads yet"}</p>
          {!status && (
            <Button asChild>
              <Link href="/business/ads/new">
                <Plus className="size-4" aria-hidden="true" /> Add ad
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <li key={ad.id}>
              <BusinessAdCard ad={ad} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border px-4 font-display text-[11px] font-medium tracking-[0.1em] uppercase lg:h-8",
        active
          ? "border-primary text-foreground shadow-glow-primary"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className="text-subtle-foreground">{count}</span>
    </Link>
  );
}
