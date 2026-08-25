import { NextResponse, type NextRequest } from "next/server";

import { authRoutes } from "@/config/navigation";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

/**
 * Proxy — Next.js 16's replacement for middleware (same behaviour, new name,
 * Node.js runtime only).
 *
 * Responsibilities:
 *   1. Keep the Supabase auth session fresh by rotating cookies onto the response.
 *   2. Perform an *optimistic* redirect so signed-out visitors don't see a
 *      dashboard shell flash before the server rejects them.
 *
 * This is not the authorization boundary. Real enforcement lives in
 * `src/lib/auth/session.ts` (which verifies the token with the auth server) and
 * in the Row Level Security policies on every table.
 *
 * While Supabase is unconfigured the proxy is a pass-through, so `/dashboard`
 * stays reachable as a clearly-labelled UI preview.
 */

/**
 * Every authenticated area of the application. The shell used to live entirely
 * under `/dashboard`; it is now five top-level areas, so each one is listed.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/invest",
  "/investments",
  "/wallet",
  "/profile",
  "/notifications",
  "/admin",
] as const;
const AUTH_ONLY_PATHS = [
  authRoutes.login,
  authRoutes.register,
  authRoutes.forgotPassword,
] as const;

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAuthOnly(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some((path) => pathname === path);
}

export async function proxy(request: NextRequest) {
  const { response, userId, configured } =
    await updateSupabaseSession(request);

  if (!configured) return response;

  const { pathname, search } = request.nextUrl;

  if (!userId && isProtected(pathname)) {
    const loginUrl = new URL(authRoutes.login, request.url);
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (userId && isAuthOnly(pathname)) {
    return NextResponse.redirect(new URL(authRoutes.afterLogin, request.url));
  }

  return response;
}

export const config = {
  /**
   * Skip static assets and image optimisation so the proxy only runs where a
   * session actually matters.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
