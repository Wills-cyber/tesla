import * as React from "react";

import { TransactionItem } from "@/components/wallet/transaction-item";
import {
  TransactionReceipt,
  type ReceiptWithdrawal,
} from "@/components/wallet/transaction-receipt";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

/**
 * Premium transaction list.
 *
 * Renders transactions as a clean, shadowed list. Each row opens a receipt dialog.
 * On mobile, items use a card-like layout within the list.
 */
export function TransactionList({
  transactions,
  withdrawalsByTransactionId,
  className,
}: {
  transactions: readonly Transaction[];
  withdrawalsByTransactionId?: Readonly<Record<string, ReceiptWithdrawal>>;
  className?: string;
}) {
  if (transactions.length === 0) return null;

  return (
    <div
      aria-label="Account activity, most recent first"
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-hairline shadow-card",
        className
      )}
    >
      {transactions.map((transaction) => (
        <TransactionReceipt
          key={transaction.id}
          transaction={transaction}
          withdrawal={withdrawalsByTransactionId?.[transaction.id] ?? null}
          trigger={<TransactionItem transaction={transaction} as="div" />}
        />
      ))}
    </div>
  );
}