import "server-only";

import { ADMIN_USER_ID, usdtDepositNetworks } from "@/config/crypto";
import { toDecimalString } from "@/lib/crypto/decimal";
import type {
  DepositAddress,
  DepositRecord,
  DepositRecordStatus,
  SavedAddress,
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
 * requests, and admin deposit reviews.
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
  const [assetSymbol = "USDT", networkId = "bsc"] = row.method_id.split("-");

  const depositConfig = usdtDepositNetworks[row.method_id as keyof typeof usdtDepositNetworks];
  const receivingAddress = row.receiving_address || depositConfig?.receivingAddress || "0xDBC37A710fc680A8f511e71A7933E1c2d2C54531";

  const amountCents = row.amount_cents != null
    ? row.amount_cents
    : row.asset_amount != null
    ? Math.round(Number(row.asset_amount) * 100)
    : 0;

  return {
    id: row.id,
    userId: row.user_id,
    methodId: row.method_id,
    assetSymbol: assetSymbol.toUpperCase(),
    networkId,
    amountCents,
    assetAmount: toDecimalString(row.asset_amount) ?? (amountCents / 100).toFixed(2),
    creditedCents: row.credited_cents,
    status: row.status as DepositRecordStatus,
    receivingAddress,
    reference: row.reference || `DEP-${row.id.slice(0, 8).toUpperCase()}`,
    expiresAt: row.expires_at,
    receiptUrl: row.receipt_url,
    receiptPath: row.receipt_path,
    receiptSubmittedAt: row.receipt_submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    rejectionReason: row.rejection_reason,
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

/**
 * Get a specific deposit by ID for the signed-in user or admin.
 */
export async function getDepositById(
  id: string
): Promise<DataResult<DepositRecord | null>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  // If admin, can view any deposit; otherwise only user's own deposit
  const isAdminUser = userId === ADMIN_USER_ID;

  let query = supabase.from("deposits").select("*").eq("id", id);
  if (!isAdminUser) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) return failed(describeError(error, "getDepositById"));
  if (!data) return ready(null);

  // If deposit is pending and expired, check if we need to auto-mark it as expired
  if (
    data.status === "pending" &&
    data.expires_at &&
    new Date(data.expires_at).getTime() < Date.now()
  ) {
    await supabase
      .from("deposits")
      .update({ status: "expired" })
      .eq("id", id)
      .eq("status", "pending");
    data.status = "expired";
  }

  return ready(mapDeposit(data));
}

/**
 * Find any active pending deposit for the signed-in user.
 * Returns the most recent deposit that is still in `pending` status and not yet expired.
 */
export async function getActivePendingDeposit(): Promise<DataResult<DepositRecord | null>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return failed(describeError(error, "getActivePendingDeposit"));
  if (!data) return ready(null);

  return ready(mapDeposit(data));
}

/**
 * Admin: Get all deposits with user details for admin review.
 */
export async function getAdminDeposits(
  statusFilter?: string
): Promise<DataResult<DepositRecord[]>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  // Check admin authorization
  const isAdminUser = userId === ADMIN_USER_ID;
  if (!isAdminUser) {
    const { data: isDbAdmin } = await supabase.rpc("is_admin", {});
    if (!isDbAdmin) {
      return failed("Not authorized to view admin deposits.");
    }
  }

  // Try the RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "admin_get_deposits",
      { p_status: statusFilter && statusFilter !== "all" ? statusFilter : null }
    );

    if (!rpcError && rpcData) {
      const records: DepositRecord[] = rpcData.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        userFullName: row.user_full_name,
        methodId: row.method_id,
        assetSymbol: row.asset_symbol || "USDT",
        networkId: row.method_id.includes("bsc") ? "bsc" : "ethereum",
        amountCents: Number(row.amount_cents) || Math.round(Number(row.asset_amount || 0) * 100),
        assetAmount: toDecimalString(row.asset_amount) ?? (Number(row.amount_cents) / 100).toFixed(2),
        creditedCents: row.credited_cents,
        status: row.status as DepositRecordStatus,
        receivingAddress: row.receiving_address || "0xDBC37A710fc680A8f511e71A7933E1c2d2C54531",
        reference: row.reference || `DEP-${row.id.slice(0, 8).toUpperCase()}`,
        expiresAt: row.expires_at,
        receiptUrl: row.receipt_url,
        receiptPath: row.receipt_path,
        receiptSubmittedAt: row.receipt_submitted_at,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        rejectionReason: row.rejection_reason,
        txHash: null,
        confirmations: null,
        requiredConfirmations: null,
        createdAt: row.created_at,
        settledAt: row.settled_at,
      }));
      return ready(records);
    }
  } catch {
    // Fallback to table query if RPC is not available yet
  }

  // Direct table query fallback
  let query = supabase
    .from("deposits")
    .select("*, profiles!deposits_user_id_fkey(email, full_name)")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter as Tables<"deposits">["status"]);
  }

  const { data, error } = await query;
  if (error) return failed(describeError(error, "getAdminDeposits"));

  const records: DepositRecord[] = (data || []).map((row) => {
    const profile = (row as unknown as { profiles?: { email?: string; full_name?: string } }).profiles;
    const base = mapDeposit(row);
    return {
      ...base,
      userEmail: profile?.email || null,
      userFullName: profile?.full_name || null,
    };
  });

  return ready(records);
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
