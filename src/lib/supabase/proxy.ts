import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export type ProxySessionResult = {
  response: NextResponse;
  /** `null` when Supabase is unconfigured *or* nobody is signed in. */
  userId: string | null;
  /** Distinguishes "no backend yet" from "signed out". */
  configured: boolean;
};

/**
 * Refreshes the Supabase auth session and mirrors any rotated cookies onto the
 * outgoing response.
 *
 * Called from `src/proxy.ts` (Next.js 16 renamed middleware to proxy). The
 * cookie dance below is load-bearing: tokens must be written to *both* the
 * request (so the rest of the proxy sees them) and the response (so the browser
 * stores them), or users get logged out at random.
 */
export async function updateSupabaseSession(
  request: NextRequest
): Promise<ProxySessionResult> {
  let response = NextResponse.next({ request });

  const env = getSupabaseEnv();
  if (!env) {
    return { response, userId: null, configured: false };
  }

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { response, userId: user?.id ?? null, configured: true };
  } catch {
    // A transient auth-server failure must not hard-fail every request; treat
    // it as "not signed in" and let the route's own guard decide.
    return { response, userId: null, configured: true };
  }
}
