import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdActions } from "@/features/ads/components/ad-actions";
import { ReplaceVideo } from "@/features/ads/components/replace-video";
import { StatusChip } from "@/features/ads/components/status-chip";
import { AD_STATUS_INFO } from "@/features/ads/lifecycle";
import { getBusinessAd } from "@/features/ads/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Ad" };

const dateTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

/** AD-04: looping player, metadata, status history, rejection reason. */
export default async function BusinessAdPage({ params }: PageProps<"/business/ads/[adId]">) {
  const { adId } = await params;
  const user = await requirePageUser({ role: "business", path: `/business/ads/${adId}` });
  const ad = await getBusinessAd(user, adId);
  if (!ad) notFound();

  const playUrl = ad.videoUrl ?? ad.pendingVideoUrl;
  return (
    <section className="flex flex-col gap-8">
      <Link href="/business" className="eyebrow hover:text-foreground">
        ← Ad library
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <h1 className="panel-title leading-tight">{ad.title}</h1>
          <StatusChip status={ad.status} className="self-start" />
        </div>
        <AdActions ad={ad} />
      </div>

      {ad.status === "rejected" && ad.rejectionReason && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px]"
        >
          <p className="eyebrow text-destructive">Rejection reason</p>
          <p className="mt-2">{ad.rejectionReason}</p>
          <p className="mt-2 text-foreground-secondary">
            Edit the ad or replace the video, then resubmit it for review.
          </p>
        </div>
      )}
      {ad.status === "removed" && ad.removalReason && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px]"
        >
          <p className="eyebrow text-destructive">Removed by an admin</p>
          <p className="mt-2">{ad.removalReason}</p>
        </div>
      )}
      {ad.hasPendingVideo && ad.status === "pending_review" && (
        <p className="rounded-md border border-border bg-surface px-4 py-3 text-[13px] text-foreground-secondary">
          A new video is in review. Creators keep seeing the current version until it&apos;s
          approved.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-black">
          {playUrl ? (
            <video
              src={playUrl}
              poster={ad.posterUrl ?? undefined}
              className="h-full w-full object-contain"
              autoPlay
              loop
              muted
              playsInline
              controls
            />
          ) : (
            <p className="eyebrow">No video yet</p>
          )}
        </div>
        <dl className="flex flex-col gap-4 text-[13px]">
          <Meta label="Category" value={ad.category} />
          <Meta
            label="Duration"
            value={ad.durationSec != null ? `${ad.durationSec.toFixed(1)} s` : "—"}
          />
          <Meta label="Aspect" value={ad.aspectRatio ?? "—"} />
          <Meta label="Saves" value={String(ad.saveCount)} />
          <Meta label="Used in projects" value={String(ad.projectCount)} />
          <Meta label="Tags" value={ad.tags.length ? ad.tags.join(", ") : "—"} />
          {ad.description && <Meta label="Description" value={ad.description} />}
        </dl>
      </div>

      {(ad.status === "failed" || ad.status === "rejected") && (
        <section className="flex flex-col gap-4 rounded-xl border border-border p-6">
          <h2 className="panel-title text-base">Replace video</h2>
          {ad.status === "failed" && ad.errorMessage && (
            <p className="text-[13px] text-destructive">{ad.errorMessage}</p>
          )}
          <ReplaceVideo adId={ad.id} note="Your title, description and tags are kept." />
        </section>
      )}

      <section>
        <h2 className="eyebrow">Status history</h2>
        <ol className="mt-4 flex flex-col gap-3 border-l border-border pl-4">
          {[...ad.statusHistory].reverse().map((h, i) => (
            <li key={i} className="text-[13px]">
              <span className="font-bold">{AD_STATUS_INFO[h.status].label}</span>{" "}
              <span className="text-subtle-foreground">· {dateTime.format(new Date(h.at))}</span>
              {h.reason && <p className="text-foreground-secondary">{h.reason}</p>}
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="capitalize-first mt-1.5 break-words text-foreground-secondary">{value}</dd>
    </div>
  );
}
