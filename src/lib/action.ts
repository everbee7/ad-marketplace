import "server-only";

import { APIError } from "better-auth/api";
import { unstable_rethrow } from "next/navigation";
import { ZodError, type ZodType, type z } from "zod";

import { DomainError, fail, ok, type ActionResult, type ErrorCode } from "@/lib/errors";
import { logger } from "@/lib/logger";

// Server Action pipeline helper (ARCHITECTURE §6): parse with Zod, run, map expected failures to
// ActionResult. Framework control flow (redirect, notFound) is re-thrown untouched.

export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

const apiStatusToCode: Record<string, ErrorCode> = {
  BAD_REQUEST: "VALIDATION",
  UNAUTHORIZED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  UNPROCESSABLE_ENTITY: "CONFLICT",
  TOO_MANY_REQUESTS: "RATE_LIMITED",
};

export function toActionError(err: unknown, context: { action: string }): ActionResult<never> {
  if (err instanceof DomainError) return fail(err.code, err.message, err.fields);
  if (err instanceof ZodError) {
    return fail("VALIDATION", "Please check the highlighted fields.", zodFields(err));
  }
  if (err instanceof APIError) {
    const body = (err.body ?? {}) as { code?: string; message?: string };
    const code = apiStatusToCode[String(err.status)] ?? "INTERNAL";
    return fail(code, body.message ?? err.message, body.code ? { _code: body.code } : undefined);
  }
  logger.error("action.failed", { action: context.action }, err);
  return fail("INTERNAL", "Something went wrong. Please try again.");
}

/** Wraps a Server Action body: `return run("saveAd", Schema, input, async (data) => ...)`. */
export async function run<S extends ZodType, T>(
  name: string,
  schema: S,
  input: unknown,
  fn: (data: z.infer<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = schema.parse(input);
    return ok(await fn(data));
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err, { action: name });
  }
}
