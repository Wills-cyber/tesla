import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { TransactionList } from "@/components/wallet/transaction-list";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import { getUserTransactions, resolveOrEmpty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Wallet Activity",
  description: "Your full TESLA Electronics account history.",
  robots: { index: false, follow: false },
};

/**
 * Full account history.
 *
 * The Wallet page shows the ten most recent movements; this is the complete list.
 * Rows exist only where value actually moved — nothing in this build writes to the
 * `transactions` table, so the empty state is the correct render, not a loading
 * fallback.
 */
export default async function WalletActivityPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const { data: transactions, error } = resolveOrEmpty(
    await getUserTransactions({ limit: 100 }),
    []
  );

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

      <PageHeader
        eyebrow="Wallet"
        title="Account activity"
        description="Every deposit, investment, profit payment, principal return and withdrawal on your account."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
      />

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
        <TransactionList transactions={transactions} />
      )}
    </>
  );
}
