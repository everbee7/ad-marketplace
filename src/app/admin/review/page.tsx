import type { Metadata } from "next";

import { ReviewPanel } from "@/features/admin/components/review-panel";
import { getReviewQueue } from "@/features/admin/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Review queue" };
export const dynamic = "force-dynamic";

/** ADM-02: pending ads, oldest first. */
export default async function ReviewPage() {
  await requirePageUser({ role: "admin", path: "/admin/review" });
  const { item, total } = await getReviewQueue();
  return (
    <section className="flex flex-col gap-8">
      <h1 className="panel-title">Review queue</h1>
      {item ? (
        <ReviewPanel item={item} total={total} />
      ) : (
        <p className="eyebrow mt-10 text-center">All caught up. No ads waiting for review.</p>
      )}
    </section>
  );
}
