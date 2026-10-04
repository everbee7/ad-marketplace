import type { Metadata } from "next";

import { CreatorProfileForm } from "@/features/profiles/components/profile-form";
import { getProfile } from "@/features/profiles/queries";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Profile" };

/** PRF-02. */
export default async function CreatorProfilePage() {
  const user = await requirePageUser({ role: "creator", path: "/creator/profile" });
  const profile = await getProfile(user.id);
  return (
    <section className="max-w-[560px]">
      <h1 className="panel-title">Creator profile</h1>
      <p className="mt-3 mb-8 text-[13px] text-foreground-secondary">
        This is what businesses see about you.
      </p>
      <CreatorProfileForm mode="edit" initial={profile?.role === "creator" ? profile : undefined} />
    </section>
  );
}
