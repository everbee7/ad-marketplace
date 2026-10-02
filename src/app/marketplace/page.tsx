import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { MarketplaceFilters } from "@/features/marketplace/components/marketplace-filters";
import { MarketplaceGrid } from "@/features/marketplace/components/marketplace-grid";
import { searchMarketplace } from "@/features/marketplace/queries";
import { marketplaceSearchParams, parseMarketplaceQuery } from "@/features/marketplace/schemas";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Marketplace" };

/** MKT-01 / MKT-02: RSC renders the first page; the grid continues through /api/marketplace. */
export default async function MarketplacePage({ searchParams }: PageProps<"/marketplace">) {
  const user = await requirePageUser({ path: "/marketplace" });
  const query = parseMarketplaceQuery(await searchParams);
  const firstPage = await searchMarketplace(user, { ...query, cursor: undefined });
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="panel-title">Marketplace</h1>
        <p className="mt-3 text-[13px] text-foreground-secondary">
          Burst ads from businesses, ready to drop into your videos.
        </p>
      </div>
      <MarketplaceFilters
        key={`filters:${marketplaceSearchParams(query).toString()}`}
        query={query}
      />
      <MarketplaceGrid
        key={`grid:${marketplaceSearchParams(query).toString()}`}
        query={query}
        firstPage={firstPage}
        canSave={user.role === "creator"}
        emptyAction={
          <Button asChild variant="outline" size="sm">
            <Link href="/marketplace">Clear filters</Link>
          </Button>
        }
      />
    </section>
  );
}
