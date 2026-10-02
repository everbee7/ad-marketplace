"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type { AdCardDTO } from "../schemas";

import { SaveButton } from "./save-button";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * MKT-01 card: poster, title, business name + logo, duration, category. The muted clip loops on
 * hover/focus on desktop and while in view on touch screens; never with reduced motion (NFR a11y).
 */
export function AdCard({ ad, canSave, href }: { ad: AdCardDTO; canSave: boolean; href?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = card.current;
    if (!el || reduced || !window.matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(!!entry?.isIntersecting && entry.intersectionRatio > 0.6),
      {
        threshold: [0, 0.6, 1],
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (active && !reduced) void v.play().catch(() => undefined);
    else {
      v.pause();
      v.currentTime = 0;
    }
  }, [active, reduced]);

  const start = () => !reduced && setActive(true);
  const stop = () => setActive(false);
  const link = href ?? `/marketplace/${ad.id}`;

  return (
    <article
      ref={card}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-colors focus-within:border-primary hover:border-primary"
    >
      {/* One frame shape for every card keeps the grid even; clips are letterboxed inside. */}
      <div className="relative aspect-video bg-black">
        {ad.posterUrl ? (
          <Image
            src={ad.posterUrl}
            alt=""
            fill
            unoptimized
            className="object-contain"
            sizes="(min-width: 1024px) 25vw, 50vw"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-subtle-foreground">
            <ImageOff className="size-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
        )}
        {ad.videoUrl && (
          <video
            ref={video}
            src={active ? ad.videoUrl : undefined}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            className={cn(
              "absolute inset-0 h-full w-full object-contain transition-opacity",
              active ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        <span className="absolute top-2 right-2 rounded-full border border-white/30 bg-black/70 px-2 py-0.5 font-display text-[11px] font-medium">
          {ad.durationSec.toFixed(1)} s
        </span>
        <div
          className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-b from-transparent to-black/75"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[13px] font-bold">
              <Link href={link} className="after:absolute after:inset-0 focus-visible:outline-none">
                {ad.title}
              </Link>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-foreground-secondary">
              {ad.businessLogoUrl && (
                <span className="relative size-4 shrink-0 overflow-hidden rounded-full border border-white/20">
                  <Image
                    src={ad.businessLogoUrl}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="16px"
                  />
                </span>
              )}
              <span className="truncate">{ad.businessName}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate text-subtle-foreground">{ad.category}</span>
            </p>
          </div>
          {canSave && (
            <span className="relative z-10 shrink-0">
              <SaveButton adId={ad.id} initial={!!ad.saved} title={ad.title} />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
