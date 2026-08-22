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

import { StatusPill } from "@/components/common/status-pill";
import { formatCurrency, formatDateTime, shortReference } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@/types/transaction";

const typeConfig: Record<
  TransactionType,
  { label: string; icon: LucideIcon }
> = {
  deposit: { label: "Deposit", icon: ArrowDownToLine },
  withdrawal: { label: "Withdrawal", icon: ArrowUpFromLine },
  investment: { label: "Investment", icon: TrendingUp },
  profit_payment: { label: "Profit Payment", icon: Banknote },
  principal_return: { label: "Principal Return", icon: RotateCcw },
  referral_bonus: { label: "Referral Bonus", icon: Gift },
  adjustment: { label: "Adjustment", icon: SlidersHorizontal },
};

const statusConfig: Record<
  TransactionStatus,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  completed: { label: "Completed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  processing: { label: "Processing", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/**
 * Account history table.
 *
 * Rendered as a real `<table>` because this genuinely is tabular data — a screen
 * reader can then navigate it by row and column, which a div grid does not allow.
 * Amounts are signed: a credit reads `+$100.00`, a debit `-$100.00`.
 */
export function TransactionList({
  transactions,
}: {
  transactions: readonly Transaction[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-2xl border-collapse text-left">
          <caption className="sr-only">
            Your account transactions, most recent first
          </caption>

          <thead>
            <tr className="border-b border-white/8 bg-white/[0.02]">
              {["Type", "Reference", "Date", "Status", "Amount"].map(
                (heading, index) => (
                  <th
                    key={heading}
                    scope="col"
                    className={cn(
                      "px-4 py-3.5 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase",
                      index === 4 && "text-right"
                    )}
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/6">
            {transactions.map((transaction) => {
              const type = typeConfig[transaction.type];
              const status = statusConfig[transaction.status];
              const isCredit = transaction.amountCents > 0;

              return (
                <tr
                  key={transaction.id}
                  className="transition-colors duration-300 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground"
                      >
                        <type.icon className="size-3.5" />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{type.label}</span>
                        {transaction.description && (
                          <span className="text-xs text-muted-foreground">
                            {transaction.description}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      data-numeric
                      className="text-xs text-muted-foreground"
                    >
                      {shortReference(transaction.reference)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(
                        transaction.settledAt ?? transaction.createdAt
                      )}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <StatusPill tone={status.tone} dot>
                      {status.label}
                    </StatusPill>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <span
                      data-numeric
                      className={cn(
                        "text-sm font-medium whitespace-nowrap",
                        isCredit ? "text-emerald-200" : "text-foreground"
                      )}
                    >
                      {formatCurrency(transaction.amountCents, {
                        currency: transaction.currency,
                        signed: true,
                      })}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
