import type { Metadata } from "next";
import Link from "next/link";

import { FormMessage } from "@/components/forms/field";
import { routes } from "@/config/routes";
import { ResetPasswordForm } from "@/features/auth/components/password-forms";

export const metadata: Metadata = { title: "Reset password" };

/** Better Auth redirects here with ?token=… (valid) or ?error=INVALID_TOKEN (expired or used). */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;
  return (
    <>
      <h1 className="panel-title">Choose a new password</h1>
      <div className="mt-8">
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <FormMessage>
            This reset link is invalid, expired or was already used.{" "}
            <Link href={routes.forgotPassword} className="underline underline-offset-4">
              Request a new link
            </Link>
          </FormMessage>
        )}
      </div>
    </>
  );
}
