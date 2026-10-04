import { Bookmark, Clapperboard, Upload, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { listSavedAds } from "@/features/marketplace/queries";
import { VideoList } from "@/features/videos/components/video-list";
import { listCreatorVideos } from "@/features/videos/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Creator portal" };
export const dynamic = "force-dynamic";

/** Creator home (DESIGN §7: mirrors the business portal). Journey J2 at a glance. */
export default async function CreatorHomePage() {
  const user = await requirePageUser({ role: "creator", path: "/creator" });
  const [videos, saved] = await Promise.all([listCreatorVideos(user), listSavedAds(user)]);
  const steps = [
    { href: "/marketplace", label: "Find burst ads", caption: "Browse the Marketplace", icon: Zap },
    {
      href: "/creator/saved",
      label: `Saved ads · ${saved.length}`,
      caption: "Your shortlist",
      icon: Bookmark,
    },
    {
      href: "/creator/videos/new",
      label: "Upload a video",
      caption: "Private to you",
      icon: Upload,
    },
    {
      href: "/creator/projects",
      label: "Projects",
      caption: "Place bursts and preview",
      icon: Clapperboard,
    },
  ];
  return (
    <section className="flex flex-col gap-12">
      <div>
        <h1 className="panel-title">Your studio</h1>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ href, label, caption, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong shadow-glow-soft">
                  <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-display text-[13px] font-bold tracking-[0.1em] uppercase">
                    {label}
                  </span>
                  <span className="text-xs text-subtle-foreground">{caption}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="panel-title text-base">Recent videos</h2>
          {videos.length > 0 && (
            <Link href="/creator/videos" className="eyebrow hover:text-foreground">
              All videos →
            </Link>
          )}
        </div>
        {videos.length === 0 ? (
          <p className="eyebrow py-8 text-center">No videos yet</p>
        ) : (
          <VideoList videos={videos.slice(0, 3)} />
        )}
      </div>
    </section>
  );
}
