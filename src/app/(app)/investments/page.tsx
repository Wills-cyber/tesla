import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Compass, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { InvestmentsTabs } from "@/components/investment/investments-tabs";
import { RevealGroup, RevealItem } from "@/components/common/reveal";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { getAccountMode, isPreviewMode } from "@/lib/auth/session";
import {
  getInvestmentPlans,
  getUserBalance,
  getUserInvestmentsWithPayments,
  resolveOrEmpty,
} from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { EMPTY_BALANCE } from "@/types/balance";

export const metadata: Metadata = {
  title: "My Investments",
  description: "The investments you hold on TESLA Electronics.",
  robots: { index: false, follow: false },
};

/**
 * The user's investments — and nothing else.
 *
 * This page deliberately contains no marketplace content: browsing plans is Invest's
 * job, and mixing the two is exactly how a pre-launch product ends up looking like
 * it has investors. Plans are fetched only so each position can name the plan it was
 * opened against.
 *
 * Every figure comes from the user's own `investments` and `investment_payments`
 * rows. A period is reported paid because a payment record says so — never because
 * time has passed.
 */
export default async function InvestmentsPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const [investmentsResult, plansResult, balanceResult] = await Promise.all([
    getUserInvestmentsWithPayments(),
    getInvestmentPlans(),
    getUserBalance(),
  ]);

  const { data: investments, error } = resolveOrEmpty(investmentsResult, []);
  const { data: plans } = resolveOrEmpty(plansResult, []);
  const { data: balance } = resolveOrEmpty(balanceResult, {
    userId: "preview",
    updatedAt: "",
    ...EMPTY_BALANCE,
  });

  const activeCount = investments.filter(
    (investment) => investment.status === "active"
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Investments"
        title="My investments"
        description="Every investment your account holds, with its real payment schedule and progress. To browse available plans, go to Invest."
        badge={
          preview ? (
            <StatusPill tone="brand" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
        actions={
          <Button asChild variant="hairline" size="md">
            <Link href={appRoutes.invest}>
              <Compass />
              Explore Plans
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="portfolio-heading" className="flex flex-col gap-4">
        <h2 id="portfolio-heading" className="sr-only">
          Investment totals
        </h2>

        <RevealGroup className="grid gap-4 sm:grid-cols-3" stagger={0.07}>
          <RevealItem className="flex">
            <StatCard
              label="Active Investments"
              value={String(activeCount)}
              icon={TrendingUp}
              note={
                investments.length > activeCount
                  ? `${investments.length} on record in total.`
                  : "In progress right now."
              }
              tone="info"
            />
          </RevealItem>
          <RevealItem className="flex">
            <StatCard
              label="Total Invested"
              value={formatCurrency(balance.totalInvestedCents)}
              icon={Wallet}
              note="Capital committed from settled transactions."
              tone="brand"
            />
          </RevealItem>
          <RevealItem className="flex">
            <StatCard
              label="Profit Credited"
              value={formatCurrency(balance.totalProfitCents)}
              icon={Banknote}
              note="Payments actually received."
              tone="success"
            />
          </RevealItem>
        </RevealGroup>
      </section>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/25 bg-destructive-surface p-5 text-sm text-foreground"
        >
          {error}
        </div>
      ) : (
        <InvestmentsTabs investments={investments} plans={plans} />
      )}
    </>
  );
}
