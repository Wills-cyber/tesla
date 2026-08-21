/**
 * Environment access.
 *
 * Only `NEXT_PUBLIC_*` values may be read from client components. The
 * service-role key is intentionally *not* exposed here at all — see
 * `src/lib/supabase/README.md`. If you ever need it, read it inside a server-only
 * module and never import that module from a client component.
 */

const PUBLIC_URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const PUBLIC_KEY_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

/**
 * Read at module scope so Next.js can statically inline the values into the
 * client bundle. Destructuring `process.env` dynamically would break that.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

/**
 * True when both public Supabase values are present. Every data-access path
 * checks this first and reports `unconfigured` instead of throwing, which is
 * what lets the UI render honest empty states before the backend exists.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/** Returns `null` rather than throwing so callers can degrade gracefully. */
export function getSupabaseEnv(): SupabaseEnv | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

/** Use only where a missing configuration is genuinely unrecoverable. */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) {
    const missing = [
      !supabaseUrl && PUBLIC_URL_KEY,
      !supabaseAnonKey && PUBLIC_KEY_KEY,
    ].filter(Boolean);

    throw new Error(
      `Supabase is not configured. Missing environment variable(s): ${missing.join(
        ", "
      )}. Copy .env.example to .env.local and fill in the values.`
    );
  }
  return env;
}

export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
