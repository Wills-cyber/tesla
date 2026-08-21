import "server-only";

import { isSupabaseConfigured } from "@/lib/env";

import type { AuthService } from "./auth-service";
import { prelaunchAuthService } from "./prelaunch-auth-service";
import { supabaseAuthService } from "./supabase-auth-service";

/**
 * Resolves the active authentication implementation.
 *
 * This is the single switch between the pre-launch stand-in and Supabase Auth.
 * Adding the two `NEXT_PUBLIC_SUPABASE_*` environment variables is all it takes
 * to flip it — no call site changes.
 */
export function getAuthService(): AuthService {
  return isSupabaseConfigured() ? supabaseAuthService : prelaunchAuthService;
}

export function isAuthOperational(): boolean {
  return getAuthService().isOperational;
}
