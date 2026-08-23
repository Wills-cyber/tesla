import "server-only";

import type {
  DepositAddress,
  DepositRecord,
  SavedAddress,
  WithdrawalRequest,
} from "@/types/crypto";
import { toDecimalString } from "@/lib/crypto/decimal";
import type { Tables } from "@/types/database";

import {
  describeError,
  failed,
  ready,
  resolveQueryContext,
  type DataResult,
} from "./query-context";

/**
 * Wallet records: issued deposit addresses, observed deposits, withdrawal
 * requests.
 *
 * There is no fallback in this module, on purpose. Every row here exists only
 * because something really happened on-chain or because the user really submitted
 * a request. Before Supabase is connected these return `unconfigured` and the UI
 * shows its empty state — which is the truth, not a placeholder.
 */

function mapDepositAddress(row: Tables<"deposit_addresses">): DepositAddress {
  return {
    methodId: row.method_id,
    address: row.address,
    memo: row.memo,
    uri: row.uri,
    expiresAt: row.expires_at,
  };
}

function mapDeposit(row: Tables<"deposits">): DepositRecord {
  const [assetSymbol = "", networkId = ""] = row.method_id.split("-");

  return {
    id: row.id,
    methodId: row.method_id,
    assetSymbol: assetSymbol.toUpperCase(),
    networkId,
    assetAmount: toDecimalString(row.asset_amount),
    creditedCents: row.credited_cents,
    status: row.status,
    txHash: row.tx_hash,
    confirmations: row.confirmations,
    requiredConfirmations: row.required_confirmations,
    createdAt: row.created_at,
    settledAt: row.settled_at,
  };
}

function mapWithdrawal(row: Tables<"withdrawal_requests">): WithdrawalRequest {
  const [assetSymbol = "", networkId = ""] = row.method_id.split("-");

  return {
    id: row.id,
    methodId: row.method_id,
    assetSymbol: assetSymbol.toUpperCase(),
    networkId,
    destinationAddress: row.destination_address,
    amountCents: row.amount_cents,
    // Normalised because PostgREST delivers `numeric` as a JSON number while
    // the generated types say `string`. Left unconverted, the first component to
    // call a string method on one of these throws mid-render.
    quotedAssetAmount: toDecimalString(row.quoted_asset_amount),
    quotedNetworkFee: toDecimalString(row.quoted_network_fee),
    quotedUsdPerUnit: toDecimalString(row.quoted_usd_per_unit),
    quoteProvider: row.quote_provider,
    quotedAt: row.quoted_at,
    serviceFeeCents: row.service_fee_cents ?? 0,
    totalDeductedCents: row.total_deducted_cents,
    status: row.status,
    txHash: row.tx_hash,
    failureReason: row.failure_reason,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    settledAt: row.settled_at,
  };
}

function mapSavedAddress(
  row: Tables<"saved_withdrawal_addresses">
): SavedAddress {
  return {
    id: row.id,
    methodId: row.method_id,
    label: row.label,
    address: row.address,
    memo: row.memo,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

/**
 * The deposit address already issued to this user for a pair, if any.
 *
 * Addresses are created by the payment provider and written by a server process —
 * the app only ever reads them. `null` means "none has been issued", which is why
 * the deposit panel shows no copyable field rather than an empty one.
 */
export async function getDepositAddress(
  methodId: string
): Promise<DataResult<DepositAddress | null>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("deposit_addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("method_id", methodId)
    .maybeSingle();

  if (error) return failed(describeError(error, "getDepositAddress"));

  return ready(data ? mapDepositAddress(data) : null);
}

export async function getUserDeposits(
  limit = 25
): Promise<DataResult<DepositRecord[]>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return failed(describeError(error, "getUserDeposits"));

  return ready(data.map(mapDeposit));
}

export async function getUserWithdrawals(
  limit = 25
): Promise<DataResult<WithdrawalRequest[]>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return failed(describeError(error, "getUserWithdrawals"));

  return ready(data.map(mapWithdrawal));
}

/**
 * One withdrawal, by id.
 *
 * The `user_id` filter is belt-and-braces: RLS already restricts the table to the
 * owner, so a request for someone else's id returns nothing regardless. Both are
 * kept because the status page is addressable by URL, and a page that leaks
 * another account's destination address on a guessed UUID would be a serious
 * failure — one guard is a policy, two is a design.
 *
 * `null` means "no such withdrawal for you", which the page renders as a
 * not-found rather than an error.
 */
export async function getWithdrawalById(
  id: string
): Promise<DataResult<WithdrawalRequest | null>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return failed(describeError(error, "getWithdrawalById"));

  return ready(data ? mapWithdrawal(data) : null);
}

/**
 * The user's saved destination addresses.
 *
 * Opt-in: a row exists here only because the user explicitly chose to save it.
 * Every entry carries its `method_id`, so the asset and network travel with the
 * address and no display can quietly omit the network.
 */
export async function getSavedAddresses(
  limit = 25
): Promise<DataResult<SavedAddress[]>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("saved_withdrawal_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return failed(describeError(error, "getSavedAddresses"));

  return ready(data.map(mapSavedAddress));
}
