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
import {
  depositAddressRequestSchema,
  usdStringToCents,
  withdrawalRequestSchema,
} from "@/lib/validations/wallet";
import type { ActionResult } from "@/types";
import type { ExchangeQuote, QuoteResult } from "@/types/crypto";

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
 * status, the enabled pair, the address format, the minimum and the spendable
 * balance inside Postgres, where the client cannot reach.
 */

function fieldError(
  message: string,
  fieldErrors: Record<string, string>
): ActionResult {
  return { status: "error", message, fieldErrors };
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

  const methodsResult = await getPaymentMethods();
  if (methodsResult.status !== "ready") {
    return {
      status: "error",
      message: "We couldn't load the supported networks. Please try again.",
    };
  }

  const method = methodsResult.data.find(
    (candidate) => candidate.id === parsed.data.methodId
  );

  // An unknown or disabled pair is refused outright: showing an address for a
  // pair the provider can't settle is how funds get sent into a void.
  if (!method) {
    return {
      status: "error",
      message: "That asset and network combination isn't supported.",
    };
  }

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

  const parsed = withdrawalRequestSchema
    .pick({ methodId: true, amountUsd: true })
    .safeParse({ methodId, amountUsd });

  if (!parsed.success) {
    return {
      status: "unavailable",
      reason: "Enter a valid amount to see the crypto equivalent.",
    };
  }

  const methodsResult = await getPaymentMethods();
  if (methodsResult.status !== "ready") {
    return { status: "unavailable", reason: "Supported networks unavailable." };
  }

  const method = methodsResult.data.find(
    (candidate) => candidate.id === parsed.data.methodId
  );
  if (!method) {
    return {
      status: "unavailable",
      reason: "That asset and network combination isn't supported.",
    };
  }

  return getRateProvider().quoteUsdToAsset({
    method,
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
 *   1. Schema — including the explicit address/network confirmation.
 *   2. Authenticated user.
 *   3. Asset/network pair exists and is enabled for withdrawal.
 *   4. Destination address matches that chain's format.
 *   5. Amount clears the platform minimum (and the pair's own, if higher).
 *   6. Amount is covered by the spendable balance (available − already pending).
 *   7. A live, unexpired quote exists for the amount.
 *   8. `request_withdrawal` re-validates 2–6 inside Postgres and writes the row.
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
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return fieldError("Please correct the highlighted fields.", fieldErrors);
  }

  const { methodId, amountUsd, destinationAddress } = parsed.data;
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
  const [methodsResult, policyResult, balanceResult] = await Promise.all([
    getPaymentMethods(),
    getWithdrawalPolicy(),
    getUserBalance(),
  ]);

  if (methodsResult.status !== "ready" || policyResult.status !== "ready") {
    return {
      status: "error",
      message: "We couldn't load withdrawal settings. Please try again.",
    };
  }

  const method = methodsResult.data.find(
    (candidate) => candidate.id === methodId
  );
  if (!method) {
    return fieldError("Choose a supported asset and network.", {
      methodId: "That asset and network combination isn't supported.",
    });
  }

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

  /* 6 — spendable balance */
  const balance =
    balanceResult.status === "ready" ? balanceResult.data : null;
  const spendableCents = balance
    ? balance.availableCents - balance.pendingWithdrawalCents
    : 0;

  if (amountCents > spendableCents) {
    return fieldError("That amount is more than you can withdraw.", {
      amountUsd:
        `Your available balance is $${(spendableCents / 100).toFixed(2)}. ` +
        `Funds reserved by a pending withdrawal can't be requested twice.`,
    });
  }

  /* 7 — a live quote */
  const quoteResult = await getRateProvider().quoteUsdToAsset({
    method,
    usdCents: amountCents,
  });

  if (quoteResult.status !== "ready") {
    return { status: "unavailable", message: quoteResult.reason };
  }

  const quote: ExchangeQuote = quoteResult.quote;
  if (new Date(quote.expiresAt).getTime() <= Date.now()) {
    return {
      status: "error",
      message: "That quote expired. Review the amount and try again.",
    };
  }

  /* 8 — the database re-validates everything and writes the row */
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
    p_quote_provider: quote.provider,
    p_quoted_at: quote.quotedAt,
  });

  if (error) {
    console.error("[wallet:submitWithdrawal]", error);
    return {
      status: "error",
      message:
        "The withdrawal was not created. Your balance is unchanged. " +
        "Please try again, and contact support if it keeps failing.",
    };
  }

  revalidatePath(appRoutes.wallet);
  revalidatePath(appRoutes.walletActivity);

  return {
    status: "success",
    message: `Withdrawal request submitted. Reference ${String(data?.id ?? "")
      .slice(0, 8)
      .toUpperCase()}.`,
  };
}
