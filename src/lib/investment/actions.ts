"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { appRoutes } from "@/config/navigation";
import { featureFlags } from "@/config/site";
import { getAccountMode } from "@/lib/auth/session";
import { getDatabasePlanBySlug, getUserBalance } from "@/lib/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import type { ActionResult, Tables } from "@/types";

/**
 * Investment Server Actions.
 *
 * The only way an investment is ever created. Three properties matter:
 *
 *   1. **Nothing is trusted from the browser.** The action takes a plan *slug* and
 *      nothing more — no amount, no duration, no profit figure, no user id. Every
 *      number comes from the `investment_plans` row, and the user comes from the
 *      session. There is deliberately no parameter through which a caller could
 *      name its own price or act for someone else.
 *   2. **The database decides, not this file.** `activate_investment` re-checks the
 *      plan is open and the balance covers the entry amount inside Postgres, then
 *      writes the investment, the ledger debit and the payment schedule as one
 *      transaction. The checks below exist to produce a *good error message*, not
 *      to authorise anything — if they disagreed with the database, the database
 *      wins and nothing is written.
 *   3. **No fabricated state.** The balance moves because a `transactions` row was
 *      inserted and the ledger trigger recomputed it. This action never writes
 *      `user_balances`, never marks a payment paid, and never credits profit.
 *   4. **The plan id comes from the database, always.** The static catalogue's ids
 *      are synthetic strings (`plan-model-3-starter-001`) that are not valid
 *      `uuid`s. Activation re-reads the plan row by slug from
 *      `public.investment_plans` and passes its real `id` to the RPC — a
 *      catalogue plan can never reach `activate_investment`.
 */

const activateSchema = z.object({
  planSlug: z
    .string()
    .trim()
    .min(1, "Choose a plan.")
    .max(80)
    // The slug reaches Postgres as a lookup key; constraining the charset here
    // keeps anything exotic from getting that far.
    .regex(/^[a-z0-9-]+$/, "That plan reference isn't valid."),
});

/**
 * Canonical hyphenated UUID shape (8-4-4-4-12 hex digits), the form PostgreSQL
 * stores and returns. Deliberately version-agnostic: any real uuid column value
 * qualifies, while a synthetic catalogue id never can.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

type DatabaseErrorLike = {
  code?: string | null;
  message: string;
  details?: string | null;
  hint?: string | null;
};

/**
 * Logs the full Postgres error for an activation failure. The client only ever
 * sees a safe summary; the code, message, details and hint stay server-side.
 */
function logDatabaseError(error: DatabaseErrorLike, context: string): void {
  console.error(`[investment:${context}]`, {
    code: error.code ?? null,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

/**
 * Activates a plan for the signed-in user.
 *
 * Returns `unavailable` (not `error`) when the capability itself is off, so the UI
 * can distinguish "this cannot be done yet" from "this failed".
 */
export async function activateInvestmentAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = activateSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "That plan reference isn't valid." };
  }

  if (!featureFlags.investmentActivationEnabled) {
    return {
      status: "unavailable",
      message:
        "Investment activation is not enabled yet. Nothing has been created and " +
        "your balance is unchanged.",
    };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message: "Sign in to activate an investment.",
    };
  }

  /*
   * The plan id for the RPC is read directly from `investment_plans` by slug.
   * `getInvestmentPlanBySlug` may legitimately serve the static catalogue for
   * display, but its ids are synthetic strings; activation must never use one.
   * This lookup has no fallback, so `dbPlan` is either a real database row or
   * nothing at all.
   */
  const [planResult, balanceResult] = await Promise.all([
    getDatabasePlanBySlug(parsed.data.planSlug),
    getUserBalance(),
  ]);

  if (planResult.status !== "ready") {
    // `getDatabasePlanBySlug` already logged the underlying failure with code,
    // message, details and hint. No synthetic plan is substituted here.
    return {
      status: "error",
      message: "Investment activation failed. Please try again.",
    };
  }

  const dbPlan: Tables<"investment_plans"> | null = planResult.data;
  if (!dbPlan) {
    return {
      status: "error",
      message:
        "This investment plan is not available in the database. Please refresh and try again.",
    };
  }

  /*
   * Strict UUID guard before the RPC call. `p_plan_id` is a Postgres `uuid`;
   * passing anything else (a synthetic catalogue id included) fails inside
   * Postgres with an obscure error. If the database ever returns a non-uuid
   * here, stop before the RPC and log it.
   */
  if (!isUuid(dbPlan.id)) {
    logDatabaseError(
      {
        code: "22P02",
        message:
          `investment_plans.id "${dbPlan.id}" (slug "${dbPlan.slug}") is not a valid UUID; ` +
          "refusing to call activate_investment.",
      },
      "plan-id-invalid"
    );
    return {
      status: "error",
      message:
        "Investment activation aborted: the plan id from the database is not a valid UUID.",
    };
  }

  if (dbPlan.status !== "open") {
    return {
      status: "unavailable",
      message: `The ${dbPlan.name} plan is not open for investment.`,
    };
  }

  /*
   * The balance pre-check.
   *
   * Purely so the user gets the exact shortfall instead of a generic refusal.
   * `activate_investment` performs the same comparison against the same derived
   * table, and a race between the two resolves in the database's favour.
   *
   * Funds reserved by a pending withdrawal are excluded: the same dollar must not
   * be able to back both a payout request and an investment.
   */
  if (balanceResult.status === "ready") {
    const { availableCents, pendingWithdrawalCents } = balanceResult.data;
    const spendableCents = Math.max(0, availableCents - pendingWithdrawalCents);

    if (spendableCents < dbPlan.investment_amount_cents) {
      return {
        status: "error",
        message: "Insufficient wallet balance.",
        fieldErrors: {
          amount:
            `This plan needs ${formatCurrency(dbPlan.investment_amount_cents)} and ` +
            `${formatCurrency(spendableCents)} is available.`,
        },
      };
    }
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "unavailable",
      message: "The backend isn't connected, so no investment can be recorded.",
    };
  }

  const { data, error } = await supabase.rpc("activate_investment", {
    p_plan_id: dbPlan.id,
  });

  if (error) {
    logDatabaseError(error, "activate");

    // P0004 is the insufficient-funds signal raised by `activate_investment`. Its
    // message is written for the account holder and already carries both figures,
    // so it is surfaced as-is rather than replaced with something vaguer.
    if (error.code === "P0004") {
      return {
        status: "error",
        message: "Insufficient wallet balance.",
        fieldErrors: { amount: error.message },
      };
    }
    if (error.code === "P0001" || error.code === "P0002" || error.code === "P0003") {
      return { status: "unavailable", message: error.message };
    }

    // Unexpected RPC failure. The full error — code, message, details, hint — was
    // logged above; the client gets a safe, useful summary instead of the old
    // generic line that hid every failure behind "balance unchanged".
    return {
      status: "error",
      message: "Investment activation failed. Please try again.",
    };
  }

  const created = Array.isArray(data) ? data[0] : data;
  if (!created?.investment_id) {
    // Belt to the braces above: no row back means no investment, and reporting
    // success here would be the exact failure this whole file is written to avoid.
    return {
      status: "error",
      message:
        "The investment could not be confirmed. Please check your Investments " +
        "page before trying again.",
    };
  }

  // Every surface that reads the balance, the positions or the ledger.
  revalidatePath(appRoutes.dashboard);
  revalidatePath(appRoutes.investments);
  revalidatePath(appRoutes.invest);
  revalidatePath(appRoutes.planDetail(dbPlan.slug));
  revalidatePath(appRoutes.wallet);
  revalidatePath(appRoutes.walletActivity);
  revalidatePath(appRoutes.notifications);

  return {
    status: "success",
    message: `${dbPlan.name} activated.`,
    redirectTo: appRoutes.investments,
    investmentId: created.investment_id,
    reference: created.reference,
  };
}
