import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Compass, TrendingUp, Wallet } from "lucide-react";

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
 * My Investments page — premium portfolio overview.
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
      <div className="flex flex-col gap-3">
        <p className="eyebrow text-brand-emphasis">Investments</p>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-[2.25rem]">
              My investments
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Every investment your account holds, with real payment schedules and progress.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {preview && (
              <StatusPill tone="brand" dot className="self-start">
                UI Preview · No account connected
              </StatusPill>
            )}
            <Button asChild variant="hairline" size="md">
              <Link href={appRoutes.invest}>
                <Compass />
                Explore Plans
              </Link>
            </Button>
          </div>
        </div>
      </div>

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