import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { TransactionList } from "@/components/wallet/transaction-list";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import { getUserTransactions, getUserWithdrawals, resolveOrEmpty } from "@/lib/data";
import { indexWithdrawalsByTransaction } from "@/lib/wallet/receipts";

export const metadata: Metadata = {
  title: "Wallet Activity",
  description: "Your full TESLA Electronics account history.",
  robots: { index: false, follow: false },
};

/**
 * Full account history — premium style with consistent header.
 */
export default async function WalletActivityPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const [transactionsResult, withdrawalsResult] = await Promise.all([
    getUserTransactions({ limit: 100 }),
    getUserWithdrawals(100),
  ]);

  const { data: transactions, error } = resolveOrEmpty(transactionsResult, []);
  const { data: withdrawals } = resolveOrEmpty(withdrawalsResult, []);

  return (
    <>
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href={appRoutes.wallet}>
            <ArrowLeft />
            Wallet
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <p className="eyebrow text-brand-emphasis">Wallet</p>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-[2.25rem]">
              Account activity
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Every deposit, investment, profit payment, principal return and withdrawal
              on your account.
            </p>
          </div>
          {preview && (
            <StatusPill tone="brand" dot className="self-start shrink-0">
              UI Preview · No account connected
            </StatusPill>
          )}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/25 bg-destructive-surface p-5 text-sm text-foreground"
        >
          {error}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          size="lg"
          title="No transactions"
          description="Your transaction history will appear here."
          note="Nothing has been deposited, invested, paid or withdrawn — the platform is not processing money yet."
          action={
            <Button asChild variant="hairline" size="md">
              <Link href={appRoutes.wallet}>Open Wallet</Link>
            </Button>
          }
        />
      ) : (
        <TransactionList
          transactions={transactions}
          withdrawalsByTransactionId={indexWithdrawalsByTransaction(withdrawals)}
        />
      )}
    </>
  );
}