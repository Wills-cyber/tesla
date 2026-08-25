import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildExplorerUrl,
  findPaymentMethod,
  paymentMethodCatalogue,
} from "@/config/crypto";
import type { ReceiptWithdrawal } from "@/components/wallet/transaction-receipt";
import type { DepositRecord, DepositRecordStatus, WithdrawalRequest } from "@/types/crypto";
import type { Database } from "@/types/database";

/**
 * Receipt storage is PRIVATE. `receipt_path` is the canonical value on a
 * deposit: the object path inside the `deposit-receipts` bucket, exactly
 * `{user_id}/{deposit_id}/receipt-{suffix}.{ext}`. No public URL for this
 * bucket is ever stored or derived — admin surfaces sign the path server-side
 * after authorizing the caller (see `getAdminDeposits` / signed URL actions).
 */
export const RECEIPT_BUCKET = "deposit-receipts";

/** Signed receipt links are short-lived; the admin can always open a fresh one. */
export const RECEIPT_SIGN_TTL_SECONDS = 3600;

/** Extensions the upload flow accepts (kept in sync with the DB check in migration 0012). */
const RECEIPT_FILENAME_PATTERN = /^receipt-[a-z0-9-]+\.(jpg|jpeg|png|webp|pdf)$/i;

export type ParsedReceiptPath = {
  userId: string;
  depositId: string;
  filename: string;
  isPdf: boolean;
};

/**
 * Strictly parses a stored `receipt_path`.
 *
 * Returns `null` for anything that is not exactly
 * `{userId}/{depositId}/receipt-*.ext` — legacy or corrupted rows (e.g. a bare
 * filename, a URL, or a path for a different deposit) must never be signed, so
 * the parser is deliberately the only gate between a DB value and Storage.
 */
export function parseReceiptPath(
  path: string | null | undefined,
  userId: string | null | undefined,
  depositId: string | null | undefined
): ParsedReceiptPath | null {
  if (typeof path !== "string") return null;
  if (typeof userId !== "string" || typeof depositId !== "string") return null;

  const parts = path.split("/");
  if (parts.length !== 3) return null;

  const [pathUser, pathDeposit, filename] = parts;
  if (!pathUser || !pathDeposit || !filename) return null;
  if (pathUser !== userId || pathDeposit !== depositId) return null;
  if (!RECEIPT_FILENAME_PATTERN.test(filename)) return null;

  return {
    userId: pathUser,
    depositId: pathDeposit,
    filename,
    isPdf: filename.toLowerCase().endsWith(".pdf"),
  };
}

/**
 * Signs the stored receipt path for deposits an authorised admin may act on.
 *
 * Only `pending` / `pending_review` deposits are signed: those are the rows the
 * review queue needs inline previews for, and signing is one Storage round trip
 * per row, so historical rows stay cheap (the on-demand modal can still fetch a
 * fresh signed URL for any other status).
 *
 * Every returned record is a shallow copy; the input array is not mutated.
 */
export async function attachAdminReceiptPreviews(
  supabase: SupabaseClient<Database>,
  records: readonly DepositRecord[]
): Promise<DepositRecord[]> {
  const ACTIONABLE: ReadonlySet<DepositRecordStatus> = new Set([
    "pending",
    "pending_review",
  ]);

  const enriched: DepositRecord[] = records.map((record) => ({ ...record }));
  const byId = new Map(enriched.map((record) => [record.id, record]));

  const candidates = records.filter(
    (record) =>
      ACTIONABLE.has(record.status) &&
      parseReceiptPath(record.receiptPath, record.userId, record.id) !== null
  );

  // Keep page loads bounded no matter how big the queue grows.
  const BATCH_SIZE = 8;
  const MAX_SIGNED = 100;

  for (let offset = 0; offset < candidates.length; offset += BATCH_SIZE) {
    const batch = candidates.slice(offset, offset + BATCH_SIZE);

    await Promise.all(
      batch.map(async (record) => {
        if (offset + batch.length > MAX_SIGNED) return;

        const parsed = parseReceiptPath(record.receiptPath, record.userId, record.id);
        const target = byId.get(record.id);
        if (!parsed || !target) return;

        target.receiptIsPdf = parsed.isPdf;

        const { data, error } = await supabase.storage
          .from(RECEIPT_BUCKET)
          .createSignedUrl(record.receiptPath as string, RECEIPT_SIGN_TTL_SECONDS);

        if (error || !data?.signedUrl) {
          // Object missing or signing failed: leave `receiptSignedUrl` unset.
          // The card renders an explicit "preview unavailable" state and the
          // modal reports the storage error on demand — never a fake image.
          return;
        }

        target.receiptSignedUrl = data.signedUrl;
      })
    );
  }

  return enriched;
}

/**
 * Indexes withdrawals by the ledger row that reserves their funds.
 *
 * A transaction receipt wants the asset, network, destination and — only if it
 * exists — the transaction hash, and none of those live on the `transactions`
 * row. `withdrawal_requests.transaction_id` is the link, so this builds the lookup once
 * per request rather than scanning the withdrawal list per rendered row.
 *
 * Withdrawals with no `transactionId` are skipped rather than guessed at: an
 * unlinked row cannot be attributed to a specific ledger entry, and attaching it to
 * the wrong one would put someone else's destination address on a receipt.
 */
export function indexWithdrawalsByTransaction(
  withdrawals: readonly WithdrawalRequest[]
): Record<string, ReceiptWithdrawal> {
  const index: Record<string, ReceiptWithdrawal> = {};

  for (const withdrawal of withdrawals) {
    if (!withdrawal.transactionId) continue;

    const method = findPaymentMethod(paymentMethodCatalogue, withdrawal.methodId);

    index[withdrawal.transactionId] = {
      id: withdrawal.id,
      assetSymbol: withdrawal.assetSymbol,
      destinationAddress: withdrawal.destinationAddress,
      quotedAssetAmount: withdrawal.quotedAssetAmount,
      status: withdrawal.status,
      txHash: withdrawal.txHash,
      networkLabel: method
        ? `${method.network.name} (${method.network.protocol})`
        : null,
      // Null unless a real hash is recorded, so the receipt has no explorer link to
      // render until the transfer is genuinely on-chain.
      explorerUrl:
        withdrawal.txHash && method
          ? buildExplorerUrl(method.network, withdrawal.txHash)
          : null,
    };
  }

  return index;
}
