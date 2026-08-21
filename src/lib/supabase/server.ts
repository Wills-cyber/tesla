import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers.
 *
 * A fresh client is created per request — never cache or share one across
 * requests, or sessions will leak between users.
 *
 * Returns `null` when Supabase is not configured yet.
 */
export async function getSupabaseServerClient(): Promise<TypedSupabaseClient | null> {
  const env = getSupabaseEnv();
  if (!env) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. Token refresh is handled by
          // `src/proxy.ts`, so swallowing this is safe and expected.
        }
      },
    },
  });
}

/**
 * The signed-in user, verified against Supabase Auth.
 *
 * Uses `getUser()` rather than `getSession()`: session data read straight from
 * cookies is not trustworthy for authorization decisions, while `getUser()`
 * revalidates the token with the auth server.
 */
export async function getServerUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
}
