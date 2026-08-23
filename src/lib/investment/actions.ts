"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { appRoutes } from "@/config/navigation";
import { featureFlags } from "@/config/site";
import { getAccountMode } from "@/lib/auth/session";
import { getInvestmentPlanBySlug, getUserBalance } from "@/lib/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/types";

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

  const [planResult, balanceResult] = await Promise.all([
    getInvestmentPlanBySlug(parsed.data.planSlug),
    getUserBalance(),
  ]);

  const plan = planResult.status === "ready" ? planResult.data : null;
  if (!plan) {
    return { status: "error", message: "That plan could not be found." };
  }

  if (plan.status !== "open") {
    return {
      status: "unavailable",
      message: `The ${plan.name} plan is not open for investment.`,
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

    if (spendableCents < plan.investmentAmountCents) {
      return {
        status: "error",
        message: "Insufficient wallet balance.",
        fieldErrors: {
          amount:
            `This plan needs ${formatCurrency(plan.investmentAmountCents)} and ` +
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
    p_plan_id: plan.id,
  });

  if (error) {
    console.error("[investment:activate]", error);

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
    if (error.code === "P0001" || error.code === "P0002") {
      return { status: "unavailable", message: error.message };
    }

    return {
      status: "error",
      message:
        "The investment was not created and your balance is unchanged. " +
        "Please try again, and contact support if it keeps failing.",
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
  revalidatePath(appRoutes.planDetail(plan.slug));
  revalidatePath(appRoutes.wallet);
  revalidatePath(appRoutes.walletActivity);
  revalidatePath(appRoutes.notifications);

  return {
    status: "success",
    message: `${plan.name} activated.`,
    redirectTo: appRoutes.investments,
  };
}
