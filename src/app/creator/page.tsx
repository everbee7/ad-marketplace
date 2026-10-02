import type { Metadata } from "next";

import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Creator portal" };

export default async function CreatorHomePage() {
  await requirePageUser({ role: "creator", path: "/creator" });
  return (
    <section>
      <h1 className="panel-title">Welcome</h1>
      <p className="eyebrow mt-10 text-center">Nothing here yet</p>
    </section>
  );
}
