import { limits } from "@/config/limits";

// AUTH-01 password rule: at least 8 characters, with at least 1 letter and 1 number. Shared client/server.

export const PASSWORD_RULE = "At least 8 characters, with at least 1 letter and 1 number.";

export function passwordProblem(password: string): string | null {
  if (
    password.length < limits.auth.passwordMin ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return `Password must be ${PASSWORD_RULE.charAt(0).toLowerCase()}${PASSWORD_RULE.slice(1)}`;
  }
  return null;
}
