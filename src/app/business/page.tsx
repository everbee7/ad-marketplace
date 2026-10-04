import type { Metadata } from "next";

import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Ad library" };

export default async function BusinessHomePage() {
  await requirePageUser({ role: "business", path: "/business" });
  return (
    <section>
      <h1 className="panel-title">Ad library</h1>
      <p className="eyebrow mt-10 text-center">No ads yet</p>
    </section>
  );
}
