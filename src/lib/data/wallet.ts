import "server-only";

import type {
  DepositAddress,
  DepositRecord,
  WithdrawalRequest,
} from "@/types/crypto";
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
    assetAmount: row.asset_amount,
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
    quotedAssetAmount: row.quoted_asset_amount,
    quotedNetworkFee: row.quoted_network_fee,
    status: row.status,
    txHash: row.tx_hash,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    settledAt: row.settled_at,
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
