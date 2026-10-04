import type { Metadata } from "next";

import { SavedEmpty, SavedList } from "@/features/marketplace/components/saved-list";
import { listSavedAds } from "@/features/marketplace/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Saved ads" };
export const dynamic = "force-dynamic";

/** MKT-05. */
export default async function SavedPage() {
  const user = await requirePageUser({ role: "creator", path: "/creator/saved" });
  const items = await listSavedAds(user);
  return (
    <section className="flex flex-col gap-8">
      <h1 className="panel-title">Saved ads</h1>
      {items.length === 0 ? <SavedEmpty /> : <SavedList items={items} />}
    </section>
  );
}
