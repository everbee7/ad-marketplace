"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Field, FormMessage } from "@/components/forms/field";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { routes } from "@/config/routes";

import { signIn } from "../actions";
import { signInSchema, type SignInInput } from "../schemas";

import { ResendVerification } from "./resend-verification";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const { form, onSubmit, pending, error, ready } = useActionForm({
    schema: signInSchema,
    defaultValues: { email: "", password: "", next } as SignInInput,
    action: signIn,
    onSuccess: (data) => {
      router.replace(data.redirectTo);
      router.refresh();
    },
  });
  const { register, formState, getValues } = form;
  const unverified = error?.fields?._code === "EMAIL_NOT_VERIFIED";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error && (
        <FormMessage>
          <span className="block">{error.message}</span>
          {unverified && (
            <span className="mt-1 block text-foreground-secondary">
              We sent you a link when you signed up. You can get a new one below.
            </span>
          )}
        </FormMessage>
      )}
      {unverified && <ResendVerification email={getValues("email")} />}

      <Field label="Email" required error={formState.errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}
      </Field>
      <Field label="Password" required error={formState.errors.password?.message}>
        {(p) => (
          <Input {...p} type="password" autoComplete="current-password" {...register("password")} />
        )}
      </Field>
      <div className="-mt-2 text-right">
        <Link
          href={routes.forgotPassword}
          className="text-xs text-link-muted hover:text-foreground"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" disabled={pending || !ready} className="w-full">
        {pending && <Spinner />}
        Log in
      </Button>
      <p className="text-center text-[13px] text-foreground-secondary">
        New to Flashd?{" "}
        <Link href={routes.signup} className="text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
