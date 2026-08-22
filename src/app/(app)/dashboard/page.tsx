import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Compass,
  ScrollText,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { DashboardGuide, type GuideStep } from "@/components/dashboard/dashboard-guide";
import { FeatureCard } from "@/components/dashboard/feature-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { RevealGroup, RevealItem } from "@/components/common/reveal";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import {
  dashboardGuideSteps,
  platformExplainers,
  walletExplainers,
} from "@/config/content";
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
  description: "Your starting point on TESLA Electronics.",
  robots: { index: false, follow: false },
};

/**
 * Dashboard.
 *
 * Deliberately *not* a financial transaction page. Money lives in Wallet, the
 * marketplace lives in Invest, and positions live in Investments — duplicating any
 * of them here would leave four places showing the same numbers and no obvious
 * place to act.
 *
 * What this page does instead: welcome the user, explain how the platform works,
 * and point at the right next step. The only figures shown are three high-level
 * ones, each read from the ledger, so a pre-launch account reads zero — which is
 * accurate rather than a placeholder.
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
        title={firstName ? `Welcome back, ${firstName}` : "Welcome to TESLA Electronics"}
        description="This is your starting point for exploring the platform: how investing works here, what each area is for, and what to do next. Your money and your positions live in Wallet and Investments."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
        actions={
          <Button asChild variant="accent" size="md">
            <Link href={appRoutes.invest}>
              Explore Plans
              <ArrowRight />
            </Link>
          </Button>
        }
      />

      {/* ------------------------------------------------ High-level figures */}
      <section aria-labelledby="account-summary-heading" className="flex flex-col gap-4">
        <h2 id="account-summary-heading" className="sr-only">
          Account summary
        </h2>

        <RevealGroup className="grid gap-4 sm:grid-cols-3" stagger={0.07}>
          <RevealItem className="flex">
            <StatCard
              label="Wallet Balance"
              value={formatCurrency(balance.availableCents)}
              icon={Wallet}
              note="Available to invest or withdraw."
              emphasis
            />
          </RevealItem>
          <RevealItem className="flex">
            <StatCard
              label="Active Investments"
              value={String(activeCount)}
              icon={TrendingUp}
              note={
                activeCount === 0
                  ? "You haven't activated an investment yet."
                  : "In progress right now."
              }
            />
          </RevealItem>
          <RevealItem className="flex">
            <StatCard
              label="Profit Credited"
              value={formatCurrency(balance.totalProfitCents)}
              icon={Banknote}
              note="Payments actually received — never projected."
            />
          </RevealItem>
        </RevealGroup>

        <p className="text-xs leading-relaxed text-subtle-foreground">
          Figures come from your ledger, which is maintained server-side from
          settled transactions. They are never calculated from a plan&apos;s stated
          terms.
        </p>
      </section>

      {/* ------------------------------------------------- Onboarding state */}
      {!hasInvestment && (
        <EmptyState
          title="You haven't activated an investment yet"
          description="Start by reading the plan terms in Invest. When you've chosen one, fund your wallet and activate it — your progress will then appear in Investments."
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
          />
          <FeatureCard
            icon={Wallet}
            title="Wallet"
            description="Your balance, plus the only place to deposit and withdraw. Every movement of value is listed here."
            href={appRoutes.wallet}
            linkLabel="Open wallet"
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
              className={index === 0 ? "lg:col-span-2" : undefined}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ Wallet basics */}
      <section aria-labelledby="wallet-basics-heading" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2
              id="wallet-basics-heading"
              className="text-xl font-semibold sm:text-2xl"
            >
              Deposits and withdrawals
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Both live in your Wallet. Crypto transfers cannot be reversed, so both
              flows are built to make the asset and network unambiguous.
            </p>
          </div>

          <Button asChild variant="hairline" size="md">
            <Link href={appRoutes.wallet}>
              Open Wallet
              <ArrowRight />
            </Link>
          </Button>
        </div>

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
          The figures on every plan are <strong>stated terms</strong> — what the plan
          proposes to pay if it performs as published. Nothing on this platform is
          financial, investment, tax or legal advice.
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
