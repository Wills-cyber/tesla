import "server-only";

import type { Tables } from "@/types/database";
import type { Transaction } from "@/types/transaction";

import {
  describeError,
  failed,
  ready,
  resolveQueryContext,
  type DataResult,
} from "./query-context";

function mapTransactionRow(row: Tables<"transactions">): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
    amountCents: row.amount_cents,
    currency: "USD",
    reference: row.reference,
    description: row.description,
    investmentId: row.investment_id,
    createdAt: row.created_at,
    settledAt: row.settled_at,
  };
}

export type TransactionQuery = {
  limit?: number;
  types?: Transaction["type"][];
};

/**
 * Account history.
 *
 * Rows exist only where value actually moved. Nothing in this build writes to
 * the table, so a connected-but-new account correctly returns an empty list.
 */
export async function getUserTransactions({
  limit = 50,
  types,
}: TransactionQuery = {}): Promise<DataResult<Transaction[]>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (types?.length) {
    query = query.in("type", types);
  }

  const { data, error } = await query;

  if (error) return failed(describeError(error, "getUserTransactions"));

  return ready(data.map(mapTransactionRow));
}
