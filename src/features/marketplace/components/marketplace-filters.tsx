"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/config/categories";
import { ASPECT_RATIOS, DURATION_BANDS, type MarketplaceSort } from "@/config/enums";

import { hasFilters, marketplaceSearchParams, type MarketplaceQuery } from "../schemas";

const SORT_LABEL: Record<MarketplaceSort, string> = {
  newest: "Newest",
  most_saved: "Most saved",
  most_used: "Most used",
};
const ANY = "any";

/** MKT-02: every filter lives in the URL (AC1), so links are shareable and Back works. */
export function MarketplaceFilters({ query }: { query: MarketplaceQuery }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [text, setText] = useState(query.q ?? "");

  const push = (next: Partial<MarketplaceQuery>) => {
    const params = marketplaceSearchParams({ ...query, ...next, cursor: undefined });
    const qs = params.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Debounced keyword search.
  useEffect(() => {
    if ((query.q ?? "") === text.trim()) return;
    const t = window.setTimeout(() => push({ q: text.trim() || undefined }), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [text]);

  const toggleCategory = (c: (typeof CATEGORIES)[number], on: boolean) =>
    push({ category: on ? [...query.category, c] : query.category.filter((x) => x !== c) });

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label="Search ads"
          placeholder="SEARCH ADS"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="pl-10 placeholder:uppercase"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Category filter, ${query.category.length} selected`}
            >
              Category{query.category.length ? ` · ${query.category.length}` : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <fieldset className="flex flex-col gap-2">
              <legend className="eyebrow mb-2">Categories</legend>
              {CATEGORIES.map((c) => (
                <label key={c} className="flex items-center gap-3 text-[13px]">
                  <Checkbox
                    checked={query.category.includes(c)}
                    onCheckedChange={(v) => toggleCategory(c, v === true)}
                  />
                  {c}
                </label>
              ))}
            </fieldset>
          </PopoverContent>
        </Popover>

        <Select
          value={query.duration ?? ANY}
          onValueChange={(v) =>
            push({ duration: v === ANY ? undefined : (v as MarketplaceQuery["duration"]) })
          }
        >
          <SelectTrigger aria-label="Duration" className="h-11 w-auto lg:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any duration</SelectItem>
            {Object.entries(DURATION_BANDS).map(([k, b]) => (
              <SelectItem key={k} value={k}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.aspect ?? ANY}
          onValueChange={(v) =>
            push({ aspect: v === ANY ? undefined : (v as MarketplaceQuery["aspect"]) })
          }
        >
          <SelectTrigger aria-label="Aspect ratio" className="h-11 w-auto lg:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any shape</SelectItem>
            {ASPECT_RATIOS.map((a) => (
              <SelectItem key={a} value={a} className="capitalize">
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={query.sort} onValueChange={(v) => push({ sort: v as MarketplaceSort })}>
          <SelectTrigger aria-label="Sort" className="h-11 w-auto lg:h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABEL) as MarketplaceSort[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SORT_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters(query) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setText("");
              start(() => router.push(pathname, { scroll: false }));
            }}
          >
            <X className="size-3.5" aria-hidden="true" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
