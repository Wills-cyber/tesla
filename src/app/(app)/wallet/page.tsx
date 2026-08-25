import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpFromLine, Receipt, ShieldCheck } from "lucide-react";

import { FeatureCard } from "@/components/dashboard/feature-card";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { DepositList } from "@/components/wallet/deposit-list";
import { DepositModal } from "@/components/wallet/deposit-modal";
import { TransactionList } from "@/components/wallet/transaction-list";
import { indexWithdrawalsByTransaction } from "@/lib/wallet/receipts";
import { WalletCard } from "@/components/wallet/wallet-card";
import { WithdrawalList } from "@/components/wallet/withdrawal-list";
import { Button } from "@/components/ui/button";
import { walletExplainers } from "@/config/content";
import { appRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import {
  getPaymentMethods,
  getUserBalance,
  getUserDeposits,
  getUserTransactions,
  getUserWithdrawals,
  getWithdrawalPolicy,
  resolveOrEmpty,
} from "@/lib/data";
import { MINIMUM_WITHDRAWAL_CENTS } from "@/config/crypto";
import { formatCurrency } from "@/lib/format";
import { EMPTY_BALANCE } from "@/types/balance";

export const metadata: Metadata = {
  title: "Wallet",
  description: "Your TESLA Electronics balance, deposits and withdrawals.",
  robots: { index: false, follow: false },
};

/**
 * Wallet — redesigned premium financial surface.
 * Clean hierarchy: Balance → Quick actions → Withdrawal history → Deposits → Activity
 */
export default async function WalletPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const [
    balanceResult,
    transactionsResult,
    methodsResult,
    policyResult,
    depositsResult,
    withdrawalsResult,
  ] = await Promise.all([
    getUserBalance(),
    getUserTransactions({ limit: 10 }),
    getPaymentMethods(),
    getWithdrawalPolicy(),
    getUserDeposits(10),
    getUserWithdrawals(10),
  ]);

  const { data: balance } = resolveOrEmpty(balanceResult, {
    userId: "preview",
    updatedAt: "",
    ...EMPTY_BALANCE,
  });

  const { data: transactions, error: transactionsError } = resolveOrEmpty(
    transactionsResult,
    []
  );
  const { data: methods } = resolveOrEmpty(methodsResult, []);
  const { data: policy } = resolveOrEmpty(policyResult, {
    minimumCents: MINIMUM_WITHDRAWAL_CENTS,
    maximumCents: null,
    serviceFeeBps: 0,
    withdrawalsEnabled: false,
    depositsEnabled: false,
  });
  const { data: deposits } = resolveOrEmpty(depositsResult, []);
  const { data: withdrawals } = resolveOrEmpty(withdrawalsResult, []);

  const depositMethods = methods.filter(
    (method) => method.depositEnabled || !policy.depositsEnabled
  );

  return (
    <>
      {/* --------------------------------------------------------- Header */}
      <div className="flex flex-col gap-3">
        <p className="eyebrow text-brand-emphasis">Wallet</p>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-[2.25rem]">
              Wallet
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Your balance, deposits, withdrawals and account activity — all in one place.
            </p>
          </div>
          {preview && (
            <StatusPill tone="brand" dot className="self-start shrink-0">
              UI Preview · No account connected
            </StatusPill>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- Balance */}
      <WalletCard
        balance={balance}
        preview={preview}
        actions={
          <>
            <DepositModal methods={depositMethods} />

            <Button asChild variant="accent" size="md">
              <Link href={appRoutes.withdraw}>
                <ArrowUpFromLine />
                Withdraw
              </Link>
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------- Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <WalletAction
          href={appRoutes.withdraw}
          icon={ArrowUpFromLine}
          label="Withdraw"
          description="Request a payout"
          color="withdrawal"
        />
        <WalletAction
          href={appRoutes.walletActivity}
          icon={Receipt}
          label="Activity"
          description="Full history"
          color="neutral"
        />
      </div>

      {/* ------------------------------------------------------ Empty balance */}
      {balance.availableCents === 0 && (
        <div className="panel-sunken flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">
              Your wallet balance is currently {formatCurrency(0)}.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Deposits are not enabled yet — no payment provider is connected, so no
              deposit address exists and nothing can be credited.
            </p>
          </div>

          <Button asChild variant="hairline" size="md" className="shrink-0">
            <Link href={appRoutes.invest}>
              Explore Plans
              <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      {/* -------------------------------------------------- Withdrawal history */}
      <section
        aria-labelledby="withdrawals-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="withdrawals-heading" className="text-lg font-semibold">
              Withdrawal History
            </h2>
            <p className="text-sm text-muted-foreground">
              Every withdrawal request and its current state.
            </p>
          </div>

          <Button asChild variant="ghost" size="sm">
            <Link href={appRoutes.withdraw}>
              New withdrawal
              <ArrowRight />
            </Link>
          </Button>
        </div>

        {withdrawals.length === 0 ? (
          <EmptyState
            icon={ArrowUpFromLine}
            title="No withdrawals yet"
            description={`Withdrawals of ${formatCurrency(policy.minimumCents)} or more will appear here.`}
            note="Withdrawal requests are open. A request is recorded as pending and settled manually within 3–4 working days."
            action={
              <Button asChild variant="hairline" size="md">
                <Link href={appRoutes.withdraw}>Open the withdrawal flow</Link>
              </Button>
            }
          />
        ) : (
          <WithdrawalList withdrawals={withdrawals} methods={methods} />
        )}
      </section>

      {/* ----------------------------------------------------------- Deposits */}
      {deposits.length > 0 && (
        <section aria-labelledby="deposits-heading" className="flex flex-col gap-4">
          <h2 id="deposits-heading" className="text-lg font-semibold">
            Deposits
          </h2>
          <DepositList deposits={deposits} methods={methods} />
        </section>
      )}

      {/* ---------------------------------------------------- Recent activity */}
      <section aria-labelledby="activity-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="activity-heading" className="text-lg font-semibold">
              Recent activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Deposits, withdrawals, investment funding, profit credits and principal returns.
            </p>
          </div>

          {transactions.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href={appRoutes.walletActivity}>
                View all
                <ArrowRight />
              </Link>
            </Button>
          )}
        </div>

        {transactionsError ? (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/25 bg-destructive-surface p-5 text-sm text-foreground"
          >
            {transactionsError}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Your transaction history will appear here."
            note="This is not an error — it means nothing has moved on your account yet."
            action={
              <Button asChild variant="hairline" size="md">
                <Link href={appRoutes.invest}>Explore Investment Plans</Link>
              </Button>
            }
          />
        ) : (
          <TransactionList
            transactions={transactions}
            withdrawalsByTransactionId={indexWithdrawalsByTransaction(withdrawals)}
          />
        )}
      </section>

      {/* -------------------------------------------------------- Help */}
      <section aria-labelledby="wallet-help-heading" className="flex flex-col gap-5">
        <h2 id="wallet-help-heading" className="text-lg font-semibold">
          How deposits and withdrawals work
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          {walletExplainers.map((explainer) => (
            <FeatureCard
              key={explainer.id}
              icon={explainer.icon}
              title={explainer.title}
              description={explainer.description}
              points={explainer.points}
            />
          ))}
        </div>

        <div className="panel-sunken flex gap-3.5 p-5">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-4.5 shrink-0 text-brand"
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold">How your funds are protected</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your browser never holds a signing key and never broadcasts a
              transaction. A withdrawal is submitted as a request to the server, which
              re-checks your account status, the asset and network, the destination
              address, the minimum, the live exchange quote and your available
              balance before anything is recorded.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function WalletAction({
  href,
  icon: Icon,
  label,
  description,
  color,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: "withdrawal" | "neutral";
}) {
  const colorMap = {
    withdrawal: { icon: "text-withdrawal", bg: "bg-withdrawal-surface", border: "border-withdrawal-border" },
    neutral: { icon: "text-muted-foreground", bg: "bg-surface-2", border: "border-hairline" },
  };
  const c = colorMap[color];

  return (
    <Link
      href={href}
      className={`group/qa flex flex-col items-center gap-3 rounded-2xl border ${c.border} bg-surface-1 p-4 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift active:translate-y-0`}
    >
      <span
        className={`grid size-11 place-items-center rounded-xl border ${c.border} ${c.bg} ${c.icon} transition-transform duration-300 group-hover/qa:scale-110`}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-[0.65rem] text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}