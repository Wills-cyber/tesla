import "server-only";

import type { Tables } from "@/types/database";
import type { Investment, InvestmentStatus } from "@/types/investment";

import {
  describeError,
  failed,
  ready,
  resolveQueryContext,
  type DataResult,
} from "./query-context";

/**
 * A user's investment positions.
 *
 * There is no fallback here on purpose. Before Supabase is connected this
 * returns `unconfigured`, and the UI shows an empty state — an account with no
 * backend has no positions, and inventing one would be a lie.
 */

function mapInvestmentRow(row: Tables<"investments">): Investment {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    principalCents: row.principal_cents,
    currency: "USD",
    startedAt: row.started_at,
    maturesAt: row.matures_at,
    paidProfitCents: row.paid_profit_cents,
    periodsPaid: row.periods_paid,
    createdAt: row.created_at,
  };
}

const ACTIVE_STATUSES: readonly InvestmentStatus[] = [
  "pending_activation",
  "active",
];

export async function getUserInvestments(): Promise<DataResult<Investment[]>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return failed(describeError(error, "getUserInvestments"));

  return ready(data.map(mapInvestmentRow));
}

export async function getActiveInvestment(): Promise<
  DataResult<Investment | null>
> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .in("status", [...ACTIVE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return failed(describeError(error, "getActiveInvestment"));

  return ready(data ? mapInvestmentRow(data) : null);
}

export async function getInvestmentPayments(
  investmentId: string
): Promise<DataResult<Tables<"investment_payments">[]>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase } = resolved.context;

  // RLS scopes this to the caller's own investments; no user filter needed.
  const { data, error } = await supabase
    .from("investment_payments")
    .select("*")
    .eq("investment_id", investmentId)
    .order("period_index", { ascending: true });

  if (error) return failed(describeError(error, "getInvestmentPayments"));

  return ready(data);
}
