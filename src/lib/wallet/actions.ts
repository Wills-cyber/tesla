"use server";

import { revalidatePath } from "next/cache";

import { appRoutes } from "@/config/navigation";
import { isValidAddressForMethod } from "@/config/crypto";
import { getAccountMode } from "@/lib/auth/session";
import {
  getPaymentMethods,
  getUserBalance,
  getWithdrawalPolicy,
} from "@/lib/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getRateProvider } from "@/lib/quotes/rate-provider";
import { computeWithdrawalCosts, isQuoteExpired } from "@/lib/wallet/costs";
import { shortReference } from "@/lib/format";
import {
  depositAddressRequestSchema,
  savedAddressIdSchema,
  savedAddressSchema,
  usdStringToCents,
  withdrawalIdSchema,
  withdrawalQuoteSchema,
  withdrawalRequestSchema,
} from "@/lib/validations/wallet";
import type { ActionResult } from "@/types";
import type { ExchangeQuote, PaymentMethod, QuoteResult } from "@/types/crypto";

/**
 * Wallet Server Actions.
 *
 * These are the *only* way the browser can ask the platform to move money, and
 * they are the security boundary. Three things follow from that:
 *
 *   1. Nothing in this file trusts its input. Every action re-parses with the same
 *      Zod schema the form used, then re-derives the payment method, the policy
 *      and the balance from the server, ignoring anything the client asserted.
 *   2. No action ever reports success it did not achieve. Where a capability
 *      genuinely isn't connected, the result is `unavailable` with a precise
 *      reason — never a fake confirmation, and never a balance change.
 *   3. No signing key, provider credential or custody secret is read, returned or
 *      referenced here. Broadcasting a transaction is the payment provider's job,
 *      driven by a server-side worker that reads `pending` withdrawal rows.
 *
 * The database is the last line: `request_withdrawal` re-validates account
 * status, the enabled pair, the address format, the minimum, the maximum, the
 * service fee and the spendable balance inside Postgres, where the client cannot
 * reach.
 */

function fieldError(
  message: string,
  fieldErrors: Record<string, string>
): ActionResult {
  return { status: "error", message, fieldErrors };
}

/**
 * Collapses Zod issues into one message per field.
 *
 * First issue wins: showing a field three complaints at once tells the user less
 * than showing them the first thing to fix.
 */
function collectFieldErrors(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

/** The pair, re-derived server-side. The client's claim about it is ignored. */
async function resolveMethod(
  methodId: string
): Promise<
  | { ok: true; method: PaymentMethod }
  | { ok: false; result: ActionResult }
> {
  const methodsResult = await getPaymentMethods();

  if (methodsResult.status !== "ready") {
    return {
      ok: false,
      result: {
        status: "error",
        message: "We couldn't load the supported networks. Please try again.",
      },
    };
  }

  const method = methodsResult.data.find(
    (candidate) => candidate.id === methodId
  );

  if (!method) {
    return {
      ok: false,
      result: fieldError("Choose a supported asset and network.", {
        methodId: "That asset and network combination isn't supported.",
      }),
    };
  }

  return { ok: true, method };
}

/* ------------------------------------------------------------------ Deposits */

/**
 * Asks for the deposit address for an asset/network pair.
 *
 * Addresses are issued by the payment provider and written to
 * `deposit_addresses` by a server process — this action never generates one. With
 * no provider connected there is nothing to return, so the UI is told plainly
 * rather than shown an empty box that looks like a loading failure.
 */
export async function requestDepositAddressAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = depositAddressRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "Choose an asset and network first." };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message:
        "Accounts aren't live yet. Once Supabase Auth is connected, deposit " +
        "addresses will be issued to your account.",
    };
  }

  const resolved = await resolveMethod(parsed.data.methodId);
  if (!resolved.ok) return resolved.result;
  const { method } = resolved;

  if (!method.depositEnabled) {
    return {
      status: "unavailable",
      message:
        `Deposits on ${method.asset.symbol} · ${method.network.protocol} are not ` +
        `enabled yet. No payment provider is connected, so no deposit address ` +
        `exists and nothing can be credited.`,
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "unavailable",
      message: "The backend isn't connected, so no deposit address can be issued.",
    };
  }

  const { data, error } = await supabase
    .from("deposit_addresses")
    .select("id")
    .eq("user_id", account.user.id)
    .eq("method_id", method.id)
    .maybeSingle();

  if (error) {
    console.error("[wallet:requestDepositAddress]", error);
    return {
      status: "error",
      message: "We couldn't check your deposit address. Please try again.",
    };
  }

  if (!data) {
    return {
      status: "unavailable",
      message:
        "No deposit address has been issued for this network yet. Addresses are " +
        "created by the payment provider, which isn't connected.",
    };
  }

  revalidatePath(appRoutes.wallet);
  return { status: "success", message: "Deposit address ready." };
}

/* --------------------------------------------------------------------- Quotes */

/**
 * Live USD → crypto quote for the withdrawal form.
 *
 * Runs on the server because the rate has to come from a provider the platform
 * trusts, not from the browser. Returns `unavailable` while no provider is
 * configured — a plausible placeholder rate would be a number the payout rail
 * would not honour.
 */
export async function quoteWithdrawalAction(
  methodId: unknown,
  amountUsd: unknown
): Promise<QuoteResult> {
  if (typeof methodId !== "string" || typeof amountUsd !== "string") {
    return { status: "unavailable", reason: "Enter an amount to see a quote." };
  }

  const parsed = withdrawalQuoteSchema.safeParse({ methodId, amountUsd });
  if (!parsed.success) {
    return {
      status: "unavailable",
      reason: "Enter a valid amount to see the crypto equivalent.",
    };
  }

  const resolved = await resolveMethod(parsed.data.methodId);
  if (!resolved.ok) {
    return {
      status: "unavailable",
      reason: "That asset and network combination isn't supported.",
    };
  }

  return getRateProvider().quoteUsdToAsset({
    method: resolved.method,
    usdCents: usdStringToCents(parsed.data.amountUsd),
  });
}

/* ----------------------------------------------------------------- Withdrawals */

/**
 * Submits a withdrawal request.
 *
 * The full server-side check list, in order. Each step reads from the server, not
 * from the submitted payload:
 *
 *    1. Schema — including the explicit address/network confirmation.
 *    2. Authenticated user.
 *    3. Asset/network pair exists and is enabled for withdrawal.
 *    4. Destination address matches that chain's format.
 *    5. Amount clears the platform minimum (and the pair's own, if higher).
 *    6. Amount is within the platform maximum, when one is configured.
 *    7. Service fee is derived from policy, and the *total* is covered by the
 *       spendable balance (available − already pending).
 *    8. A live, unexpired quote exists for the amount.
 *    9. `request_withdrawal` re-validates 2–7 inside Postgres and writes the row.
 *   10. Only after the row exists is an opt-in address book entry written.
 *
 * Any step that cannot be satisfied stops the request. Nothing is written, no
 * balance moves, and the reason is returned verbatim.
 */
export async function submitWithdrawalAction(
  values: unknown
): Promise<ActionResult> {
  /* 1 — schema */
  const parsed = withdrawalRequestSchema.safeParse(values);
  if (!parsed.success) {
    return fieldError(
      "Please correct the highlighted fields.",
      collectFieldErrors(parsed.error.issues)
    );
  }

  const {
    methodId,
    amountUsd,
    destinationAddress,
    saveAddress,
    addressLabel,
  } = parsed.data;
  const amountCents = usdStringToCents(amountUsd);

  /* 2 — authenticated user */
  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message:
        "Accounts aren't live yet. Once Supabase Auth is connected, withdrawal " +
        "requests will be tied to your verified account.",
    };
  }

  /* 3 — the pair exists and payouts are enabled on it */
  const [resolved, policyResult, balanceResult] = await Promise.all([
    resolveMethod(methodId),
    getWithdrawalPolicy(),
    getUserBalance(),
  ]);

  if (!resolved.ok) return resolved.result;
  if (policyResult.status !== "ready") {
    return {
      status: "error",
      message: "We couldn't load withdrawal settings. Please try again.",
    };
  }

  const { method } = resolved;
  const policy = policyResult.data;

  if (!policy.withdrawalsEnabled || !method.withdrawalEnabled) {
    return {
      status: "unavailable",
      message:
        `Withdrawals on ${method.asset.symbol} · ${method.network.protocol} are ` +
        `not enabled yet. No payout provider is connected, so this request has ` +
        `not been created and your balance is unchanged.`,
    };
  }

  /* 4 — address format for this specific chain */
  if (!isValidAddressForMethod(method, destinationAddress)) {
    return fieldError("Check the destination address.", {
      destinationAddress:
        `That isn't a valid ${method.network.name} address. Sending to an ` +
        `address from a different network would permanently lose the funds.`,
    });
  }

  /* 5 — minimum */
  const minimumCents = Math.max(
    policy.minimumCents,
    method.minWithdrawalCents ?? 0
  );
  if (amountCents < minimumCents) {
    return fieldError("That amount is below the minimum.", {
      amountUsd: `The minimum withdrawal is $${(minimumCents / 100).toFixed(2)}.`,
    });
  }

  /* 6 — maximum, only if one is configured */
  if (policy.maximumCents !== null && amountCents > policy.maximumCents) {
    return fieldError("That amount is above the maximum.", {
      amountUsd: `The maximum withdrawal is $${(policy.maximumCents / 100).toFixed(2)}.`,
    });
  }

  /* 7 — service fee, then the spendable balance against the TOTAL */
  const costsWithoutQuote = computeWithdrawalCosts({
    amountCents,
    serviceFeeBps: policy.serviceFeeBps,
    quote: null,
  });

  const balance = balanceResult.status === "ready" ? balanceResult.data : null;
  const spendableCents = balance
    ? Math.max(0, balance.availableCents - balance.pendingWithdrawalCents)
    : 0;

  if (costsWithoutQuote.totalDeductedCents > spendableCents) {
    const feeNote =
      costsWithoutQuote.serviceFeeCents > 0
        ? ` including a $${(costsWithoutQuote.serviceFeeCents / 100).toFixed(2)} service fee`
        : "";

    return fieldError("That amount is more than you can withdraw.", {
      amountUsd:
        `Your available balance is $${(spendableCents / 100).toFixed(2)}, and ` +
        `this withdrawal needs $${(costsWithoutQuote.totalDeductedCents / 100).toFixed(2)}${feeNote}. ` +
        `Funds reserved by a pending withdrawal can't be requested twice.`,
    });
  }

  /* 8 — a live quote */
  const quoteResult = await getRateProvider().quoteUsdToAsset({
    method,
    usdCents: amountCents,
  });

  if (quoteResult.status !== "ready") {
    return { status: "unavailable", message: quoteResult.reason };
  }

  const quote: ExchangeQuote = quoteResult.quote;
  if (isQuoteExpired(quote)) {
    return {
      status: "error",
      message: "That quote expired. Review the amount and try again.",
    };
  }

  /* 9 — the database re-validates everything and writes the row */
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "unavailable",
      message: "The backend isn't connected, so no withdrawal can be recorded.",
    };
  }

  const { data, error } = await supabase.rpc("request_withdrawal", {
    p_method_id: method.id,
    p_amount_cents: amountCents,
    p_destination_address: destinationAddress,
    p_quoted_asset_amount: quote.netAssetAmount,
    p_quoted_network_fee: quote.networkFee,
    p_quoted_usd_per_unit: quote.usdPerUnit,
    p_quote_provider: quote.provider,
    p_quoted_at: quote.quotedAt,
  });

  if (error || !data?.id) {
    console.error("[wallet:submitWithdrawal]", error);
    return {
      status: "error",
      message:
        "The withdrawal was not created. Your balance is unchanged. " +
        "Please try again, and contact support if it keeps failing.",
    };
  }

  /* 10 — the address book entry, only if it was asked for */
  if (saveAddress && addressLabel) {
    // A failure here is not a failure of the withdrawal. The money movement is
    // already recorded; a missing bookmark is a inconvenience, so it is logged
    // and the success is still reported rather than muddying the outcome.
    const { error: saveError } = await supabase
      .from("saved_withdrawal_addresses")
      .insert({
        user_id: account.user.id,
        method_id: method.id,
        label: addressLabel,
        address: destinationAddress,
      });

    if (saveError) {
      console.error("[wallet:submitWithdrawal] saving address failed", saveError);
    }
  }

  revalidatePath(appRoutes.wallet);
  revalidatePath(appRoutes.walletActivity);
  revalidatePath(appRoutes.withdraw);

  return {
    status: "success",
    message: `Withdrawal request submitted. Reference ${shortReference(data.id)}.`,
    redirectTo: appRoutes.withdrawalDetail(data.id),
  };
}

/**
 * Cancels a pending withdrawal and releases the reserved funds.
 *
 * Everything that matters happens in `cancel_withdrawal`: ownership, the
 * `pending`-only rule, and marking the reserving ledger row `cancelled` so the
 * balance recalculation releases the reservation. Once the provider has picked a
 * request up the platform can no longer promise nothing was broadcast, so the
 * database refuses and that refusal is surfaced as-is.
 */
export async function cancelWithdrawalAction(
  id: unknown
): Promise<ActionResult> {
  const parsed = withdrawalIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { status: "error", message: "That withdrawal reference isn't valid." };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message: "Sign in to manage your withdrawals.",
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "unavailable",
      message: "The backend isn't connected, so nothing can be cancelled.",
    };
  }

  const { error } = await supabase.rpc("cancel_withdrawal", {
    p_withdrawal_id: parsed.data.id,
  });

  if (error) {
    console.error("[wallet:cancelWithdrawal]", error);
    return {
      status: "error",
      message:
        "We couldn't cancel this withdrawal. It may already be processing, in " +
        "which case it can no longer be stopped.",
    };
  }

  revalidatePath(appRoutes.wallet);
  revalidatePath(appRoutes.walletActivity);
  revalidatePath(appRoutes.withdrawalDetail(parsed.data.id));

  return {
    status: "success",
    message: "Withdrawal cancelled. The reserved funds are available again.",
  };
}

/* ------------------------------------------------------------ Saved addresses */

/**
 * Saves a destination address to the user's address book.
 *
 * Explicit by construction — there is no code path that saves an address as a
 * side effect of anything else. The address is stored exactly as submitted (bar
 * the surrounding whitespace the schema trims), because silently normalising a
 * destination is how a user ends up verifying one string and paying out to
 * another.
 *
 * The format is re-checked against the chain here even though this row cannot
 * move money: an address book that accepts a Tron address under "Ethereum" would
 * hand the user a wrong-network mistake pre-made.
 */
export async function saveWithdrawalAddressAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = savedAddressSchema.safeParse(values);
  if (!parsed.success) {
    return fieldError(
      "Please correct the highlighted fields.",
      collectFieldErrors(parsed.error.issues)
    );
  }

  const { methodId, label, address } = parsed.data;

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message: "Sign in to save withdrawal addresses to your account.",
    };
  }

  const resolved = await resolveMethod(methodId);
  if (!resolved.ok) return resolved.result;
  const { method } = resolved;

  if (!isValidAddressForMethod(method, address)) {
    return fieldError("Check the address.", {
      address: `That isn't a valid ${method.network.name} address.`,
    });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "unavailable",
      message: "The backend isn't connected, so this address can't be saved.",
    };
  }

  const { error } = await supabase.from("saved_withdrawal_addresses").insert({
    user_id: account.user.id,
    method_id: method.id,
    label,
    address,
  });

  if (error) {
    console.error("[wallet:saveWithdrawalAddress]", error);

    // The unique constraint is the expected failure, and it is not really a
    // failure: the address is already saved, which is what the user wanted.
    if (error.code === "23505") {
      return {
        status: "error",
        message: "That address is already saved for this network.",
      };
    }

    return {
      status: "error",
      message: "We couldn't save that address. Please try again.",
    };
  }

  revalidatePath(appRoutes.withdraw);
  return { status: "success", message: "Address saved." };
}

/** Removes a saved address. RLS scopes the delete to its owner. */
export async function deleteSavedAddressAction(
  id: unknown
): Promise<ActionResult> {
  const parsed = savedAddressIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { status: "error", message: "That saved address reference isn't valid." };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message: "Sign in to manage your saved addresses.",
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "unavailable",
      message: "The backend isn't connected, so nothing can be removed.",
    };
  }

  const { error } = await supabase
    .from("saved_withdrawal_addresses")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", account.user.id);

  if (error) {
    console.error("[wallet:deleteSavedAddress]", error);
    return {
      status: "error",
      message: "We couldn't remove that address. Please try again.",
    };
  }

  revalidatePath(appRoutes.withdraw);
  return { status: "success", message: "Address removed." };
}
