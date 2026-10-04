import { Clapperboard } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SaveButton } from "@/features/marketplace/components/save-button";
import { getMarketplaceAd } from "@/features/marketplace/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Ad" };

/** MKT-03: player, details, business card; Save + Use in project for creators. */
export default async function MarketplaceAdPage({ params }: PageProps<"/marketplace/[adId]">) {
  const { adId } = await params;
  const user = await requirePageUser({ path: `/marketplace/${adId}` });
  const ad = await getMarketplaceAd(user, adId);
  if (!ad) notFound();
  const isCreator = user.role === "creator";

  return (
    <section className="flex flex-col gap-8">
      <Link href="/marketplace" className="eyebrow hover:text-foreground">
        ← Marketplace
      </Link>
      {!ad.available && (
        <p
          role="status"
          className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-[13px]"
        >
          This ad isn&apos;t in the Marketplace right now. Only you
          {ad.isOwner ? "" : " and other admins"} can see this page.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-black">
          <video
            src={ad.videoUrl}
            poster={ad.posterUrl ?? undefined}
            className="h-full w-full object-contain"
            controls
            loop
            playsInline
            preload="metadata"
          />
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-xl leading-tight font-bold">{ad.title}</h1>
            <p className="mt-2 text-[13px] text-foreground-secondary">{ad.category}</p>
          </div>
          {isCreator && ad.available && (
            <div className="flex flex-wrap gap-3">
              <SaveButton adId={ad.id} initial={!!ad.saved} title={ad.title} variant="full" />
              <Button asChild variant="secondary">
                <Link href={`/creator/projects/new?adId=${ad.id}`}>
                  <Clapperboard className="size-4" aria-hidden="true" /> Use in project
                </Link>
              </Button>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="eyebrow">Duration</dt>
              <dd className="mt-1.5">{ad.durationSec.toFixed(1)} s</dd>
            </div>
            <div>
              <dt className="eyebrow">Aspect</dt>
              <dd className="mt-1.5 capitalize">
                {ad.aspectRatio} · {ad.width}×{ad.height}
              </dd>
            </div>
            {ad.tags.length > 0 && (
              <div className="col-span-2">
                <dt className="eyebrow">Tags</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {ad.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/marketplace?q=${encodeURIComponent(t)}`}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-secondary hover:border-white hover:text-foreground"
                    >
                      {t}
                    </Link>
                  ))}
                </dd>
              </div>
            )}
            {ad.description && (
              <div className="col-span-2">
                <dt className="eyebrow">Description</dt>
                <dd className="mt-1.5 text-foreground-secondary">{ad.description}</dd>
              </div>
            )}
          </dl>
          <div className="flex gap-4 rounded-xl border border-border bg-surface p-4">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-input">
              {ad.business.logoUrl && (
                <Image
                  src={ad.business.logoUrl}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="48px"
                />
              )}
            </span>
            <div className="min-w-0 text-[13px]">
              <p className="font-bold">{ad.business.name}</p>
              {ad.business.description && (
                <p className="mt-1 text-foreground-secondary">{ad.business.description}</p>
              )}
              {ad.business.website && (
                <a
                  href={ad.business.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-2 inline-block truncate text-primary underline-offset-4 hover:underline"
                >
                  {ad.business.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
