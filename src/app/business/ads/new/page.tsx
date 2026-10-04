import type { Metadata } from "next";
import Link from "next/link";

import { NewAdForm } from "@/features/ads/components/new-ad-form";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Add ad" };

/** AD-01. */
export default async function NewAdPage() {
  await requirePageUser({ role: "business", path: "/business/ads/new" });
  return (
    <section className="max-w-[640px]">
      <Link href="/business" className="eyebrow hover:text-foreground">
        ← Ad library
      </Link>
      <h1 className="panel-title mt-4">Add a burst ad</h1>
      <p className="mt-3 mb-8 text-[13px] text-foreground-secondary">
        A 0.5–2 second clip creators cut into their videos. Every ad is reviewed before it goes
        live.
      </p>
      <NewAdForm />
    </section>
  );
}
