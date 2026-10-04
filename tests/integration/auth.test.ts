import { randomUUID } from "node:crypto";

import { APIError } from "better-auth/api";
import { describe, expect, it } from "vitest";

import { auth, DUPLICATE_EMAIL_MESSAGE, LOCKOUT_MESSAGE } from "@/lib/auth";

import { seedAdmin } from "../../scripts/seed-admin";
import { lastMailTo, linkIn } from "../support/mail";

const newEmail = () => `u-${randomUUID().slice(0, 8)}@example.com`;
const PASSWORD = "secret123";

async function signUp(email: string, role = "creator", password = PASSWORD) {
  return auth.api.signUpEmail({ body: { email, password, name: "Test", role } });
}

async function apiError(p: Promise<unknown>): Promise<APIError> {
  try {
    await p;
  } catch (err) {
    if (err instanceof APIError) return err;
    throw err;
  }
  throw new Error("expected an APIError");
}

/** Follows the verification link like a browser would (no redirect following). */
async function verify(email: string) {
  const url = new URL(linkIn(await lastMailTo(email, /Verify/)));
  const token = url.searchParams.get("token")!;
  await auth.api.verifyEmail({ query: { token } });
  return token;
}

describe("AUTH-01 sign up with role", () => {
  it("AC1: creates the account with the role and sends a verification email", async () => {
    const email = newEmail();
    const res = await signUp(email, "business");
    expect(res.user.email).toBe(email);
    expect((res.user as unknown as { role: string }).role).toBe("business");
    expect(res.user.emailVerified).toBe(false);
    const mail = await lastMailTo(email, /Verify/);
    expect(mail?.text).toMatch(/verify-email\?token=/);
  });

  it("AC2: a duplicate email gets the explicit message", async () => {
    const email = newEmail();
    await signUp(email);
    const err = await apiError(signUp(email.toUpperCase()));
    expect(err.body?.message).toBe(DUPLICATE_EMAIL_MESSAGE);
  });

  it("AC3: admin can't be chosen at sign-up and the role can't be changed later", async () => {
    const err = await apiError(signUp(newEmail(), "admin"));
    expect(err.status).toBe("BAD_REQUEST");
    const email = newEmail();
    await signUp(email);
    await verify(email);
    const { headers } = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      returnHeaders: true,
    });
    const cookie = headers.get("set-cookie")!.split(";")[0]!;
    const upd = await apiError(
      auth.api.updateUser({ body: { role: "admin" } as never, headers: new Headers({ cookie }) }),
    );
    expect(upd.status).toBe("FORBIDDEN");
  });

  it("rejects passwords without a letter and a number", async () => {
    const err = await apiError(signUp(newEmail(), "creator", "12345678"));
    expect(err.status).toBe("BAD_REQUEST");
  });
});

describe("AUTH-02 / AUTH-03 verification and login", () => {
  it("AUTH-03 AC1: unverified users can't log in", async () => {
    const email = newEmail();
    await signUp(email);
    const err = await apiError(auth.api.signInEmail({ body: { email, password: PASSWORD } }));
    expect(err.body?.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("AUTH-02 AC2: a valid link verifies the email; AC1: a reused link no longer signs in", async () => {
    const email = newEmail();
    await signUp(email);
    const token = await verify(email);
    const ok = await auth.api.signInEmail({ body: { email, password: PASSWORD } });
    expect(ok.user.emailVerified).toBe(true);
    const again = await auth.api.verifyEmail({ query: { token }, returnHeaders: true });
    expect(again.headers.get("set-cookie")).toBeNull();
  });

  it("AUTH-03 AC3: 5 failures in 15 minutes block further attempts", async () => {
    const email = newEmail();
    await signUp(email);
    await verify(email);
    for (let i = 0; i < 5; i++) {
      const e = await apiError(auth.api.signInEmail({ body: { email, password: "wrongpass1" } }));
      expect(e.status).toBe("UNAUTHORIZED");
    }
    const blocked = await apiError(auth.api.signInEmail({ body: { email, password: PASSWORD } }));
    expect(blocked.status).toBe("TOO_MANY_REQUESTS");
    expect(blocked.body?.message).toBe(LOCKOUT_MESSAGE);
  });
});

describe("AUTH-04 forgot / reset password", () => {
  it("AC1–AC3: single-use link resets the password and revokes other sessions", async () => {
    const email = newEmail();
    await signUp(email);
    await verify(email);
    const session = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      returnHeaders: true,
    });
    const cookie = session.headers.get("set-cookie")!.split(";")[0]!;

    await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } });
    await auth.api.requestPasswordReset({
      body: { email: newEmail(), redirectTo: "/reset-password" },
    });
    const link = new URL(linkIn(await lastMailTo(email, /Reset/)));
    const token = link.pathname.split("/").at(-1)!;

    await auth.api.resetPassword({ body: { newPassword: "newpass456", token } });
    const reuse = await apiError(
      auth.api.resetPassword({ body: { newPassword: "other789x", token } }),
    );
    expect(reuse.status).toBe("BAD_REQUEST");

    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
    const ok = await auth.api.signInEmail({ body: { email, password: "newpass456" } });
    expect(ok.user.email).toBe(email);
  });
});

describe("seed-admin (ARCHITECTURE §5)", () => {
  it("creates a verified admin who can log in", async () => {
    const email = newEmail();
    await seedAdmin(email, "adminpass1");
    const res = await auth.api.signInEmail({ body: { email, password: "adminpass1" } });
    expect((res.user as unknown as { role: string }).role).toBe("admin");
  });
});
