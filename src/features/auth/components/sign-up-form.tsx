"use client";

import { Building2, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";

import { Field, FormMessage } from "@/components/forms/field";
import { useActionForm } from "@/components/forms/use-action-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { SignupRole } from "@/config/enums";
import { routes } from "@/config/routes";
import { PASSWORD_RULE } from "@/lib/password";
import { cn } from "@/lib/utils";

import { signUp } from "../actions";
import { signUpSchema, type SignUpInput } from "../schemas";

const roleOptions: { value: SignupRole; label: string; caption: string; icon: typeof Building2 }[] =
  [
    { value: "business", label: "Business", caption: "Publish burst ads", icon: Building2 },
    { value: "creator", label: "Creator", caption: "Place ads in videos", icon: Video },
  ];

export function SignUpForm({ defaultRole }: { defaultRole?: SignupRole }) {
  const router = useRouter();
  const { form, onSubmit, pending, error } = useActionForm({
    schema: signUpSchema,
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      role: defaultRole,
      acceptTerms: false as unknown as true,
    } as SignUpInput,
    action: signUp,
    onSuccess: (data) =>
      router.push(`${routes.checkEmail}?email=${encodeURIComponent(data.email)}`),
  });
  const { register, control, formState } = form;
  const errors = formState.errors;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error && <FormMessage>{error.message}</FormMessage>}

      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow mb-2 text-muted-foreground">I am a</legend>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3">
              {roleOptions.map(({ value, label, caption, icon: Icon }) => {
                const checked = field.value === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => field.onChange(value)}
                    className={cn(
                      "flex min-h-[79px] flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 transition-[border-color,box-shadow] duration-150",
                      checked
                        ? "border-primary shadow-glow-primary"
                        : "border-border-strong hover:border-white",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                    <span className="font-display text-sm font-bold tracking-[0.14em] uppercase">
                      {label}
                    </span>
                    <span className="text-xs text-subtle-foreground">{caption}</span>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.role && (
          <p role="alert" className="text-xs text-destructive">
            {errors.role.message}
          </p>
        )}
      </fieldset>

      <Field label="Email" required error={errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}
      </Field>
      <Field label="Password" required error={errors.password?.message} hint={PASSWORD_RULE}>
        {(p) => (
          <Input {...p} type="password" autoComplete="new-password" {...register("password")} />
        )}
      </Field>
      <Field label="Confirm password" required error={errors.confirmPassword?.message}>
        {(p) => (
          <Input
            {...p}
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
        )}
      </Field>

      <Controller
        control={control}
        name="acceptTerms"
        render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-3 text-[13px] text-foreground-secondary">
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                aria-invalid={errors.acceptTerms ? true : undefined}
                className="mt-0.5"
              />
              <span>
                I accept the{" "}
                <Link
                  href="/terms"
                  className="text-foreground underline underline-offset-4"
                  target="_blank"
                >
                  terms of service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-foreground underline underline-offset-4"
                  target="_blank"
                >
                  privacy policy
                </Link>
                .
              </span>
            </label>
            {errors.acceptTerms && (
              <p role="alert" className="text-xs text-destructive">
                {errors.acceptTerms.message}
              </p>
            )}
          </div>
        )}
      />

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending && <Spinner />}
        Create account
      </Button>
      <p className="text-center text-[13px] text-foreground-secondary">
        Already have an account?{" "}
        <Link href={routes.login} className="text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
