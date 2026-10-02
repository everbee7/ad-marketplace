"use client";

import Link from "next/link";
import { useState } from "react";

import { Field, FormMessage } from "@/components/forms/field";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";
import { PASSWORD_RULE } from "@/lib/password";

import { requestPasswordReset, resetPassword } from "../actions";
import {
  emailOnlySchema,
  RESET_REQUESTED_MESSAGE,
  resetPasswordSchema,
  type EmailOnlyInput,
  type ResetPasswordInput,
} from "../schemas";

/** AUTH-04 AC1: the same confirmation whether or not the email exists. */
export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const { form, onSubmit, pending, error, ready } = useActionForm({
    schema: emailOnlySchema,
    defaultValues: { email: "" } as EmailOnlyInput,
    action: requestPasswordReset,
    onSuccess: () => setSent(true),
  });
  if (sent) return <FormMessage tone="success">{RESET_REQUESTED_MESSAGE}</FormMessage>;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error && <FormMessage>{error.message}</FormMessage>}
      <Field label="Email" required error={form.formState.errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Button type="submit" disabled={pending || !ready} className="w-full">
        {pending && <Spinner />}
        Send reset link
      </Button>
    </form>
  );
}

/** AUTH-04 AC2–AC3. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const { form, onSubmit, pending, error, ready } = useActionForm({
    schema: resetPasswordSchema,
    defaultValues: { token, password: "", confirmPassword: "" } as ResetPasswordInput,
    action: resetPassword,
    onSuccess: () => setDone(true),
  });
  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <FormMessage tone="success">
          Your password was changed. Other devices have been signed out.
        </FormMessage>
        <Button asChild className="w-full">
          <Link href={routes.login}>Log in</Link>
        </Button>
      </div>
    );
  }
  const expired = error?.fields?._code === "INVALID_TOKEN";
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error && (
        <FormMessage>
          {error.message}{" "}
          {expired && (
            <Link href={routes.forgotPassword} className="underline underline-offset-4">
              Request a new link
            </Link>
          )}
        </FormMessage>
      )}
      <Field
        label="New password"
        required
        error={form.formState.errors.password?.message}
        hint={PASSWORD_RULE}
      >
        {(p) => (
          <Input
            {...p}
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
        )}
      </Field>
      <Field
        label="Confirm password"
        required
        error={form.formState.errors.confirmPassword?.message}
      >
        {(p) => (
          <Input
            {...p}
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
        )}
      </Field>
      <Button type="submit" disabled={pending || !ready} className="w-full">
        {pending && <Spinner />}
        Set new password
      </Button>
    </form>
  );
}
