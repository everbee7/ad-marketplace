import { NextResponse, type NextRequest } from "next/server";

import { searchMarketplace } from "@/features/marketplace/queries";
import { parseMarketplaceQuery } from "@/features/marketplace/schemas";
import { DomainError, httpStatus } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireUser } from "@/lib/permissions";
import { enforce } from "@/lib/ratelimit";

// GET /api/marketplace (API.md): search, filter and page live ads for infinite scroll.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    await enforce("marketplace", user.id);
    const page = await searchMarketplace(user, parseMarketplaceQuery(request.nextUrl.searchParams));
    return NextResponse.json(page, { headers: { "cache-control": "private, no-store" } });
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: httpStatus[err.code] },
      );
    }
    logger.error("marketplace.search_failed", { route: "/api/marketplace" }, err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Search failed." } },
      { status: 500 },
    );
  }
}
