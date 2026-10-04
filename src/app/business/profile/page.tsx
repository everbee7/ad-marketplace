import type { Metadata } from "next";

import { BusinessProfileForm } from "@/features/profiles/components/profile-form";
import { getProfile } from "@/features/profiles/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Profile" };

/** PRF-02. */
export default async function BusinessProfilePage() {
  const user = await requirePageUser({ role: "business", path: "/business/profile" });
  const profile = await getProfile(user.id);
  return (
    <section className="max-w-[560px]">
      <h1 className="panel-title">Company profile</h1>
      <p className="mt-3 mb-8 text-[13px] text-foreground-secondary">
        Changes appear on your Marketplace ads straight away.
      </p>
      <BusinessProfileForm
        mode="edit"
        initial={profile?.role === "business" ? profile : undefined}
      />
    </section>
  );
}
