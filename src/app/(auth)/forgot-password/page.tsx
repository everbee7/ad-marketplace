import type { Metadata } from "next";
import Link from "next/link";

import { routes } from "@/config/routes";
import { ForgotPasswordForm } from "@/features/auth/components/password-forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="panel-title">Forgot password</h1>
      <p className="mt-3 mb-8 text-[13px] text-foreground-secondary">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>
      <ForgotPasswordForm />
      <Link
        href={routes.login}
        className="mt-6 block text-center text-[13px] text-link-muted hover:text-foreground"
      >
        Back to log in
      </Link>
    </>
  );
}
