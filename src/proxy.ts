import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { routes } from "@/config/routes";

// Optimistic redirect only (ARCHITECTURE §5): it checks that a session cookie exists.
// Role and ownership checks happen in requireUser / requirePageUser on the server.

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = routes.login;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Must stay a static literal (Next.js analyses it at build time). Keep in sync with PROTECTED_PREFIXES.
export const config = {
  matcher: [
    "/business/:path*",
    "/creator/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
    "/marketplace/:path*",
  ],
};
