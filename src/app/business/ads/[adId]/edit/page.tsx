import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EditAdForm } from "@/features/ads/components/edit-ad-form";
import { ReplaceVideo } from "@/features/ads/components/replace-video";
import { getBusinessAd } from "@/features/ads/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Edit ad" };

const replaceNote: Record<string, string> = {
  live: "Replacing the video sends the ad back to review. The current version stays live until the new one is approved.",
  unlisted: "The new video is reviewed when you relist the ad.",
  rejected: "Uploading a new video resubmits the ad for review.",
  failed: "Your title, description and tags are kept.",
};

/** AD-05: edit metadata, thumbnail and video. */
export default async function EditAdPage({ params }: PageProps<"/business/ads/[adId]/edit">) {
  const { adId } = await params;
  const user = await requirePageUser({ role: "business", path: `/business/ads/${adId}/edit` });
  const ad = await getBusinessAd(user, adId);
  if (!ad || ad.status === "removed") notFound();
  const note = replaceNote[ad.status];
  return (
    <section className="flex max-w-[640px] flex-col gap-10">
      <div>
        <Link href={`/business/ads/${ad.id}`} className="eyebrow hover:text-foreground">
          ← Back to ad
        </Link>
        <h1 className="panel-title mt-4">Edit ad</h1>
      </div>
      <EditAdForm ad={ad} />
      {note && (
        <section className="flex flex-col gap-4 border-t border-divider pt-8">
          <h2 className="panel-title text-base">Replace video</h2>
          <ReplaceVideo adId={ad.id} note={note} />
        </section>
      )}
    </section>
  );
}
