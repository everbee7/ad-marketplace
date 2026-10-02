import type { Instrumentation } from "next";

// ARCHITECTURE §12: every unhandled server error is logged with route and context.

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logger } = await import("@/lib/logger");
  logger.error(
    "request.error",
    {
      route: context.routePath,
      routeType: context.routeType,
      method: request.method,
      path: request.path,
      digest: err && typeof err === "object" && "digest" in err ? String(err.digest) : undefined,
    },
    err,
  );
};
