import "server-only";

import { getAuthService } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import type { SessionUser } from "@/types/user";

export type AccountMode =
  /** Supabase connected and the request is authenticated. */
  | { mode: "authenticated"; user: SessionUser }
  /** Supabase connected but nobody is signed in. */
  | { mode: "anonymous" }
  /**
   * No backend yet. The dashboard renders in a clearly-labelled preview so the
   * UI can be reviewed, with every figure at zero and no account attached.
   */
  | { mode: "preview" };

/**
 * Resolves who — if anyone — the current request belongs to.
 *
 * This is the single place the dashboard asks "is there a real account here?".
 * When Supabase is connected the `preview` branch becomes unreachable and the
 * proxy plus RLS take over enforcement.
 */
export async function getAccountMode(): Promise<AccountMode> {
  if (!isSupabaseConfigured()) {
    return { mode: "preview" };
  }

  const user = await getAuthService().getCurrentUser();
  return user ? { mode: "authenticated", user } : { mode: "anonymous" };
}

export function isPreviewMode(account: AccountMode): boolean {
  return account.mode === "preview";
}

/** The user to render, or `null` in anonymous/preview mode. */
export function getAccountUser(account: AccountMode): SessionUser | null {
  return account.mode === "authenticated" ? account.user : null;
}
