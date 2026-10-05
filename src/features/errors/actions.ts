"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { run } from "@/lib/action";
import type { ActionResult } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/permissions";
import { hit } from "@/lib/ratelimit";

// ARCHITECTURE §12: client errors are recorded through the same structured logger.

const clientErrorSchema = z.object({
  message: z.string().max(500),
  digest: z.string().max(100).optional(),
  path: z.string().max(300).optional(),
  stack: z.string().max(4000).optional(),
});

export async function reportClientError(
  input: z.input<typeof clientErrorSchema>,
): Promise<ActionResult<null>> {
  return run("reportClientError", clientErrorSchema, input, async (data) => {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown").split(",")[0]!.trim();
    if (!(await hit("clientError", ip)).ok) return null; // drop silently when flooded
    const user = await getCurrentUser().catch(() => null);
    logger.error(
      "client.error",
      { userId: user?.id, route: data.path, digest: data.digest },
      {
        name: "ClientError",
        message: data.message,
        stack: data.stack,
      },
    );
    return null;
  });
}
