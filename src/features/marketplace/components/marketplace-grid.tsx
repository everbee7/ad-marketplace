"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { marketplaceSearchParams, type MarketplacePage, type MarketplaceQuery } from "../schemas";

import { AdCard } from "./ad-card";

async function fetchPage(query: MarketplaceQuery, cursor: string | null): Promise<MarketplacePage> {
  const params = marketplaceSearchParams(query);
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/marketplace?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load more ads.");
  return (await res.json()) as MarketplacePage;
}

/** MKT-01 AC2: infinite scroll (24 per page) with a keyboard-friendly "Load more" fallback. */
export function MarketplaceGrid({
  query,
  firstPage,
  canSave,
  emptyAction,
}: {
  query: MarketplaceQuery;
  firstPage: MarketplacePage;
  canSave: boolean;
  emptyAction?: React.ReactNode;
}) {
  const key = marketplaceSearchParams(query).toString();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } = useInfiniteQuery({
    queryKey: ["marketplace", key],
    queryFn: ({ pageParam }) => fetchPage(query, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    initialData: { pages: [firstPage], pageParams: [null] },
  });
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data.pages.flatMap((p) => p.items);
  if (items.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center gap-6 text-center">
        <p className="eyebrow">No ads match your filters</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      <ul
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4"
        aria-label="Ads"
      >
        {items.map((ad) => (
          <li key={ad.id}>
            <AdCard ad={ad} canSave={canSave} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="mt-8 flex justify-center" aria-live="polite">
        {isFetchingNextPage ? (
          <Spinner label="Loading more ads" />
        ) : isError ? (
          <Button variant="outline" size="sm" onClick={() => void fetchNextPage()}>
            Retry
          </Button>
        ) : hasNextPage ? (
          <Button variant="outline" size="sm" onClick={() => void fetchNextPage()}>
            Load more
          </Button>
        ) : (
          <p className="eyebrow">You&apos;ve reached the end</p>
        )}
      </div>
    </>
  );
}
