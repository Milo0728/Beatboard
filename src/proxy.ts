import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/admin", "/live", "/my-ratings", "/settings"];

export async function proxy(request: NextRequest) {
  // Expose the pathname to Server Components via a request header so they
  // can render path-aware UI (e.g. hide the global nav on the OBS overlay).
  request.headers.set("x-pathname", request.nextUrl.pathname);

  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run middleware on every path except:
     * - _next static / image optimizer
     * - favicon, public assets
     * - the auth callback (handles its own cookie writes)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
