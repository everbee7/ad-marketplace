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
import { escapeRegex } from "@/lib/text";

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

// --- Read-only user queries for admin screens (DATA_MODEL: Better Auth collections are read via lib/auth) ---

export type AuthUserRow = {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
};

type RawUser = {
  _id: import("mongodb").ObjectId;
  email: string;
  role?: string;
  emailVerified?: boolean;
  onboardingCompleted?: boolean;
  createdAt?: Date;
};

function toRow(u: RawUser): AuthUserRow {
  return {
    id: String(u._id),
    email: u.email,
    role: u.role ?? "unknown",
    emailVerified: u.emailVerified === true,
    onboardingCompleted: u.onboardingCompleted === true,
    createdAt: u.createdAt ?? new Date(0),
  };
}

export async function countUsersByRole(): Promise<Record<string, number>> {
  const rows = await getDb()
    .collection<RawUser>("user")
    .aggregate<{ _id: string | null; n: number }>([{ $group: { _id: "$role", n: { $sum: 1 } } }])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id ?? "unknown", r.n]));
}

export async function searchUsers(opts: {
  email?: string;
  role?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: AuthUserRow[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (opts.email) filter.email = { $regex: escapeRegex(opts.email.toLowerCase()) };
  if (opts.role) filter.role = opts.role;
  const col = getDb().collection<RawUser>("user");
  const [docs, total] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((opts.page - 1) * opts.pageSize)
      .limit(opts.pageSize)
      .toArray(),
    col.countDocuments(filter),
  ]);
  return { rows: docs.map(toRow), total };
}

export async function usersByIds(ids: string[]): Promise<Map<string, AuthUserRow>> {
  const { ObjectId } = await import("mongodb");
  const valid = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (valid.length === 0) return new Map();
  const docs = await getDb()
    .collection<RawUser>("user")
    .find({ _id: { $in: valid } })
    .toArray();
  return new Map(docs.map((d) => [String(d._id), toRow(d)]));
}
