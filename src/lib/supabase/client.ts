import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | null = null;

/**
 * Browser-side Supabase client, memoised for the lifetime of the tab.
 *
 * Returns `null` when the public environment variables are absent, which is the
 * pre-launch state. Callers must handle that instead of assuming a client:
 *
 *   const supabase = getSupabaseBrowserClient();
 *   if (!supabase) return { status: "unconfigured" };
 */
export function getSupabaseBrowserClient(): TypedSupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;

  browserClient ??= createBrowserClient<Database>(env.url, env.anonKey);
  return browserClient;
}
