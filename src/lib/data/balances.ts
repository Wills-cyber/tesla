import "server-only";

import { EMPTY_BALANCE, type UserBalance } from "@/types/balance";
import type { Tables } from "@/types/database";

import {
  describeError,
  failed,
  ready,
  resolveQueryContext,
  type DataResult,
} from "./query-context";

function mapBalanceRow(row: Tables<"user_balances">): UserBalance {
  return {
    userId: row.user_id,
    currency: "USD",
    availableCents: row.available_cents,
    totalInvestedCents: row.total_invested_cents,
    totalProfitCents: row.total_profit_cents,
    pendingWithdrawalCents: row.pending_withdrawal_cents,
    updatedAt: row.updated_at,
  };
}

/**
 * A user's ledger position.
 *
 * The `user_balances` row is maintained server-side from settled transactions
 * (see the trigger in `supabase/migrations/0001_initial_schema.sql`), so the app
 * never computes or adjusts a balance itself. A newly created account has no row
 * yet, which is why a missing row resolves to an all-zero balance rather than an
 * error.
 */
export async function getUserBalance(): Promise<DataResult<UserBalance>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("user_balances")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return failed(describeError(error, "getUserBalance"));

  if (!data) {
    return ready({
      userId,
      updatedAt: new Date().toISOString(),
      ...EMPTY_BALANCE,
    });
  }

  return ready(mapBalanceRow(data));
}
