import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Compass,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  Wallet,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

import { DashboardGuide, type GuideStep } from "@/components/dashboard/dashboard-guide";
import { FeatureCard } from "@/components/dashboard/feature-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { RevealGroup, RevealItem } from "@/components/common/reveal";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { dashboardGuideSteps } from "@/config/content";
import { appRoutes, legalRoutes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getAccountMode, getAccountUser, isPreviewMode } from "@/lib/auth/session";
import {
  getInvestmentPlans,
  getUserBalance,
  getUserInvestments,
  resolveOrEmpty,
} from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { EMPTY_BALANCE } from "@/types/balance";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your TESLA Electronics investment dashboard.",
  robots: { index: false, follow: false },
};

/**
 * Dashboard — completely redesigned for a premium fintech experience.
 *
 * Transformed from an educational landing page into a true financial dashboard
 * that immediately communicates the user's financial position and provides
 * quick access to every action.
 *
 * Every figure is read from the ledger. Nothing is fabricated.
 */
export default async function DashboardPage() {
  const account = await getAccountMode();
  const user = getAccountUser(account);
  const preview = isPreviewMode(account);

  const [balanceResult, investmentsResult, plansResult] = await Promise.all([
    getUserBalance(),
    getUserInvestments(),
    getInvestmentPlans(),
  ]);

  const { data: balance } = resolveOrEmpty(balanceResult, {
    userId: user?.id ?? "preview",
    updatedAt: "",
    ...EMPTY_BALANCE,
  });

  const { data: investments } = resolveOrEmpty(investmentsResult, []);
  const { data: plans } = resolveOrEmpty(plansResult, []);

  const activeCount = investments.filter(
    (investment) => investment.status === "active"
  ).length;

  const firstName = user?.fullName?.split(" ")[0];
  const hasInvestment = investments.length > 0;
  const hasBalance = balance.availableCents > 0;

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
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {preview && (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          )}
          <div className="flex flex-col gap-1.5">
            <p className="eyebrow text-brand-emphasis">Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-[2.25rem]">
              {firstName ? `Welcome back, ${firstName}` : "Welcome to TESLA Electronics"}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Your financial overview at a glance. Manage your investments, wallet, and account from one place.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------- Financial Overview Cards */}
      <section aria-labelledby="financial-summary-heading">
        <h2 id="financial-summary-heading" className="sr-only">
          Financial summary
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Available Balance — most prominent */}
          <div className="panel-inverse relative col-span-full flex flex-col gap-5 overflow-hidden p-6 sm:p-7 lg:col-span-2">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-gold-500/12 blur-3xl"
            />
            <div aria-hidden="true" className="grid-field absolute inset-0 opacity-[0.04]" />

            <div className="relative flex flex-col gap-1.5">
              <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-surface-inverse-foreground/60 uppercase">
                Available Balance
              </p>
              <p
                data-numeric
                className="text-4xl leading-none font-semibold tracking-tight text-surface-inverse-foreground sm:text-5xl"
              >
                {formatCurrency(balance.availableCents, {
                  currency: balance.currency,
                })}
              </p>
              {balance.pendingWithdrawalCents > 0 ? (
                <p className="text-xs text-surface-inverse-foreground/65">
                  <span data-numeric className="font-semibold">
                    {formatCurrency(balance.pendingWithdrawalCents)}
                  </span>{" "}
                  reserved ·{" "}
                  <span data-numeric className="font-semibold">
                    {formatCurrency(balance.availableCents - balance.pendingWithdrawalCents)}
                  </span>{" "}
                  spendable
                </p>
              ) : (
                <p className="text-xs text-surface-inverse-foreground/60">
                  Total funds available in your wallet
                </p>
              )}
            </div>

            <div className="relative flex flex-wrap gap-3">
              <Button asChild variant="accent" size="md">
                <Link href={appRoutes.wallet}>
                  <ArrowDownToLine />
                  Deposit
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="md"
                className="border-white/20 bg-white/10 text-surface-inverse-foreground hover:bg-white/20 hover:text-surface-inverse-foreground"
              >
                <Link href={appRoutes.withdraw}>
                  <ArrowUpFromLine />
                  Withdraw
                </Link>
              </Button>
            </div>
          </div>

          {/* Total Invested */}
          <div className="panel-tint tint-investment flex h-full flex-col gap-3 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Total Invested
              </p>
              <span aria-hidden="true" className="tint-chip grid size-9 place-items-center rounded-xl">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <div className="mt-auto flex flex-col gap-1.5">
              <p data-numeric className="text-2xl leading-none font-semibold tracking-tight tint-ink sm:text-[1.75rem]">
                {formatCurrency(balance.totalInvestedCents)}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeCount > 0
                  ? `${activeCount} active ${activeCount === 1 ? "investment" : "investments"}`
                  : "No active investments"}
              </p>
            </div>
          </div>

          {/* Total Profit */}
          <div className="panel-tint tint-profit flex h-full flex-col gap-3 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Total Profit
              </p>
              <span aria-hidden="true" className="tint-chip grid size-9 place-items-center rounded-xl">
                <Banknote className="size-4" />
              </span>
            </div>
            <div className="mt-auto flex flex-col gap-1.5">
              <p data-numeric className="text-2xl leading-none font-semibold tracking-tight tint-ink sm:text-[1.75rem]">
                {formatCurrency(balance.totalProfitCents)}
              </p>
              <p className="text-xs text-muted-foreground">
                Profit actually credited
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- Quick Actions */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="sr-only">
          Quick actions
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            href={appRoutes.wallet}
            icon={ArrowDownToLine}
            label="Deposit"
            description="Fund your wallet"
            color="deposit"
          />
          <QuickAction
            href={appRoutes.withdraw}
            icon={ArrowUpFromLine}
            label="Withdraw"
            description="Request payout"
            color="withdrawal"
          />
          <QuickAction
            href={appRoutes.invest}
            icon={Sparkles}
            label="Invest"
            description="Browse plans"
            color="investment"
          />
          <QuickAction
            href={appRoutes.walletActivity}
            icon={LayoutDashboard}
            label="Activity"
            description="Transactions"
            color="neutral"
          />
        </div>
      </section>

      {/* ------------------------------------------------- Investment Progress */}
      <section aria-labelledby="investment-progress-heading" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="investment-progress-heading" className="text-xl font-semibold sm:text-2xl">
              Investment Progress
            </h2>
            <p className="text-sm text-muted-foreground">
              Track your active investments and returns.
            </p>
          </div>

          <Button asChild variant="hairline" size="md">
            <Link href={appRoutes.investments}>
              View All Investments
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          <RevealItem className="flex">
            <StatCard
              label="Active Investments"
              value={String(activeCount)}
              icon={TrendingUp}
              note={
                activeCount === 0
                  ? "You haven&apos;t activated an investment yet."
                  : "In progress right now."
              }
              tone="info"
            />
          </RevealItem>
          <RevealItem className="flex">
            <StatCard
              label="Profit Credited"
              value={formatCurrency(balance.totalProfitCents)}
              icon={Banknote}
              note="Payments actually received — never projected."
              tone="success"
            />
          </RevealItem>
          <RevealItem className="flex">
            <StatCard
              label="Wallet Balance"
              value={formatCurrency(balance.availableCents)}
              icon={Wallet}
              note="Available to invest or withdraw."
              tone="brand"
            />
          </RevealItem>
        </RevealGroup>

        <p className="text-xs leading-relaxed text-subtle-foreground">
          Figures come from your ledger, which is maintained server-side from
          settled transactions. They are never calculated from a plan&apos;s stated terms.
        </p>
      </section>

      {/* ------------------------------------------------- Onboarding state */}
      {!hasInvestment && (
        <EmptyState
          title="You haven&apos;t activated an investment yet"
          description="Start by reading the plan terms in Invest. When you&apos;ve chosen one, fund your wallet and activate it &mdash; your progress will then appear in Investments."
          note={siteConfig.prelaunchNotice}
          action={
            <>
              <Button asChild variant="accent" size="md">
                <Link href={appRoutes.invest}>Explore Investment Plans</Link>
              </Button>
              <Button asChild variant="hairline" size="md">
                <Link href={appRoutes.wallet}>Open Wallet</Link>
              </Button>
            </>
          }
        />
      )}

      {/* ------------------------------------------------- Start here */}
      <section aria-labelledby="start-here-heading" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 id="start-here-heading" className="text-xl font-semibold sm:text-2xl">
            Start here
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Five steps from reading the terms to tracking a live investment.
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
            Four destinations, one job each.
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
            description="Only the investments you actually hold, split into active, pending and completed."
            href={appRoutes.investments}
            linkLabel="View investments"
            tone="info"
          />
          <FeatureCard
            icon={Wallet}
            title="Wallet"
            description="Your balance, plus the only place to deposit and withdraw."
            href={appRoutes.wallet}
            linkLabel="Open wallet"
            tone="success"
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Profile"
            description="Your account details, security settings, and preferences."
            href={appRoutes.profile}
            linkLabel="Open profile"
          />
        </div>
      </section>

      {/* ------------------------------------------------- Legal */}
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
          The figures on every plan are <strong>stated terms</strong> — what the plan
          proposes to pay if it performs as published.
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

/* ------------------------------------------------------- Quick Action Component */

function QuickAction({
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
  color: "deposit" | "withdrawal" | "investment" | "neutral";
}) {
  const colorMap = {
    deposit: {
      bg: "bg-deposit-surface",
      icon: "text-deposit",
      border: "border-deposit-border",
      hover: "hover:border-deposit-border hover:shadow-[0_0_20px_-8px_var(--deposit)]",
    },
    withdrawal: {
      bg: "bg-withdrawal-surface",
      icon: "text-withdrawal",
      border: "border-withdrawal-border",
      hover: "hover:border-withdrawal-border hover:shadow-[0_0_20px_-8px_var(--withdrawal)]",
    },
    investment: {
      bg: "bg-investment-surface",
      icon: "text-investment-accent",
      border: "border-investment-border",
      hover: "hover:border-investment-border hover:shadow-[0_0_20px_-8px_var(--investment-accent)]",
    },
    neutral: {
      bg: "bg-surface-2",
      icon: "text-muted-foreground",
      border: "border-hairline",
      hover: "hover:border-hairline-strong hover:shadow-lift",
    },
  };

  const c = colorMap[color];

  return (
    <Link
      href={href}
      className={`group/qa flex flex-col items-center gap-3 rounded-2xl border ${c.border} ${c.bg} bg-surface-1 p-4 text-center shadow-card transition-all duration-300 ${c.hover} hover:-translate-y-1 active:translate-y-0`}
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