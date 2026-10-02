import type { Metadata } from "next";
import Link from "next/link";

import { VideoUploadForm } from "@/features/videos/components/video-upload-form";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Upload video" };

/** VID-01. */
export default async function NewVideoPage() {
  await requirePageUser({ role: "creator", path: "/creator/videos/new" });
  return (
    <section className="max-w-[640px]">
      <Link href="/creator/videos" className="eyebrow hover:text-foreground">
        ← My videos
      </Link>
      <h1 className="panel-title mt-4">Upload a video</h1>
      <p className="mt-3 mb-8 text-[13px] text-foreground-secondary">
        Your videos are private: only you can see them. You&apos;ll place burst ads in them next.
      </p>
      <VideoUploadForm />
    </section>
  );
}
