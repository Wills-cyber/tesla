import * as React from "react";

import { TransactionItem } from "@/components/wallet/transaction-item";
import {
  TransactionReceipt,
  type ReceiptWithdrawal,
} from "@/components/wallet/transaction-receipt";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

/**
 * Account activity feed.
 *
 * Covers every kind of movement on the ledger — deposits, withdrawals, investment
 * funding, profit credits, principal returns — because they all live in the same
 * `transactions` table and separating them by type would hide the running story of
 * the account.
 *
 * Every row opens its receipt. `withdrawalsByTransactionId` supplies the asset,
 * network, destination and hash for withdrawal rows, keyed by the ledger row that
 * reserved the funds; rows with no entry render a receipt without those lines
 * rather than with invented ones.
 *
 * Renders nothing when the list is empty: the caller shows the appropriate
 * `EmptyState`, which can explain *why* it's empty and offer a next step.
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
    <ul
      aria-label="Account activity, most recent first"
      className={cn(
        "flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline shadow-card",
        className
      )}
    >
      {transactions.map((transaction) => (
        <li key={transaction.id}>
          <TransactionReceipt
            transaction={transaction}
            withdrawal={withdrawalsByTransactionId?.[transaction.id] ?? null}
            trigger={<TransactionItem transaction={transaction} as="div" />}
          />
        </li>
      ))}
    </ul>
  );
}
