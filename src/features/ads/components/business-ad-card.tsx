import { Bookmark, Clapperboard, ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { BusinessAdDTO } from "../schemas";

import { StatusChip } from "./status-chip";

const date = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

/** AD-03 tile: thumbnail, title, status, category, saves, projects, created date. */
export function BusinessAdCard({ ad }: { ad: BusinessAdDTO }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-colors focus-within:border-primary hover:border-primary">
      <div className="relative aspect-video bg-black">
        {ad.posterUrl ? (
          <Image
            src={ad.posterUrl}
            alt=""
            fill
            unoptimized
            className="object-contain"
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-subtle-foreground">
            <ImageOff className="size-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}
        {ad.durationSec != null && (
          <span className="absolute top-2 right-2 rounded-full border border-white/30 bg-black/70 px-2 py-0.5 font-display text-[11px] font-medium">
            {ad.durationSec.toFixed(1)} s
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[13px] leading-snug font-bold">
            <Link
              href={`/business/ads/${ad.id}`}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              {ad.title}
            </Link>
          </h3>
          <span className="relative z-10">
            <StatusChip status={ad.status} />
          </span>
        </div>
        {ad.hasPendingVideo && ad.status === "pending_review" && (
          <p className="text-xs text-foreground-secondary">
            New video in review. The current one stays live.
          </p>
        )}
        {ad.status === "failed" && ad.errorMessage && (
          <p className="text-xs text-destructive">{ad.errorMessage}</p>
        )}
        <dl className="mt-auto grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
          <div>
            <dt className="sr-only">Category</dt>
            <dd className="truncate">{ad.category}</dd>
          </div>
          <div className="flex items-center gap-1" title="Saves">
            <dt>
              <Bookmark className="size-3" aria-label="Saves" />
            </dt>
            <dd>{ad.saveCount}</dd>
          </div>
          <div className="flex items-center gap-1" title="Projects using this ad">
            <dt>
              <Clapperboard className="size-3" aria-label="Projects" />
            </dt>
            <dd>{ad.projectCount}</dd>
          </div>
        </dl>
        <p className="text-[11px] text-subtle-foreground">
          Created {date.format(new Date(ad.createdAt))}
        </p>
      </div>
    </article>
  );
}
