import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { routes } from "@/config/routes";
import { ResendVerification } from "@/features/auth/components/resend-verification";

export const metadata: Metadata = { title: "Check your email" };

/** AUTH-01 AC1: where users land after signing up. */
export default async function CheckEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { email } = await searchParams;
  const address = typeof email === "string" ? email : undefined;
  return (
    <div className="flex flex-col items-center text-center">
      <MailCheck className="size-10" strokeWidth={1.5} aria-hidden="true" />
      <h1 className="panel-title mt-6">Check your email</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-foreground-secondary">
        We sent a verification link to{" "}
        {address ? <strong className="text-foreground">{address}</strong> : "your inbox"}. Open it
        within 24 hours to activate your account.
      </p>
      <div className="mt-8 w-full">
        <ResendVerification email={address} />
      </div>
      <Link href={routes.login} className="mt-6 text-[13px] text-link-muted hover:text-foreground">
        Back to log in
      </Link>
    </div>
  );
}
