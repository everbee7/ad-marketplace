import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "@/env";
import { runCleanup } from "@/features/maintenance/cleanup";
import { logger } from "@/lib/logger";

// GET /api/cron/cleanup (API.md): called daily by Vercel Cron with `Authorization: Bearer CRON_SECRET`.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(header: string | null): boolean {
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Unauthorized." } },
      { status: 401 },
    );
  }
  try {
    const stats = await runCleanup();
    return NextResponse.json({ stats });
  } catch (err) {
    logger.error("cleanup.failed", { route: "/api/cron/cleanup" }, err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Cleanup failed." } },
      { status: 500 },
    );
  }
}
