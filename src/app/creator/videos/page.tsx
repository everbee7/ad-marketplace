import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { VideoList } from "@/features/videos/components/video-list";
import { listCreatorVideos } from "@/features/videos/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "My videos" };
export const dynamic = "force-dynamic";

/** VID-02. */
export default async function VideosPage() {
  const user = await requirePageUser({ role: "creator", path: "/creator/videos" });
  const videos = await listCreatorVideos(user);
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="panel-title">My videos</h1>
        <Button asChild>
          <Link href="/creator/videos/new">
            <Plus className="size-4" aria-hidden="true" /> Upload video
          </Link>
        </Button>
      </div>
      {videos.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-6 text-center">
          <p className="eyebrow">No videos yet</p>
          <p className="max-w-sm text-[13px] text-foreground-secondary">
            Upload a video to start placing burst ads in it. Your videos are private to you.
          </p>
        </div>
      ) : (
        <VideoList videos={videos} />
      )}
    </section>
  );
}
