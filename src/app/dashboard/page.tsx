import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bell,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActiveInvestmentPanel } from "@/components/investment/active-investment-panel";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { InvestmentPlanCard } from "@/components/investment/investment-plan-card";
import { Button } from "@/components/ui/button";
import { investmentPlans as catalogueFallback } from "@/config/investment-plans";
import { featureFlags } from "@/config/site";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import {
  getActiveInvestment,
  getInvestmentPlans,
  getUserBalance,
  getUserTransactions,
  resolveOrEmpty,
} from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { EMPTY_BALANCE } from "@/types/balance";

export const metadata: Metadata = {
  title: "Overview",
  description: "Your TESLA Electronics account summary.",
  robots: { index: false, follow: false },
};

/**
 * Dashboard overview.
 *
 * Every figure comes from the ledger (`user_balances`, maintained server-side
 * from settled transactions) or from nothing at all. No value on this page is
 * inferred from plan terms, so a pre-launch account reads $0.00 across the board
 * — which is accurate, not a placeholder.
 */
export default async function DashboardOverviewPage() {
  const account = await getAccountMode();
  const user = getAccountUser(account);
  const preview = isPreviewMode(account);

  const [balanceResult, activeResult, plansResult, transactionsResult] =
    await Promise.all([
      getUserBalance(),
      getActiveInvestment(),
      getInvestmentPlans(),
      getUserTransactions({ limit: 5 }),
    ]);

  const { data: balance } = resolveOrEmpty(balanceResult, {
    userId: user?.id ?? "preview",
    updatedAt: "",
    ...EMPTY_BALANCE,
  });

  const { data: activeInvestment } = resolveOrEmpty(activeResult, null);
  const { data: recentTransactions } = resolveOrEmpty(transactionsResult, []);
  const plans =
    plansResult.status === "ready" ? plansResult.data : catalogueFallback;

  const firstName = user?.fullName?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Account overview"}
        description={
          preview
            ? "This is the dashboard interface. Supabase is not connected yet, so there is no account data behind these panels — every figure reads zero because that is the true state, not a placeholder."
            : "A summary of your account. Balances update from settled transactions only."
        }
        badge={
          preview ? (
            <StatusPill tone="gold" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
      />

      {/* ------------------------------------------------------------- Figures */}
      <section aria-labelledby="figures-heading" className="flex flex-col gap-5">
        <h2 id="figures-heading" className="sr-only">
          Account figures
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Available Balance"
            value={formatCurrency(balance.availableCents)}
            icon={Wallet}
            note="Deposits are not yet enabled."
            emphasis
            index={0}
          />
          <StatCard
            label="Total Invested"
            value={formatCurrency(balance.totalInvestedCents)}
            icon={TrendingUp}
            note="No capital has been committed."
            index={1}
          />
          <StatCard
            label="Total Profit"
            value={formatCurrency(balance.totalProfitCents)}
            icon={Banknote}
            note="Credited profit only — never projected."
            index={2}
          />
          <StatCard
            label="Active Investment"
            value={activeInvestment ? "1" : "None"}
            icon={Receipt}
            note={
              activeInvestment
                ? "One position in progress."
                : "No active investment."
            }
            index={3}
          />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground/70">
          Balances are derived server-side from settled transactions. They are
          never calculated from a plan&apos;s stated terms.
        </p>
      </section>

      {/* ------------------------------------------------ Position and history */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="active-investment-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="active-investment-heading" className="text-lg font-medium">
            Active investment
          </h2>
          <ActiveInvestmentPanel investment={activeInvestment} plans={plans} />
        </section>

        <section
          aria-labelledby="recent-activity-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 id="recent-activity-heading" className="text-lg font-medium">
              Recent activity
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href="/dashboard/transactions">
                View all
                <ArrowRight />
              </Link>
            </Button>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              size="sm"
              title="No transactions"
              description="Your account has no transaction history."
              note="Nothing has been deposited, invested, paid or withdrawn — the platform is not processing money yet."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-white/6 overflow-hidden rounded-xl border border-white/10">
              {recentTransactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <span className="text-sm">{transaction.type}</span>
                  <span data-numeric className="text-sm font-medium">
                    {formatCurrency(transaction.amountCents, { signed: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* --------------------------------------------------------- Next steps */}
      <section aria-labelledby="next-steps-heading" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="next-steps-heading" className="text-lg font-medium">
            Published plans
          </h2>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard/investments">
              All plans
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {plans.slice(0, 2).map((plan) => (
            <InvestmentPlanCard
              key={plan.id}
              plan={plan}
              detail="compact"
              animate={false}
            />
          ))}

          <div className="surface flex flex-col justify-between gap-5 rounded-2xl border border-white/10 p-6">
            <div className="flex flex-col gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground"
              >
                <Bell className="size-4" />
              </span>
              <h3 className="text-base font-medium">
                {featureFlags.depositsEnabled
                  ? "Fund your account"
                  : "Deposits coming soon"}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                Funding is not available yet. When deposits open, it will be
                announced in your notifications first.
              </p>
            </div>

            <Button asChild variant="hairline" size="md" className="w-full">
              <Link href="/dashboard/deposit">View deposit status</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
