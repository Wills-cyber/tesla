"use server";

import { revalidatePath } from "next/cache";

import {
  ADMIN_USER_ID,
  isValidAddressForMethod,
  MAX_DEPOSIT_CENTS,
  MIN_DEPOSIT_CENTS,
  RECEIVING_WALLET_ADDRESS,
  usdtDepositNetworks,
} from "@/config/crypto";
import { appRoutes } from "@/config/navigation";
import { getAccountMode } from "@/lib/auth/session";
import {
  getPaymentMethods,
  getUserBalance,
  getWithdrawalPolicy,
} from "@/lib/data";
import { shortReference } from "@/lib/format";
import { getRateProvider } from "@/lib/quotes/rate-provider";
import { computeWithdrawalCosts } from "@/lib/wallet/costs";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseReceiptPath,
  RECEIPT_BUCKET,
  RECEIPT_SIGN_TTL_SECONDS,
} from "@/lib/wallet/receipts";
import {
  adminApproveDepositSchema,
  adminDeclineDepositSchema,
  cancelDepositSchema,
  createDepositRequestSchema,
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
 * Handles:
 * - USDT Deposits (creation, 1-hour expiration, receipt upload, cancellation)
 * - Admin Deposit Review (Approval with balance credit, Decline with reason)
 * - Withdrawals
 * - Saved Addresses
 */

function fieldError(
  message: string,
  fieldErrors: Record<string, string>
): ActionResult {
  return { status: "error", message, fieldErrors };
}

function collectFieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[]
) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

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

/* ------------------------------------------------------------------ USDT Deposits */

export type CreateDepositActionResult =
  | { status: "success"; depositId: string; reference: string; redirectTo: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "unavailable"; message: string };

/**
 * Creates a pending USDT deposit request.
 *
 * Rules:
 * - Asset: USDT only
 * - Networks: BEP-20 (usdt-bsc) or ERC-20 (usdt-ethereum) only
 * - Amount: 1,000 to 50,000 USDT ($1,000.00 to $50,000.00)
 * - Status: initially `pending`
 * - Expiration: 1 hour from creation (`expires_at`)
 * - DO NOT credit the wallet
 */
export async function createDepositAction(
  values: unknown
): Promise<CreateDepositActionResult> {
  const parsed = createDepositRequestSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please enter a valid deposit amount between 1,000 and 50,000 USDT.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const { methodId, amountUsdt } = parsed.data;
  const amountCents = usdStringToCents(amountUsdt);

  if (amountCents < MIN_DEPOSIT_CENTS || amountCents > MAX_DEPOSIT_CENTS) {
    return {
      status: "error",
      message: "Deposit amount must be between 1,000 and 50,000 USDT.",
      fieldErrors: {
        amountUsdt: "Amount must be between 1,000 and 50,000 USDT.",
      },
    };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message: "Please sign in to create a deposit request.",
    };
  }

  const networkConfig = usdtDepositNetworks[methodId];
  if (!networkConfig) {
    return {
      status: "error",
      message: "Invalid deposit network selected.",
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "unavailable",
      message: "The database isn't connected. Please try again later.",
    };
  }

  // Check if user already has an active pending deposit
  const nowIso = new Date().toISOString();
  const { data: existingPending } = await supabase
    .from("deposits")
    .select("id, reference")
    .eq("user_id", account.user.id)
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPending) {
    // If active pending deposit already exists, return that one
    revalidatePath(appRoutes.wallet);
    revalidatePath(appRoutes.dashboard);
    return {
      status: "success",
      depositId: existingPending.id,
      reference: existingPending.reference || `DEP-${existingPending.id.slice(0, 8).toUpperCase()}`,
      redirectTo: `/wallet/deposit/${existingPending.id}`,
    };
  }

  // Try RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "create_deposit_request",
      {
        p_method_id: methodId,
        p_amount_cents: amountCents,
      }
    );

    if (!rpcError && rpcData?.id) {
      revalidatePath(appRoutes.wallet);
      revalidatePath(appRoutes.dashboard);
      return {
        status: "success",
        depositId: rpcData.id,
        reference: rpcData.reference || `DEP-${rpcData.id.slice(0, 8).toUpperCase()}`,
        redirectTo: `/wallet/deposit/${rpcData.id}`,
      };
    }
  } catch {
    // Fall back to direct insert if RPC not applied yet
  }

  // Direct insert fallback
  const reference = `DEP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("deposits")
    .insert({
      user_id: account.user.id,
      method_id: methodId,
      asset_amount: (amountCents / 100).toFixed(2),
      amount_cents: amountCents,
      receiving_address: RECEIVING_WALLET_ADDRESS,
      reference,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id, reference")
    .single();

  if (error || !data?.id) {
    console.error("[wallet:createDeposit]", error);
    return {
      status: "error",
      message: "Failed to create deposit request. Please try again.",
    };
  }

  revalidatePath(appRoutes.wallet);
  revalidatePath(appRoutes.dashboard);

  return {
    status: "success",
    depositId: data.id,
    reference: data.reference || reference,
    redirectTo: `/wallet/deposit/${data.id}`,
  };
}

/**
 * Submits a payment receipt proof for a pending deposit.
 *
 * Fixed implementation:
 * - Validates authenticated user and deposit ownership
 * - Validates file type and size
 * - Uploads to PRIVATE bucket `deposit-receipts` at path:
 *   {user_id}/{deposit_id}/{unique_filename}
 * - Confirms Storage upload succeeds BEFORE updating DB
 * - Saves Storage path (not fake public URL) to deposit record
 * - Only then changes status to PENDING_REVIEW
 * - NEVER credits wallet (credit only on admin approval)
 */
export async function submitDepositProofAction(
  formData: FormData
): Promise<ActionResult> {
  const depositId = formData.get("depositId")?.toString();
  const receiptFile = formData.get("receipt") as File | null;

  if (!depositId) {
    return { status: "error", message: "Missing deposit reference." };
  }

  if (!receiptFile || receiptFile.size === 0) {
    return {
      status: "error",
      message: "Please select a payment receipt file to upload.",
    };
  }

  // Supported MIME types: JPG, JPEG, PNG, WEBP, PDF
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (!allowedMimes.includes(receiptFile.type)) {
    return {
      status: "error",
      message: "Invalid file type. Please upload a JPG, PNG, WEBP image or PDF document.",
    };
  }

  const maxBytes = 10 * 1024 * 1024; // 10MB
  if (receiptFile.size > maxBytes) {
    return {
      status: "error",
      message: "Receipt file is too large. Maximum file size is 10 MB.",
    };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message: "Please sign in to submit a payment proof.",
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "unavailable",
      message: "The backend isn't connected. Please try again later.",
    };
  }

  // Verify deposit exists, belongs to user, and is in pending status
  const { data: deposit, error: fetchError } = await supabase
    .from("deposits")
    .select("id, status, expires_at, user_id")
    .eq("id", depositId)
    .eq("user_id", account.user.id)
    .maybeSingle();

  if (fetchError || !deposit) {
    return {
      status: "error",
      message: "Deposit request not found.",
    };
  }

  if (deposit.status !== "pending") {
    if (deposit.status === "pending_review") {
      return {
        status: "success",
        message: "Payment proof has already been submitted and is pending review.",
      };
    }
    return {
      status: "error",
      message: `Deposit cannot accept proof in its current status (${deposit.status}).`,
    };
  }

  if (deposit.expires_at && new Date(deposit.expires_at).getTime() < Date.now()) {
    // Marking the row `expired` must happen in its OWN transaction — a
    // transaction that also raises cannot keep the update (see migration
    // 0015). `expire_stale_deposit` is an owner-only security-definer RPC
    // that does exactly that. Best effort: the user is surfaced the expiry
    // either way, and `admin_get_deposits` sweeps stale rows on its side.
    // supabase-js resolves database errors into `{ error }`, so this await
    // cannot reject; the result is deliberately ignored.
    await supabase.rpc("expire_stale_deposit", { p_deposit_id: depositId });
    return {
      status: "error",
      message: "This deposit request has expired. Please create a new deposit.",
    };
  }

  // ---- Generate safe, unique filename and path ----
  // Path format: deposit-receipts/{user_id}/{deposit_id}/{filename}
  // Inside bucket, path is: {user_id}/{deposit_id}/{filename}
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };

  const originalName = receiptFile.name || "receipt";
  const extFromName = originalName.split(".").pop()?.toLowerCase() || "";
  let ext = mimeToExt[receiptFile.type] || extFromName || "jpg";
  // Sanitize extension
  ext = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "jpg";
  const allowedExts = ["jpg", "jpeg", "png", "webp", "pdf"];
  if (!allowedExts.includes(ext)) {
    ext = mimeToExt[receiptFile.type] || "jpg";
  }
  if (ext === "jpeg") ext = "jpg";

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const safeFilename = `receipt-${uniqueSuffix}.${ext}`;

  // Use actual authenticated user ID and actual deposit ID, with deposit_id as folder
  const filePath = `${account.user.id}/${depositId}/${safeFilename}`;

  const fileBuffer = await receiptFile.arrayBuffer();

  // ---- Upload to Supabase Storage bucket deposit-receipts (PRIVATE) ----
  const { error: uploadError } = await supabase.storage
    .from("deposit-receipts")
    .upload(filePath, fileBuffer, {
      contentType: receiptFile.type,
      upsert: false, // prevent overwriting another user's receipt or same file
    });

  if (uploadError) {
    console.error("[wallet:submitProof:upload]", uploadError);
    const msgLower = (uploadError.message || "").toLowerCase();
    if (msgLower.includes("bucket not found") || msgLower.includes("bucket_not_found")) {
      return {
        status: "error",
        message: "Receipt storage is not configured. Please contact support. (deposit-receipts bucket missing)",
      };
    }
    if (msgLower.includes("policy") || msgLower.includes("row-level security") || msgLower.includes("rls") || msgLower.includes("unauthorized")) {
      return {
        status: "error",
        message: "You are not authorized to upload this receipt. Please try again or contact support.",
      };
    }
    if (msgLower.includes("too large") || msgLower.includes("file size") || msgLower.includes("payload too large")) {
      return {
        status: "error",
        message: "Receipt file is too large. Maximum file size is 10 MB.",
      };
    }
    return {
      status: "error",
      message: `Failed to upload receipt: ${uploadError.message}. Please try again.`,
    };
  }

  // ---- Confirm Storage upload succeeded, then save the exact Storage path ----
  // Primary path: the `submit_deposit_receipt()` RPC (migrations 0010/0012) —
  // one security-definer transaction that validates the path shape, moves the
  // deposit to `pending_review`, stores `receipt_path`, and notifies the user.
  let rpcSucceeded = false;
  let rpcErrorMessage: string | null = null;

  try {
    const { error: rpcError } = await supabase.rpc("submit_deposit_receipt", {
      p_deposit_id: depositId,
      p_receipt_path: filePath,
      // receipt_path is the private Storage object path; never a public URL.
      p_receipt_url: null,
    });

    if (!rpcError) {
      rpcSucceeded = true;
    } else {
      rpcErrorMessage = rpcError.message;
      console.warn("[wallet:submitProof:rpcError]", rpcError.message);
    }
  } catch (rpcEx) {
    rpcErrorMessage = rpcEx instanceof Error ? rpcEx.message : String(rpcEx);
    console.warn("[wallet:submitProof:rpcException]", rpcEx);
  }

  if (!rpcSucceeded) {
    // Fallback for a database where the RPC is missing: a guarded direct
    // update. On a correctly provisioned schema RLS denies user UPDATEs on
    // `deposits`, so zero updated rows means the write never happened — and
    // that must surface as a hard error, never as a silent success (which is
    // exactly the "receipt in the bucket, nothing on the deposit" failure).
    const { data: updatedRows, error: updateError } = await supabase
      .from("deposits")
      .update({
        status: "pending_review",
        receipt_path: filePath, // Exact private Storage object path.
        receipt_url: null, // Private bucket: no public URL is stored.
        receipt_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", depositId)
      .eq("user_id", account.user.id)
      .eq("status", "pending") // Ensure we only transition from pending
      .select("id, status, receipt_path");

    if (updateError || !updatedRows || updatedRows.length !== 1) {
      console.error("[wallet:submitProof:persistFailed]", {
        rpcErrorMessage,
        updateError,
        updatedRows,
      });
      await removeStoredReceipt(supabase, filePath);
      return {
        status: "error",
        message:
          "Your receipt was stored securely, but the deposit record could not be updated. Please try again — if this keeps happening, contact support.",
      };
    }
  }

  // Final guard: success is only reported when the database actually holds
  // `pending_review` with our exact receipt path on this deposit row.
  const { data: persistedDeposit, error: verifyError } = await supabase
    .from("deposits")
    .select("id, status, receipt_path")
    .eq("id", depositId)
    .maybeSingle();

  if (
    verifyError ||
    !persistedDeposit ||
    persistedDeposit.status !== "pending_review" ||
    persistedDeposit.receipt_path !== filePath
  ) {
    console.error("[wallet:submitProof:verifyFailed]", {
      verifyError,
      persistedDeposit,
      rpcErrorMessage,
    });
    await removeStoredReceipt(supabase, filePath);
    return {
      status: "error",
      message:
        "Your receipt was stored securely, but the deposit record could not be updated. Please try again — if this keeps happening, contact support.",
    };
  }

  // Create notification for user (best effort; the RPC already creates one).
  if (!rpcSucceeded) {
    try {
      await supabase.rpc("create_notification", {
        p_type: "deposit",
        p_title: "Payment Pending Review",
        p_body: "Your payment proof has been submitted successfully and is pending review.",
        p_href: appRoutes.wallet,
      });
    } catch {
      // Notification best effort — the deposit state is already persisted.
    }
  }

  revalidatePath(appRoutes.wallet);
  revalidatePath(appRoutes.dashboard);
  revalidatePath(`/wallet/deposit/${depositId}`);

  return {
    status: "success",
    message: "Your payment proof has been submitted successfully and is pending review.",
  };
}

/**
 * Removes the uploaded receipt object when the database step fails, so a
 * failed submission never leaves an orphan in the private bucket. Best effort:
 * a cleanup failure is logged, not surfaced (the object is private and inert).
 */
async function removeStoredReceipt(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>,
  filePath: string
): Promise<void> {
  try {
    await supabase.storage.from("deposit-receipts").remove([filePath]);
  } catch (cleanupErr) {
    console.warn("[wallet:submitProof:cleanupFailed]", cleanupErr);
  }
}

/**
 * Cancels a pending deposit request.
 */
export async function cancelDepositAction(
  depositId: string
): Promise<ActionResult> {
  const parsed = cancelDepositSchema.safeParse({ depositId });
  if (!parsed.success) {
    return { status: "error", message: "Invalid deposit reference." };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message: "Please sign in to manage your deposits.",
    };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return {
      status: "unavailable",
      message: "The backend isn't connected. Please try again.",
    };
  }

  // Try RPC first (the security-definer write path)
  try {
    const { error: rpcError } = await supabase.rpc("cancel_deposit", {
      p_deposit_id: parsed.data.depositId,
    });
    if (!rpcError) {
      revalidatePath(appRoutes.wallet);
      revalidatePath(appRoutes.dashboard);
      revalidatePath(`/wallet/deposit/${parsed.data.depositId}`);
      return {
        status: "success",
        message: "Deposit request has been cancelled.",
      };
    }
  } catch {
    // Fall back to guarded direct update below
  }

  // Guarded direct update fallback. Row count is checked: on a correctly
  // provisioned schema users have no UPDATE policy on `deposits`, so zero rows
  // means the cancellation never happened and must be reported as such.
  const { data: updatedRows, error } = await supabase
    .from("deposits")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.depositId)
    .eq("user_id", account.user.id)
    .in("status", ["pending", "pending_review"])
    .select("id, status");

  if (error || !updatedRows || updatedRows.length !== 1) {
    console.error("[wallet:cancelDeposit]", { error, updatedRows });
    return {
      status: "error",
      message: "Could not cancel deposit. It may have already been reviewed or expired.",
    };
  }

  revalidatePath(appRoutes.wallet);
  revalidatePath(appRoutes.dashboard);
  revalidatePath(`/wallet/deposit/${parsed.data.depositId}`);

  return {
    status: "success",
    message: "Deposit request has been cancelled.",
  };
}

/* ------------------------------------------------------------ Admin Actions */

/**
 * Admin: Approves a pending deposit and credits the user's wallet balance.
 *
 * Requirements:
 * 1. Verify admin authorization (userId === ADMIN_USER_ID or is_admin()).
 * 2. Verify deposit is pending or pending_review.
 * 3. Verify receipt exists.
 * 4. Credit user's wallet with approved USDT amount (in cents) via transactions ledger.
 * 5. Mark deposit APPROVED / CREDITED.
 * 6. Record reviewed_at and reviewed_by.
 * 7. Create notification for the user.
 * 8. Idempotent: safe if clicked multiple times.
 */
export async function adminApproveDepositAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = adminApproveDepositSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "Invalid deposit reference." };
  }

  const depositId = parsed.data.depositId;

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return { status: "unavailable", message: "Not authenticated." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { status: "unavailable", message: "The database isn't connected." };
  }

  // Verify admin authorization
  const isAdminUser = account.user.id === ADMIN_USER_ID;
  if (!isAdminUser) {
    const { data: isDbAdmin } = await supabase.rpc("is_admin", {});
    if (!isDbAdmin) {
      return { status: "error", message: "Not authorized. Administrator access required." };
    }
  }

  // The database procedure is the ONLY supported write path: one atomic,
  // idempotent transaction (row lock + pending-state guard + ledger insert +
  // balance recompute trigger + audit fields). A direct PostgREST write from
  // here can never succeed on a correctly provisioned schema (admins have no
  // INSERT/UPDATE policy on transactions/deposits), and a partially applied
  // direct write would let a later retry credit the user twice. So when the
  // RPC fails we surface the database's own diagnosis instead — never a second,
  // non-atomic path.
  let rpcErrorMessage: string | null = null;

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "admin_approve_deposit",
      { p_deposit_id: depositId }
    );

    if (!rpcError && rpcData) {
      revalidatePath(appRoutes.wallet);
      revalidatePath(appRoutes.walletActivity);
      revalidatePath(appRoutes.dashboard);
      revalidatePath("/admin");
      revalidatePath("/admin/deposits");
      return {
        status: "success",
        message: `Deposit approved successfully. Wallet credited with ${(Number(rpcData.credited_cents || rpcData.amount_cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}.`,
      };
    }

    rpcErrorMessage = rpcError?.message ?? "unknown error";
    console.warn("[adminApproveDeposit:rpcError]", rpcErrorMessage);
  } catch (rpcErr) {
    rpcErrorMessage = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
    console.warn("[adminApproveDeposit:rpcException]", rpcErr);
  }

  const missingProcedure = /does not exist/i.test(rpcErrorMessage ?? "");
  return {
    status: "error",
    message: missingProcedure
      ? "Approval is unavailable: the database is missing the admin_approve_deposit() procedure. Apply the deposit migrations (supabase/migrations/0010+) and retry. No credit was applied."
      : `Approval failed: ${rpcErrorMessage}. No credit was applied — the deposit remains in its previous state.`,
  };
}

/**
 * Admin: Declines a pending deposit with a required reason.
 *
 * Rules:
 * - Do NOT credit wallet.
 * - Mark deposit DECLINED.
 * - Save the reason.
 * - Record reviewed_at and reviewed_by.
 * - Notify the user.
 */
export async function adminDeclineDepositAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = adminDeclineDepositSchema.safeParse(values);
  if (!parsed.success) {
    return fieldError(
      "Please provide a valid decline reason.",
      collectFieldErrors(parsed.error.issues)
    );
  }

  const { depositId, reason } = parsed.data;

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return { status: "unavailable", message: "Not authenticated." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { status: "unavailable", message: "The database isn't connected." };
  }

  // Verify admin authorization
  const isAdminUser = account.user.id === ADMIN_USER_ID;
  if (!isAdminUser) {
    const { data: isDbAdmin } = await supabase.rpc("is_admin", {});
    if (!isDbAdmin) {
      return { status: "error", message: "Not authorized. Administrator access required." };
    }
  }

  // The database procedure is the only write path — it validates the state
  // transition, records the admin, reason and timestamp, and notifies the
  // user, in one transaction. No non-atomic fallback: a direct update here
  // would not be authorized on a correctly provisioned schema, and a false
  // "declined" result would desync the admin queue from the ledger.
  let rpcErrorMessage: string | null = null;

  try {
    const { error: rpcError } = await supabase.rpc("admin_decline_deposit", {
      p_deposit_id: depositId,
      p_reason: reason,
    });

    if (!rpcError) {
      revalidatePath(appRoutes.wallet);
      revalidatePath(appRoutes.dashboard);
      revalidatePath("/admin");
      revalidatePath("/admin/deposits");
      return {
        status: "success",
        message: "Deposit declined and reason recorded.",
      };
    }

    rpcErrorMessage = rpcError?.message ?? "unknown error";
    console.warn("[adminDeclineDeposit:rpcError]", rpcErrorMessage);
  } catch (rpcErr) {
    rpcErrorMessage = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
    console.warn("[adminDeclineDeposit:rpcException]", rpcErr);
  }

  const missingProcedure = /does not exist/i.test(rpcErrorMessage ?? "");
  return {
    status: "error",
    message: missingProcedure
      ? "Decline is unavailable: the database is missing the admin_decline_deposit() procedure. Apply the deposit migrations (supabase/migrations/0010+) and retry. The deposit was not changed."
      : `Decline failed: ${rpcErrorMessage}. The deposit was not changed.`,
  };
}

/**
 * Generates a signed URL for an admin to view a private deposit receipt.
 *
 * The browser supplies a deposit ID, never a Storage path. On the server we
 * authorize the admin, load `receipt_path` from that deposit, verify that it
 * is exactly the expected object path, and then sign it. This prevents a
 * client from using this action to sign arbitrary private bucket objects.
 */
export async function getReceiptSignedUrlAction(
  depositId: string
): Promise<{ status: "success"; signedUrl: string } | { status: "error"; message: string }> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(depositId)) {
    return { status: "error", message: "Invalid deposit reference." };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return { status: "error", message: "Not authenticated." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { status: "error", message: "Backend not connected." };
  }

  let isAdmin = account.user.id === ADMIN_USER_ID;
  if (!isAdmin) {
    const { data: isDbAdmin, error: adminError } = await supabase.rpc("is_admin", {});
    isAdmin = !adminError && Boolean(isDbAdmin);
  }
  if (!isAdmin) {
    return { status: "error", message: "Not authorized to view deposit receipts." };
  }

  // Do not trust a path from the UI or the legacy receipt_url column. The path
  // used for signing is always the exact receipt_path stored on this deposit.
  const { data: deposit, error: depositError } = await supabase
    .from("deposits")
    .select("id, user_id, receipt_path")
    .eq("id", depositId)
    .maybeSingle();

  if (depositError || !deposit) {
    return { status: "error", message: "Deposit request not found." };
  }

  // Strictly validate the stored path before signing: exactly
  // `{user_id}/{deposit_id}/receipt-*.ext` for this deposit. Legacy or
  // corrupted values (bare filenames, URLs, other deposits' paths) are
  // refused, so this action can never sign an arbitrary private object.
  const parsedReceipt = parseReceiptPath(deposit.receipt_path, deposit.user_id, deposit.id);
  if (!parsedReceipt) {
    return {
      status: "error",
      message: "This deposit does not have a valid stored receipt path.",
    };
  }

  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(deposit.receipt_path as string, RECEIPT_SIGN_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[getReceiptSignedUrl]", error);
    const message = (error?.message || "").toLowerCase();
    if (message.includes("not found") || message.includes("object not found")) {
      return { status: "error", message: "Receipt file not found in storage." };
    }
    return { status: "error", message: "Could not generate a secure receipt link." };
  }

  return { status: "success", signedUrl: data.signedUrl };
}

/* ------------------------------------------------------------------ Legacy deposit address */

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
      message: "Please sign in to view your deposit address.",
    };
  }

  const resolved = await resolveMethod(parsed.data.methodId);
  if (!resolved.ok) return resolved.result;
  const { method } = resolved;

  if (!method.depositEnabled) {
    return {
      status: "unavailable",
      message: `Deposits on ${method.asset.symbol} · ${method.network.protocol} are not enabled yet.`,
    };
  }

  revalidatePath(appRoutes.wallet);
  return { status: "success", message: "Deposit address ready." };
}

/* --------------------------------------------------------------------- Quotes */

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

export async function submitWithdrawalAction(
  values: unknown
): Promise<ActionResult> {
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

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message: "Accounts aren't live yet. Sign in to withdraw.",
    };
  }

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
      message: `Withdrawals on ${method.asset.symbol} · ${method.network.protocol} are not enabled yet.`,
    };
  }

  if (!isValidAddressForMethod(method, destinationAddress)) {
    return fieldError("Check the destination address.", {
      destinationAddress: `That isn't a valid ${method.network.name} address.`,
    });
  }

  const minimumCents = Math.max(
    policy.minimumCents,
    method.minWithdrawalCents ?? 0
  );
  if (amountCents < minimumCents) {
    return fieldError("That amount is below the minimum.", {
      amountUsd: `The minimum withdrawal is $${(minimumCents / 100).toFixed(2)}.`,
    });
  }

  if (policy.maximumCents !== null && amountCents > policy.maximumCents) {
    return fieldError("That amount is above the maximum.", {
      amountUsd: `The maximum withdrawal is $${(policy.maximumCents / 100).toFixed(2)}.`,
    });
  }

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
        `this withdrawal needs $${(costsWithoutQuote.totalDeductedCents / 100).toFixed(2)}${feeNote}.`,
    });
  }

  const quoteResult = await getRateProvider().quoteUsdToAsset({
    method,
    usdCents: amountCents,
  });

  if (quoteResult.status !== "ready") {
    return { status: "unavailable", message: quoteResult.reason };
  }

  const quote: ExchangeQuote = quoteResult.quote;

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
      message: "The withdrawal was not created. Please try again.",
    };
  }

  if (saveAddress && addressLabel) {
    await supabase.from("saved_withdrawal_addresses").insert({
      user_id: account.user.id,
      method_id: method.id,
      label: addressLabel,
      address: destinationAddress,
    });
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

export async function cancelWithdrawalAction(
  id: unknown
): Promise<ActionResult> {
  const parsed = withdrawalIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { status: "error", message: "That withdrawal reference isn't valid." };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return { status: "unavailable", message: "Sign in to manage your withdrawals." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { status: "unavailable", message: "The backend isn't connected." };
  }

  const { error } = await supabase.rpc("cancel_withdrawal", {
    p_withdrawal_id: parsed.data.id,
  });

  if (error) {
    console.error("[wallet:cancelWithdrawal]", error);
    return {
      status: "error",
      message: "We couldn't cancel this withdrawal.",
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
    if (error.code === "23505") {
      return { status: "error", message: "That address is already saved for this network." };
    }
    return { status: "error", message: "We couldn't save that address. Please try again." };
  }

  revalidatePath(appRoutes.withdraw);
  return { status: "success", message: "Address saved." };
}

export async function deleteSavedAddressAction(
  id: unknown
): Promise<ActionResult> {
  const parsed = savedAddressIdSchema.safeParse({ id });
  if (!parsed.success) {
    return { status: "error", message: "That saved address reference isn't valid." };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return { status: "unavailable", message: "Sign in to manage your saved addresses." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { status: "unavailable", message: "The backend isn't connected." };
  }

  const { error } = await supabase
    .from("saved_withdrawal_addresses")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", account.user.id);

  if (error) {
    console.error("[wallet:deleteSavedAddress]", error);
    return { status: "error", message: "We couldn't remove that address. Please try again." };
  }

  revalidatePath(appRoutes.withdraw);
  return { status: "success", message: "Address removed." };
}
