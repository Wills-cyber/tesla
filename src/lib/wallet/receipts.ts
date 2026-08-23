import "server-only";

import {
  buildExplorerUrl,
  findPaymentMethod,
  paymentMethodCatalogue,
} from "@/config/crypto";
import type { ReceiptWithdrawal } from "@/components/wallet/transaction-receipt";
import type { WithdrawalRequest } from "@/types/crypto";

/**
 * Indexes withdrawals by the ledger row that reserves their funds.
 *
 * A transaction receipt wants the asset, network, destination and — only if it
 * exists — the transaction hash, and none of those live on the `transactions` row.
 * `withdrawal_requests.transaction_id` is the link, so this builds the lookup once
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
