import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BoltMark, Wordmark } from "@/components/layout/logo";
import { ROLE_HOME } from "@/config/routes";
import {
  BusinessProfileForm,
  CreatorProfileForm,
} from "@/features/profiles/components/profile-form";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Set up your profile", robots: { index: false } };

/** PRF-01: required fields before the role area unlocks (AC1). */
export default async function OnboardingPage() {
  const user = await requirePageUser({
    role: ["business", "creator"],
    onboarded: false,
    path: "/onboarding",
  });
  if (user.onboardingCompleted) redirect(ROLE_HOME[user.role]);
  return (
    <>
      <header className="mx-auto flex w-full max-w-[1440px] items-center px-6 py-8 sm:px-12">
        <Link href="/" className="flex items-center gap-3" aria-label="Flashd home">
          <BoltMark className="size-6" circled={false} />
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-4 pt-4 pb-24">
        <div className="w-full max-w-[560px] rounded-xl border border-border bg-black p-6 shadow-glow-ambient sm:p-10">
          <p className="eyebrow">Step 2 of 2</p>
          <h1 className="panel-title mt-3">
            {user.role === "business" ? "Your company" : "Your creator profile"}
          </h1>
          <p className="mt-3 mb-8 text-[13px] text-foreground-secondary">
            {user.role === "business"
              ? "This is how creators will see you in the Marketplace."
              : "Tell businesses a little about you. You can change this later."}
          </p>
          {user.role === "business" ? (
            <BusinessProfileForm mode="onboarding" />
          ) : (
            <CreatorProfileForm mode="onboarding" />
          )}
        </div>
      </main>
    </>
  );
}
