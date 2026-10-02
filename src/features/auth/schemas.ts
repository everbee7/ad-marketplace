import { z } from "zod";

import { SIGNUP_ROLES } from "@/config/enums";
import { passwordProblem } from "@/lib/password";

// AUTH-01..04 inputs. Shared by forms (RHF resolver) and Server Actions.

const email = z.email("Enter a valid email address.").trim().toLowerCase();

const password = z.string().superRefine((value, ctx) => {
  const problem = passwordProblem(value);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

export const signUpSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string(),
    role: z.enum(SIGNUP_ROLES, { message: "Choose Business or Creator." }),
    acceptTerms: z.literal(true, { message: "You need to accept the terms to continue." }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });
export type SignUpInput = z.input<typeof signUpSchema>;

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  next: z.string().max(500).optional(),
});
export type SignInInput = z.input<typeof signInSchema>;

export const emailOnlySchema = z.object({ email });
export type EmailOnlyInput = z.input<typeof emailOnlySchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

export const RESET_REQUESTED_MESSAGE =
  "If an account exists for that email, we've sent a link to reset the password.";
export const VERIFY_SENT_MESSAGE =
  "If that email needs verifying, a new link is on its way. Check your inbox.";
