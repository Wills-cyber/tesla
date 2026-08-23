import * as React from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Gift,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { TransactionStatusPill } from "@/components/common/status-pill";
import { formatCurrency, formatDateTime, shortReference } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types/transaction";

const typeConfig: Record<
  TransactionType,
  { label: string; icon: LucideIcon }
> = {
  deposit: { label: "Deposit", icon: ArrowDownToLine },
  withdrawal: { label: "Withdrawal", icon: ArrowUpFromLine },
  investment: { label: "Investment funding", icon: TrendingUp },
  profit_payment: { label: "Profit credit", icon: Banknote },
  principal_return: { label: "Principal return", icon: RotateCcw },
  referral_bonus: { label: "Referral bonus", icon: Gift },
  adjustment: { label: "Adjustment", icon: SlidersHorizontal },
};

/**
 * One movement of value on the account.
 *
 * A row exists only because something really happened: the `transactions` table
 * has no client INSERT policy, so nothing here can be fabricated from the browser.
 * Amounts are signed — a credit reads `+$100.00`, a debit `-$100.00` — because the
 * direction of a transfer is the first thing anyone checks.
 */
export function TransactionItem({
  transaction,
  as: Element = "li",
  className,
}: {
  transaction: Transaction;
  /**
   * `li` for a bare list; `div` when the row is wrapped in something else — a
   * receipt trigger button, for instance, which may not contain a list item.
   */
  as?: "li" | "div";
  className?: string;
}) {
  const type = typeConfig[transaction.type];
  const isCredit = transaction.amountCents > 0;

  return (
    <Element
      className={cn(
        "flex items-center gap-4 bg-surface-1 px-4 py-4 transition-colors duration-300 hover:bg-surface-2 sm:px-5",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl border",
          isCredit
            ? "border-success/25 bg-success-surface text-success"
            : "border-hairline bg-surface-2 text-muted-foreground"
        )}
      >
        <type.icon className="size-4" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-semibold">{type.label}</span>
          <TransactionStatusPill status={transaction.status} />
        </div>

        {transaction.description && (
          <span className="truncate text-xs text-muted-foreground">
            {transaction.description}
          </span>
        )}

        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.7rem] text-subtle-foreground">
          <time dateTime={transaction.settledAt ?? transaction.createdAt}>
            {formatDateTime(transaction.settledAt ?? transaction.createdAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span data-numeric>{shortReference(transaction.reference)}</span>
        </span>
      </div>

      <span
        data-numeric
        className={cn(
          "shrink-0 text-sm font-semibold whitespace-nowrap sm:text-base",
          isCredit ? "text-success" : "text-foreground"
        )}
      >
        {formatCurrency(transaction.amountCents, {
          currency: transaction.currency,
          signed: true,
        })}
      </span>
    </Element>
  );
}
