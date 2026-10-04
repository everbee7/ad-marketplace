import type { Metadata } from "next";
import Link from "next/link";

import { getMarketplaceAd } from "@/features/marketplace/queries";
import { NewProjectPicker } from "@/features/projects/components/new-project-picker";
import { listCreatorVideos } from "@/features/videos/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "New project" };
export const dynamic = "force-dynamic";

/** PRJ-01: entry points "Create project" (videoId), "Use in project" (adId) and "New project". */
export default async function NewProjectPage({ searchParams }: PageProps<"/creator/projects/new">) {
  const user = await requirePageUser({ role: "creator", path: "/creator/projects/new" });
  const { videoId, adId } = await searchParams;
  const ad = typeof adId === "string" ? await getMarketplaceAd(user, adId) : null;
  const usableAdId = ad?.available ? ad.id : undefined;

  const videos = await listCreatorVideos(user, { readyOnly: true });
  return (
    <section className="flex flex-col gap-6">
      <Link href="/creator/projects" className="eyebrow hover:text-foreground">
        ← Projects
      </Link>
      <div>
        <h1 className="panel-title">New project</h1>
        <p className="mt-3 text-[13px] text-foreground-secondary">
          Choose the video to place burst ads in.
        </p>
      </div>
      <NewProjectPicker
        videos={videos}
        adId={usableAdId}
        adTitle={usableAdId ? ad?.title : undefined}
        // "Create project" on a video skips the chooser (created client-side: GET renders must not mutate).
        autoVideoId={
          typeof videoId === "string" && videos.some((v) => v.id === videoId) ? videoId : undefined
        }
      />
    </section>
  );
}
