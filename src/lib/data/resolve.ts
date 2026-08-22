import "server-only";

import type { DataResult } from "@/types";

/**
 * Collapses a `DataResult` into something a page can render directly.
 *
 * The `unconfigured` and `unauthenticated` states both mean "there is genuinely
 * nothing to show", so they resolve to the supplied empty value rather than an
 * error — the UI then renders its empty state, which is the honest outcome. Only
 * a real failure produces an error message.
 */
export function resolveOrEmpty<T>(
  result: DataResult<T>,
  empty: T
): { data: T; error: string | null } {
  if (result.status === "ready") return { data: result.data, error: null };
  if (result.status === "error") return { data: empty, error: result.message };
  return { data: empty, error: null };
}
