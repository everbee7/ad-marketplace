import type { Metadata } from "next";

import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHomePage() {
  await requirePageUser({ role: "admin", path: "/admin" });
  return (
    <section>
      <h1 className="panel-title">Overview</h1>
    </section>
  );
}
