import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { createElement } from "react";

import { SIGNUP_ROLES } from "@/config/enums";
import { limits } from "@/config/limits";
import { routes } from "@/config/routes";
import { ActionEmail } from "@/emails/action-email";
import { env } from "@/env";
import { getDb, getMongoClient } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { peek, hit, reset } from "@/lib/ratelimit";
import { passwordProblem } from "@/lib/password";

// Better Auth (ADR-0002). Sessions, verification, reset and Better Auth's own IP limiter live in Mongo.
// App rules on top (PRD AUTH-01..04) are enforced in hooks so they also cover direct calls to /api/auth/*.

export const LOCKOUT_MESSAGE =
  "Too many failed attempts. For your security, sign-in is blocked for 15 minutes.";
export const DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists.";

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export const auth = betterAuth({
  appName: "Flashd",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL,
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
  database: mongodbAdapter(getDb(), { client: getMongoClient() }),
  telemetry: { enabled: false },
  user: {
    additionalFields: {
      role: { type: "string", required: true, input: true },
      onboardingCompleted: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: limits.auth.passwordMin,
    resetPasswordTokenExpiresIn: limits.auth.resetTtlSec,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Reset your Flashd password",
        text: `Reset your password: ${url}\nThis link works once and expires in 1 hour.`,
        react: createElement(ActionEmail, {
          preview: "Reset your Flashd password",
          title: "Reset your password",
          body: "Someone asked to reset the password for your Flashd account. If it was you, choose a new password below.",
          cta: "Choose a new password",
          url,
          footnote:
            "This link works once and expires in 1 hour. If you didn't ask for it, ignore this email.",
        }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: limits.auth.verificationTtlSec,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Verify your email for Flashd",
        text: `Verify your email: ${url}\nThis link expires in 24 hours.`,
        react: createElement(ActionEmail, {
          preview: "Verify your email to start using Flashd",
          title: "Verify your email",
          body: "Welcome to Flashd. Confirm your email address to finish creating your account.",
          cta: "Verify email",
          url,
          footnote: "This link expires in 24 hours.",
        }),
      });
    },
  },
  rateLimit: { enabled: env.NODE_ENV !== "test", storage: "database" },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        // AUTH-01 AC3: only business/creator at sign-up; admins come from scripts/seed-admin.ts.
        if (!SIGNUP_ROLES.includes(body.role as (typeof SIGNUP_ROLES)[number])) {
          throw new APIError("BAD_REQUEST", { message: "Choose Business or Creator." });
        }
        const problem = passwordProblem(typeof body.password === "string" ? body.password : "");
        if (problem) throw new APIError("BAD_REQUEST", { message: problem });
        // AUTH-01 AC2 asks for an explicit duplicate message (Better Auth hides it by default).
        const existing = await ctx.context.internalAdapter.findUserByEmail(
          normalizeEmail(body.email),
        );
        if (existing) {
          throw new APIError("UNPROCESSABLE_ENTITY", {
            message: DUPLICATE_EMAIL_MESSAGE,
            code: "USER_ALREADY_EXISTS",
          });
        }
      }
      if (ctx.path === "/sign-in/email") {
        // AUTH-03 AC3: 5 failures / 15 min / email.
        const email = normalizeEmail((ctx.body as Record<string, unknown> | undefined)?.email);
        if (email && !(await peek("loginFailures", email)).ok) {
          throw new APIError("TOO_MANY_REQUESTS", { message: LOCKOUT_MESSAGE, code: "LOCKED_OUT" });
        }
      }
      if (ctx.path === "/update-user") {
        // AUTH-01 AC3: the role can't be changed by the user.
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        if ("role" in body || "onboardingCompleted" in body) {
          throw new APIError("FORBIDDEN", { message: "This field can't be changed." });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const email = normalizeEmail((ctx.body as Record<string, unknown> | undefined)?.email);
      if (!email) return;
      const returned = ctx.context.returned;
      if (returned instanceof APIError) {
        if (returned.status === "UNAUTHORIZED") {
          const res = await hit("loginFailures", email);
          if (!res.ok) logger.warn("auth.lockout", { route: "/sign-in/email" });
        }
      } else {
        await reset("loginFailures", email);
      }
    }),
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;

export const VERIFY_CALLBACK = `${routes.checkEmail}/done`;
export const RESET_CALLBACK = routes.resetPassword;
