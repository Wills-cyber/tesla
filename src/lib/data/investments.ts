import "server-only";

import type { Tables } from "@/types/database";
import type {
  Investment,
  InvestmentPayment,
  InvestmentStatus,
} from "@/types/investment";

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

function mapPaymentRow(row: Tables<"investment_payments">): InvestmentPayment {
  return {
    id: row.id,
    investmentId: row.investment_id,
    periodIndex: row.period_index,
    amountCents: row.amount_cents,
    currency: "USD",
    status: row.status,
    dueAt: row.due_at,
    paidAt: row.paid_at,
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
): Promise<DataResult<InvestmentPayment[]>> {
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

  return ready(data.map(mapPaymentRow));
}

export type InvestmentWithPayments = Investment & {
  payments: InvestmentPayment[];
};

/**
 * Every position the user holds, each with its real payment schedule.
 *
 * One round trip for the investments and one for all their payments, joined in
 * memory — rather than N+1 queries. A period is only reported as paid because the
 * `investment_payments` row says so; nothing is derived from elapsed time or from
 * the plan's stated schedule.
 */
export async function getUserInvestmentsWithPayments(): Promise<
  DataResult<InvestmentWithPayments[]>
> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data: investmentRows, error: investmentError } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (investmentError) {
    return failed(describeError(investmentError, "getUserInvestmentsWithPayments"));
  }

  const investments = investmentRows.map(mapInvestmentRow);
  if (investments.length === 0) return ready([]);

  const { data: paymentRows, error: paymentError } = await supabase
    .from("investment_payments")
    .select("*")
    .in(
      "investment_id",
      investments.map((investment) => investment.id)
    )
    .order("period_index", { ascending: true });

  if (paymentError) {
    return failed(describeError(paymentError, "getUserInvestmentsWithPayments"));
  }

  const byInvestment = new Map<string, InvestmentPayment[]>();
  for (const row of paymentRows ?? []) {
    const payment = mapPaymentRow(row);
    const bucket = byInvestment.get(payment.investmentId);
    if (bucket) bucket.push(payment);
    else byInvestment.set(payment.investmentId, [payment]);
  }

  return ready(
    investments.map((investment) => ({
      ...investment,
      payments: byInvestment.get(investment.id) ?? [],
    }))
  );
}
