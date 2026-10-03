"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdCardDTO, MarketplacePage } from "@/features/marketplace/schemas";

/** PRJ-02: "Add burst" opens an ad picker with Saved and Marketplace search tabs. */
export function AdPicker({
  open,
  onOpenChange,
  saved,
  title,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saved: AdCardDTO[];
  title: string;
  onPick: (ad: AdCardDTO) => void;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);
  const search = useQuery({
    queryKey: ["picker", debounced],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(
        `/api/marketplace?${new URLSearchParams(debounced ? { q: debounced } : {})}`,
      );
      if (!res.ok) throw new Error("Search failed");
      return (await res.json()) as MarketplacePage;
    },
  });
  const usableSaved = saved.filter((a) => a.available !== false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pick a burst ad. It is placed at the playhead.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={usableSaved.length ? "saved" : "marketplace"}>
          <TabsList>
            <TabsTrigger value="saved">Saved · {usableSaved.length}</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          </TabsList>
          <TabsContent value="saved" className="mt-4">
            {usableSaved.length === 0 ? (
              <p className="eyebrow py-8 text-center">No saved ads yet</p>
            ) : (
              <PickGrid ads={usableSaved} onPick={onPick} />
            )}
          </TabsContent>
          <TabsContent value="marketplace" className="mt-4 flex flex-col gap-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Search the Marketplace"
                placeholder="SEARCH ADS"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
              />
            </div>
            {search.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner label="Searching" />
              </div>
            ) : search.isError ? (
              <p className="text-[13px] text-destructive">Search failed. Try again.</p>
            ) : search.data?.items.length ? (
              <PickGrid ads={search.data.items} onPick={onPick} />
            ) : (
              <p className="eyebrow py-8 text-center">No ads match your search</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PickGrid({ ads, onPick }: { ads: AdCardDTO[]; onPick: (ad: AdCardDTO) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ads.map((ad) => (
        <li key={ad.id}>
          <button
            type="button"
            onClick={() => onPick(ad)}
            className="group flex w-full flex-col overflow-hidden rounded-lg border border-border bg-surface text-left transition-colors hover:border-primary focus-visible:border-primary"
          >
            <span className="relative aspect-video bg-black">
              {ad.posterUrl && (
                <Image
                  src={ad.posterUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-contain"
                  sizes="200px"
                />
              )}
              <span className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-1.5 text-[10px]">
                {ad.durationSec.toFixed(1)} s
              </span>
            </span>
            <span className="truncate px-2.5 py-2 text-[12px] font-bold">{ad.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
