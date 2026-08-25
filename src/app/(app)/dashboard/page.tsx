import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Receipt,
  ScrollText,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { BalanceOverview } from "@/components/dashboard/balance-overview";
import { DashboardGuide, type GuideStep } from "@/components/dashboard/dashboard-guide";
import { FeatureCard } from "@/components/dashboard/feature-card";
import { InvestmentOverview } from "@/components/dashboard/investment-overview";
import { PageHeader } from "@/components/dashboard/page-header";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { TransactionList } from "@/components/wallet/transaction-list";
import { Button } from "@/components/ui/button";
import { dashboardGuideSteps, platformExplainers } from "@/config/content";
import { appRoutes, legalRoutes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import {
  getInvestmentPlans,
  getPaymentMethods,
  getUserBalance,
  getUserInvestmentsWithPayments,
  getUserTransactions,
  getUserWithdrawals,
  resolveOrEmpty,
} from "@/lib/data";
import { indexWithdrawalsByTransaction } from "@/lib/wallet/receipts";
import { EMPTY_BALANCE } from "@/types/balance";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your starting point on TESLA Electronics.",
  robots: { index: false, follow: false },
};

/**
 * Dashboard.
 *
 * Finance first: the page opens with what the account holds — available
 * balance, capital invested, profit credited, withdrawals pending — then the
 * four quick actions, then the investments actually running, then the latest
 * movements on the ledger. Everything below that explains how the platform
 * works.
 *
 * Every figure is read from the ledger (`user_balances`, `transactions`,
 * `investments` + `investment_payments`), never derived from a plan's stated
 * terms. A new account reads zero — the true state, not a placeholder.
 */
export default async function DashboardPage() {
  const account = await getAccountMode();
  const user = getAccountUser(account);
  const preview = isPreviewMode(account);

  const [
    balanceResult,
    investmentsResult,
    plansResult,
    transactionsResult,
    withdrawalsResult,
    methodsResult,
  ] = await Promise.all([
    getUserBalance(),
    getUserInvestmentsWithPayments(),
    getInvestmentPlans(),
    getUserTransactions({ limit: 5 }),
    getUserWithdrawals(5),
    getPaymentMethods(),
  ]);

  const { data: balance } = resolveOrEmpty(balanceResult, {
    userId: user?.id ?? "preview",
    updatedAt: "",
    ...EMPTY_BALANCE,
  });

  const { data: investments } = resolveOrEmpty(investmentsResult, []);
  const { data: plans } = resolveOrEmpty(plansResult, []);
  const { data: transactions } = resolveOrEmpty(transactionsResult, []);
  const { data: withdrawals } = resolveOrEmpty(withdrawalsResult, []);
  const { data: methods } = resolveOrEmpty(methodsResult, []);

  const firstName = user?.fullName?.split(" ")[0];
  const hasInvestment = investments.length > 0;
  const hasBalance = balance.availableCents > 0;
  const activeCount = investments.filter(
    (investment) => investment.status === "active"
  ).length;

  /**
   * Step completion is evidence-based: a step is ticked only where a backend
   * record proves it. Nothing is marked done to make the list look progressed.
   */
  const steps: GuideStep[] = dashboardGuideSteps.map((step, index) => ({
    title: step.title,
    description: step.description,
    icon: step.icon,
    action: { label: step.actionLabel, href: appRoutes[step.route] },
    note: step.note,
    complete:
      (index === 2 && hasBalance) ||
      (index === 3 && hasInvestment) ||
      (index === 4 && hasInvestment && activeCount > 0),
  }));

  return (
    <>
      {/* --------------------------------------------------------- Welcome */}
      <PageHeader
        eyebrow="Dashboard"
        title={
          firstName ? `Welcome back, ${firstName}` : "Welcome to TESLA Electronics"
        }
        description="Your balances, your investments and the latest movement on your account — and, below them, how everything works."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
      />

      {/* ------------------------------------------------- Account balances */}
      <BalanceOverview balance={balance} />

      {/* ---------------------------------------------------- Quick actions */}
      <QuickActions methods={methods} />

      {/* -------------------------------------------------- Investments */}
      <InvestmentOverview
        investments={investments}
        plans={plans}
        balance={balance}
      />

      {/* --------------------------------------------------- Recent activity */}
      <section aria-labelledby="recent-activity-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="recent-activity-heading" className="text-lg font-semibold">
              Recent activity
            </h2>
            <p className="text-sm text-muted-foreground">
              The latest deposits, withdrawals, funding and profit credits.
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

        {transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            size="sm"
            title="No transactions yet"
            description="Nothing has moved on your account. Every entry that appears here corresponds to a real recorded event."
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

      {/* -------------------------------------------------------- Start here */}
      <section aria-labelledby="start-here-heading" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 id="start-here-heading" className="text-xl font-semibold sm:text-2xl">
            Start here
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Five steps from reading the terms to tracking a live investment. Each
            one takes you to the area that handles it.
          </p>
        </div>

        <DashboardGuide steps={steps} />
      </section>

      {/* ------------------------------------------------ Where things live */}
      <section aria-labelledby="areas-heading" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 id="areas-heading" className="text-xl font-semibold sm:text-2xl">
            What each area is for
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Four destinations, one job each. Nothing important is hidden behind a
            menu.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={Compass}
            title="Invest"
            description={`Every available investment plan, with full terms. ${plans.length} published right now.`}
            href={appRoutes.invest}
            linkLabel="Browse plans"
            accent
          />
          <FeatureCard
            icon={TrendingUp}
            title="Investments"
            description="Only the investments you actually hold, split into active, pending and completed, each with its real payment schedule."
            href={appRoutes.investments}
            linkLabel="View investments"
            tone="invest"
          />
          <FeatureCard
            icon={Wallet}
            title="Wallet"
            description="Your balance, plus the only place to deposit and withdraw. Every movement of value is listed here."
            href={appRoutes.wallet}
            linkLabel="Open wallet"
            tone="success"
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Profile"
            description="Your account details, security settings, notification preferences and appearance."
            href={appRoutes.profile}
            linkLabel="Open profile"
          />
        </div>
      </section>

      {/* ------------------------------------------------- How things work */}
      <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 id="how-it-works-heading" className="text-xl font-semibold sm:text-2xl">
            How investing works here
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            The mechanics, in plain terms — how a plan is structured, how a payment
            period is settled, and how the term runs to completion.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {platformExplainers.map((explainer, index) => (
            <FeatureCard
              key={explainer.id}
              icon={explainer.icon}
              title={explainer.title}
              description={explainer.description}
              points={explainer.points}
              tone={EXPLAINER_TONES[index % EXPLAINER_TONES.length]}
              className={index === 0 ? "lg:col-span-2" : undefined}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- Legal */}
      <section
        aria-labelledby="legal-heading"
        className="panel-sunken flex flex-col gap-4 p-6 sm:p-7"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-surface-1 text-muted-foreground"
          >
            <ScrollText className="size-4" />
          </span>
          <h2 id="legal-heading" className="text-base font-semibold">
            Legal
          </h2>
        </div>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
          The figures on every plan are <strong>stated terms</strong> — what the
          plan proposes to pay if it performs as published. Nothing on this
          platform is financial, investment, tax or legal advice.
        </p>

        <p className="max-w-3xl text-xs leading-relaxed text-subtle-foreground">
          {siteConfig.affiliationDisclaimer}
        </p>

        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="hairline" size="md">
            <Link href={legalRoutes.terms}>Terms</Link>
          </Button>
          <Button asChild variant="ghost" size="md">
            <Link href={legalRoutes.privacy}>Privacy</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

/**
 * Cycles the icon-chip hue down the explainer grids. Stable order, so a card's
 * colour never moves between renders.
 */
const EXPLAINER_TONES = ["brand", "invest", "success", "warning"] as const;
