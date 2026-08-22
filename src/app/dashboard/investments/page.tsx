import type { Metadata } from "next";
import { Info } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ActiveInvestmentPanel } from "@/components/investment/active-investment-panel";
import { InvestmentPlanCard } from "@/components/investment/investment-plan-card";
import { StatusPill } from "@/components/common/status-pill";
import { investmentPlans as catalogueFallback } from "@/config/investment-plans";
import { isPreviewMode, getAccountMode } from "@/lib/auth/session";
import {
  getActiveInvestment,
  getInvestmentPlans,
  getUserInvestments,
  resolveOrEmpty,
} from "@/lib/data";

export const metadata: Metadata = {
  title: "Investments",
  description: "Available investment plans and your active positions.",
  robots: { index: false, follow: false },
};

/**
 * Investments page.
 *
 * Two distinct things sit on this page and the headings keep them apart: the
 * *catalogue* of published plans (marketing terms) and the user's *positions*
 * (real activity). Conflating the two is exactly how a pre-launch product ends up
 * implying it has investors.
 */
export default async function DashboardInvestmentsPage() {
  const account = await getAccountMode();
  const preview = isPreviewMode(account);

  const [plansResult, activeResult, investmentsResult] = await Promise.all([
    getInvestmentPlans(),
    getActiveInvestment(),
    getUserInvestments(),
  ]);

  const plans =
    plansResult.status === "ready" ? plansResult.data : catalogueFallback;
  const { data: activeInvestment } = resolveOrEmpty(activeResult, null);
  const { data: investments } = resolveOrEmpty(investmentsResult, []);

  return (
    <>
      <PageHeader
        title="Investments"
        description="Review the published plan terms and track any position you hold."
        badge={
          preview ? (
            <StatusPill tone="gold" dot className="self-start">
              UI Preview · No account connected
            </StatusPill>
          ) : null
        }
      />

      {/* ------------------------------------------------------- Your positions */}
      <section
        aria-labelledby="your-investments-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id="your-investments-heading" className="text-lg font-medium">
            Your investments
          </h2>
          <p className="text-sm text-muted-foreground">
            Positions you hold. This reflects real account activity only.
          </p>
        </div>

        <ActiveInvestmentPanel investment={activeInvestment} plans={plans} />

        {investments.length > 1 && (
          <p className="text-xs text-muted-foreground/70">
            {investments.length} positions on record. The most recent active
            position is shown above.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------ Published plans */}
      <section
        aria-labelledby="available-plans-heading"
        className="flex flex-col gap-5 border-t border-white/8 pt-10"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id="available-plans-heading" className="text-lg font-medium">
            Available plans
          </h2>
          <p className="text-sm text-muted-foreground">
            Published fixed-term plans. Figures are stated terms, not guaranteed
            returns.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <InvestmentPlanCard key={plan.id} plan={plan} animate={false} />
          ))}
        </div>

        <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <Info
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-gold-300"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            No plan can be funded at the moment. Activation requires a deposit,
            and deposits will open only once payment processing, account
            verification and the required compliance review are complete.
          </p>
        </div>
      </section>
    </>
  );
}
