import { z } from "zod";

import { CATEGORIES } from "@/config/categories";
import { ASPECT_RATIOS, DURATION_BANDS, MARKETPLACE_SORTS } from "@/config/enums";

// MKT-01/02: search, filters and sort, all URL-serialisable (MKT-02 AC1).

const many = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(item).catch([]));

export const marketplaceQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((v) => v || undefined),
  category: many(z.enum(CATEGORIES)).transform((a) => [...new Set(a)]),
  duration: z
    .enum(
      Object.keys(DURATION_BANDS) as [
        keyof typeof DURATION_BANDS,
        ...(keyof typeof DURATION_BANDS)[],
      ],
    )
    .optional()
    .catch(undefined),
  aspect: z.enum(ASPECT_RATIOS).optional().catch(undefined),
  sort: z.enum(MARKETPLACE_SORTS).default("newest").catch("newest"),
  cursor: z.string().max(200).optional().catch(undefined),
});
export type MarketplaceQuery = z.output<typeof marketplaceQuerySchema>;

/** Reads a query from URLSearchParams or Next's searchParams object. */
export function parseMarketplaceQuery(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): MarketplaceQuery {
  const obj: Record<string, string | string[]> = {};
  if (input instanceof URLSearchParams) {
    for (const key of new Set(input.keys())) {
      const all = input.getAll(key);
      obj[key] = all.length > 1 ? all : (all[0] ?? "");
    }
  } else {
    for (const [k, v] of Object.entries(input)) if (v !== undefined) obj[k] = v;
  }
  return marketplaceQuerySchema.parse(obj);
}

/** Serialises filters back to a query string (without the cursor). */
export function marketplaceSearchParams(q: Partial<MarketplaceQuery>): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  for (const c of q.category ?? []) p.append("category", c);
  if (q.duration) p.set("duration", q.duration);
  if (q.aspect) p.set("aspect", q.aspect);
  if (q.sort && q.sort !== "newest") p.set("sort", q.sort);
  return p;
}

export function hasFilters(q: MarketplaceQuery) {
  return !!(q.q || q.category.length || q.duration || q.aspect);
}

export const adIdOnlySchema = z.object({
  adId: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id."),
});
export type AdIdOnlyInput = z.input<typeof adIdOnlySchema>;

/** API.md AdCardDTO. */
export type AdCardDTO = {
  id: string;
  title: string;
  businessName: string;
  businessLogoUrl: string | null;
  category: string;
  durationSec: number;
  aspectRatio: "vertical" | "horizontal" | "square";
  posterUrl: string | null;
  videoUrl: string;
  saved?: boolean;
  available?: boolean;
};

export type MarketplacePage = { items: AdCardDTO[]; nextCursor: string | null };

export type MarketplaceAdDetailDTO = AdCardDTO & {
  description: string | null;
  tags: string[];
  width: number;
  height: number;
  available: boolean;
  isOwner: boolean;
  business: {
    id: string;
    name: string;
    logoUrl: string | null;
    website: string | null;
    description: string | null;
  };
};
