import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROLE_HOME, routes } from "@/config/routes";
import { ResendVerification } from "@/features/auth/components/resend-verification";
import { getCurrentUser } from "@/lib/permissions";

export const metadata: Metadata = { title: "Email verification" };

const reasons: Record<string, string> = {
  TOKEN_EXPIRED: "This verification link has expired. Links are valid for 24 hours.",
  INVALID_TOKEN: "This verification link isn't valid.",
  USER_NOT_FOUND: "We couldn't find an account for this link.",
};

/**
 * Better Auth redirects here after /api/auth/verify-email (AUTH-02).
 * Success signs the user in, so we forward to onboarding (AC2). A used link no longer signs anyone in,
 * so it ends up here without a session and gets the explanation + resend (AC1, AC3).
 */
export default async function VerifyDonePage({ searchParams }: PageProps<"/verify-email/done">) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!error && user?.emailVerified) {
    redirect(
      user.role !== "admin" && !user.onboardingCompleted ? routes.onboarding : ROLE_HOME[user.role],
    );
  }
  const reason =
    (typeof error === "string" && reasons[error]) ||
    "This verification link has already been used. If your email is verified, just log in.";
  return (
    <div className="flex flex-col items-center text-center">
      <CircleAlert className="size-10" strokeWidth={1.5} aria-hidden="true" />
      <h1 className="panel-title mt-6">Link not valid</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-foreground-secondary">{reason}</p>
      <div className="mt-8 w-full">
        <ResendVerification />
      </div>
      <Link href={routes.login} className="mt-6 text-[13px] text-link-muted hover:text-foreground">
        Go to log in
      </Link>
    </div>
  );
}
