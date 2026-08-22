import type { Metadata } from "next";
import { Receipt } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { TransactionList } from "@/components/dashboard/transaction-list";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import { getUserTransactions, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Transactions",
  description: "Your TESLA Electronics account history.",
  robots: { index: false, follow: false },
};

/**
 * Transactions page.
 *
 * Rows exist only where value actually moved. Nothing in this build writes to the
 * `transactions` table, so the empty state is the correct and expected render —
 * it is not a loading fallback.
 */
export default async function DashboardTransactionsPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const { data: transactions, error } = resolveOrEmpty(
    await getUserTransactions(),
    []
  );

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every deposit, investment, payment and withdrawal on your account, once activity begins."
        badge={
          preview ? (
            <StatusPill tone="gold" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/[0.06] p-5 text-sm text-red-100"
        >
          {error}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No Transactions"
          description="Your account has no transaction history."
          note="This is not an error. Deposits and withdrawals are not enabled yet, so no value has moved on the platform. Every entry that appears here in future will correspond to a real, settled event."
        />
      ) : (
        <TransactionList transactions={transactions} />
      )}
    </>
  );
}
