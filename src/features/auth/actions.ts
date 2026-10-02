"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Role } from "@/config/enums";
import { ROLE_HOME, routes, safeNextPath } from "@/config/routes";
import { run } from "@/lib/action";
import { auth, RESET_CALLBACK, VERIFY_CALLBACK } from "@/lib/auth";
import { DomainError, type ActionResult } from "@/lib/errors";
import { hit } from "@/lib/ratelimit";

import {
  emailOnlySchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type EmailOnlyInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
} from "./schemas";

/** AUTH-01: creates the account and sends the verification email. */
export async function signUp(input: SignUpInput): Promise<ActionResult<{ email: string }>> {
  return run("signUp", signUpSchema, input, async (data) => {
    await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.email.split("@")[0] ?? data.email,
        role: data.role,
        callbackURL: VERIFY_CALLBACK,
      },
      headers: await headers(),
    });
    return { email: data.email };
  });
}

/** AUTH-03: signs in and returns where to go (role home, onboarding, or an allowed `next`). */
export async function signIn(input: SignInInput): Promise<ActionResult<{ redirectTo: string }>> {
  return run("signIn", signInSchema, input, async (data) => {
    try {
      const res = await auth.api.signInEmail({
        body: { email: data.email, password: data.password },
        headers: await headers(),
      });
      const user = res.user as unknown as { role: Role; onboardingCompleted?: boolean };
      if (user.role !== "admin" && !user.onboardingCompleted)
        return { redirectTo: routes.onboarding };
      return { redirectTo: safeNextPath(data.next, user.role) ?? ROLE_HOME[user.role] };
    } catch (err) {
      if (err instanceof APIError) {
        const code = (err.body as { code?: string } | undefined)?.code;
        if (code === "EMAIL_NOT_VERIFIED") {
          throw new DomainError("FORBIDDEN", "Please verify your email.", {
            _code: "EMAIL_NOT_VERIFIED",
          });
        }
        if (err.status === "UNAUTHORIZED") {
          throw new DomainError("UNAUTHENTICATED", "Incorrect email or password.");
        }
      }
      throw err;
    }
  });
}

/** AUTH-03 AC4: ends the session on this device. */
export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect(routes.home);
}

/** AUTH-02 AC3: resend the verification email. Always answers the same way. */
export async function resendVerification(input: EmailOnlyInput): Promise<ActionResult<null>> {
  return run("resendVerification", emailOnlySchema, input, async (data) => {
    if (!(await hit("authEmail", `verify:${data.email}`)).ok) {
      throw new DomainError("RATE_LIMITED", "Too many emails requested. Please try again later.");
    }
    try {
      await auth.api.sendVerificationEmail({
        body: { email: data.email, callbackURL: VERIFY_CALLBACK },
      });
    } catch (err) {
      // Unknown or already-verified emails get the same answer (no account enumeration here).
      if (!(err instanceof APIError)) throw err;
    }
    return null;
  });
}

/** AUTH-04 AC1: same confirmation whether or not the email exists. */
export async function requestPasswordReset(input: EmailOnlyInput): Promise<ActionResult<null>> {
  return run("requestPasswordReset", emailOnlySchema, input, async (data) => {
    if (!(await hit("authEmail", `reset:${data.email}`)).ok) return null;
    await auth.api.requestPasswordReset({
      body: { email: data.email, redirectTo: RESET_CALLBACK },
    });
    return null;
  });
}

/** AUTH-04 AC2–AC3: single-use 1 h token; other sessions are revoked by Better Auth. */
export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult<null>> {
  return run("resetPassword", resetPasswordSchema, input, async (data) => {
    try {
      await auth.api.resetPassword({ body: { newPassword: data.password, token: data.token } });
    } catch (err) {
      if (err instanceof APIError && err.status === "BAD_REQUEST") {
        throw new DomainError(
          "VALIDATION",
          "This reset link is invalid or has expired. Request a new one.",
          {
            _code: "INVALID_TOKEN",
          },
        );
      }
      throw err;
    }
    return null;
  });
}
