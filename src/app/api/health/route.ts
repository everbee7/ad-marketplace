import { NextResponse } from "next/server";

import { connectDb, getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

// Liveness + database check, used by Playwright's webServer and uptime checks.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDb();
    await getDb().command({ ping: 1 });
    return NextResponse.json({ ok: true, db: "up" });
  } catch (err) {
    logger.error("health.db_down", { route: "/api/health" }, err);
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
