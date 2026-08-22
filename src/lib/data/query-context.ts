import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DataResult } from "@/types";

import { getAccountMode } from "@/lib/auth/session";

export type { DataResult };

export const UNCONFIGURED: DataResult<never> = { status: "unconfigured" };
export const UNAUTHENTICATED: DataResult<never> = { status: "unauthenticated" };

export function ready<T>(data: T): DataResult<T> {
  return { status: "ready", data };
}

export function failed<T>(message: string): DataResult<T> {
  return { status: "error", message };
}

/**
 * The context every user-scoped query needs.
 *
 * Bundling the client and user id together means each repository does one
 * guard-and-resolve step instead of repeating three checks.
 */
export type QueryContext = {
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;
  userId: string;
};

export type QueryContextResult =
  | { status: "ready"; context: QueryContext }
  | { status: "unconfigured" }
  | { status: "unauthenticated" };

export async function resolveQueryContext(): Promise<QueryContextResult> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { status: "unconfigured" };

  const account = await getAccountMode();
  if (account.mode !== "authenticated") return { status: "unauthenticated" };

  return {
    status: "ready",
    context: { supabase, userId: account.user.id },
  };
}

/**
 * Normalises a Supabase error into a message safe to render.
 *
 * Postgres error text can leak schema details, so anything unrecognised becomes
 * a generic line and the original is logged server-side.
 */
export function describeError(error: unknown, context: string): string {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[data:${context}]`, error);
  }
  return "We couldn't load this right now. Please try again shortly.";
}
