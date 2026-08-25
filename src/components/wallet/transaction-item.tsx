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
 * Premium transaction item.
 *
 * Redesigned with a cleaner layout, color-coded type icons, and better mobile display.
 * On small screens the layout adapts without horizontal scrolling.
 */
export function TransactionItem({
  transaction,
  as: Element = "li",
  className,
}: {
  transaction: Transaction;
  as?: "li" | "div";
  className?: string;
}) {
  const type = typeConfig[transaction.type];
  const isCredit = transaction.amountCents > 0;

  const iconColors = {
    deposit: "border-deposit-border bg-deposit-surface text-deposit",
    withdrawal: "border-withdrawal-border bg-withdrawal-surface text-withdrawal",
    investment: "border-investment-border bg-investment-surface text-investment-accent",
    profit_payment: "border-profit-border bg-profit-surface text-profit",
    principal_return: "border-hairline bg-surface-2 text-muted-foreground",
    referral_bonus: "border-brand-border bg-brand-surface text-brand",
    adjustment: "border-hairline bg-surface-2 text-muted-foreground",
  };

  return (
    <Element
      className={cn(
        "flex items-center gap-3 border-b border-hairline bg-surface-1 px-4 py-3.5 transition-colors duration-300 last:border-b-0 hover:bg-surface-2 sm:gap-4 sm:px-5 sm:py-4",
        className
      )}
    >
      {/* Icon */}
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl border",
          iconColors[transaction.type]
        )}
      >
        <type.icon className="size-4" />
      </span>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-sm font-semibold">{type.label}</span>
          <TransactionStatusPill status={transaction.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.7rem] text-subtle-foreground">
          <time dateTime={transaction.settledAt ?? transaction.createdAt}>
            {formatDateTime(transaction.settledAt ?? transaction.createdAt)}
          </time>
          <span aria-hidden="true" className="text-hairline-strong">·</span>
          <span data-numeric>{shortReference(transaction.reference)}</span>
        </div>
      </div>

      {/* Amount */}
      <span
        data-numeric
        className={cn(
          "shrink-0 text-sm font-semibold whitespace-nowrap sm:text-base",
          isCredit ? "text-profit" : "text-foreground"
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