"use client";

import * as React from "react";

import { TransactionList } from "@/components/wallet/transaction-list";
import type { ReceiptWithdrawal } from "@/components/wallet/transaction-receipt";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/types/transaction";

const TYPE_LABELS: Record<TransactionType, string> = {
  deposit: "Deposits",
  withdrawal: "Withdrawals",
  investment: "Investments",
  profit_payment: "Profit",
  principal_return: "Principal",
  referral_bonus: "Referral",
  adjustment: "Adjustments",
};

/**
 * Client-side filter over an already-loaded ledger page.
 *
 * The activity route caps the query at 100 rows, so filtering in the browser is
 * instant and needs no round trip. Only types that actually occur get a chip —
 * an empty category would be a dead control. Selecting a type narrows the same
 * `TransactionList`, so receipts and their withdrawal detail keep working.
 */
export function TransactionFilter({
  transactions,
  withdrawalsByTransactionId,
}: {
  transactions: readonly Transaction[];
  withdrawalsByTransactionId?: Readonly<Record<string, ReceiptWithdrawal>>;
}) {
  // Stable presentation order rather than the order the ledger happens to
  // return.
  const presentTypes = React.useMemo(() => {
    const seen = new Set(transactions.map((transaction) => transaction.type));
    return (Object.keys(TYPE_LABELS) as TransactionType[]).filter((type) =>
      seen.has(type)
    );
  }, [transactions]);

  const [active, setActive] = React.useState<TransactionType | "all">("all");

  const visible = React.useMemo(
    () =>
      active === "all"
        ? transactions
        : transactions.filter((transaction) => transaction.type === active),
    [transactions, active]
  );

  return (
    <div className="flex flex-col gap-4">
      <div aria-label="Filter transactions by type" className="flex flex-wrap gap-2">
        <FilterChip
          label={`All (${transactions.length})`}
          selected={active === "all"}
          onClick={() => setActive("all")}
        />
        {presentTypes.map((type) => (
          <FilterChip
            key={type}
            label={TYPE_LABELS[type]}
            selected={active === type}
            onClick={() => setActive(type)}
          />
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {active === "all"
          ? `Showing all ${visible.length} transactions.`
          : `Showing ${visible.length} ${TYPE_LABELS[active]} transaction${visible.length === 1 ? "" : "s"}.`}
      </p>

      <TransactionList
        transactions={visible}
        withdrawalsByTransactionId={withdrawalsByTransactionId}
      />
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        selected
          ? "border-foreground bg-foreground text-background shadow-soft"
          : "border-hairline bg-surface-1 text-muted-foreground hover:border-hairline-strong hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
