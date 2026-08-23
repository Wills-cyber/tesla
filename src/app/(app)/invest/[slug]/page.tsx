import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { InvestmentActivationPanel } from "@/components/investment/investment-activation-panel";
import { InvestmentProgress } from "@/components/investment/investment-progress";
import { PlanImage } from "@/components/investment/plan-image";
import { PlanRiskNotice } from "@/components/investment/plan-details-dialog";
import { PlanTermsList } from "@/components/investment/plan-terms-list";
import { getPlanTerms } from "@/components/investment/plan-terms";
import { PlanStatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { featureFlags } from "@/config/site";
import {
  getInvestmentPlanBySlug,
  getUserBalance,
  resolveOrEmpty,
} from "@/lib/data";
import { formatCurrency, formatDuration } from "@/lib/format";
import { EMPTY_BALANCE } from "@/types/balance";

export async function generateMetadata({
  params,
}: PageProps<"/invest/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { data: plan } = resolveOrEmpty(await getInvestmentPlanBySlug(slug), null);

  if (!plan) return { title: "Plan not found", robots: { index: false } };

  return {
    title: plan.name,
    description: plan.summary,
    robots: { index: false, follow: false },
  };
}

/**
 * Investment plan detail.
 *
 * The full term sheet for one plan, plus the proposed division of its term into
 * payment periods. Every period reads `Scheduled` because this describes a
 * specification, not a statement of account — `InvestmentProgress` renders it from
 * the plan rather than from payment records, and says so.
 *
 * "Start Investment" is the one action on this page, and it never fabricates an
 * investment. Three conditions have to hold before activation is even offered: the
 * plan is `open`, activation is enabled, and the wallet covers the entry amount.
 * When any of them fails the button routes to Wallet and the panel explains which
 * one — because a disabled button that says nothing is just a dead end.
 */
export default async function InvestmentPlanPage({
  params,
}: PageProps<"/invest/[slug]">) {
  const { slug } = await params;

  const [planResult, balanceResult] = await Promise.all([
    getInvestmentPlanBySlug(slug),
    getUserBalance(),
  ]);

  const { data: plan } = resolveOrEmpty(planResult, null);
  if (!plan) notFound();

  const { data: balance } = resolveOrEmpty(balanceResult, {
    userId: "preview",
    updatedAt: "",
    ...EMPTY_BALANCE,
  });

  const isOpen = plan.status === "open";
  const activationEnabled = featureFlags.investmentActivationEnabled;

  // Funds a pending withdrawal has reserved are not spendable. The same dollar
  // must not be able to back both a payout request and an investment — the
  // database enforces this too, in `activate_investment`.
  const spendableCents = Math.max(
    0,
    balance.availableCents - balance.pendingWithdrawalCents
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
          <Link href={appRoutes.invest}>
            <ArrowLeft />
            All plans
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow={`${plan.vehicleModel} · ${plan.vehicleType}`}
        title={plan.name}
        description={plan.summary}
        badge={<PlanStatusPill status={plan.status} className="self-start" />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        {/* ------------------------------------------------------- Term sheet */}
        <div className="flex flex-col gap-6">
          {/* Large vehicle image. Same asset as the marketplace card, given the
              full column width and eager-loaded as the page's LCP element. */}
          <PlanImage
            src={plan.imageUrl}
            alt={plan.vehicleModel}
            sizes="(min-width: 1024px) 55vw, 92vw"
            priority
            className="panel overflow-hidden"
          />

          <section
            aria-labelledby="stated-terms-heading"
            className="panel flex flex-col gap-5 p-6 sm:p-7"
          >
            <h2 id="stated-terms-heading" className="text-lg font-semibold">
              Stated terms
            </h2>
            <PlanTermsList terms={getPlanTerms(plan)} layout="grid" />
          </section>

          <section
            aria-labelledby="schedule-heading"
            className="panel flex flex-col gap-5 p-6 sm:p-7"
          >
            <div className="flex items-center gap-2.5">
              <CalendarClock aria-hidden="true" className="size-4 text-brand" />
              <h2 id="schedule-heading" className="text-lg font-semibold">
                Payment schedule
              </h2>
            </div>

            <InvestmentProgress payments={[]} plan={plan} currency={plan.currency} />
          </section>

          <PlanRiskNotice />
        </div>

        {/* ----------------------------------------------------------- Action */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
          <section
            aria-labelledby="activate-heading"
            className="panel-brand flex flex-col gap-5 p-6"
          >
            <div className="flex flex-col gap-1">
              <span className="eyebrow">Entry amount</span>
              <p
                data-numeric
                className="text-3xl font-semibold tracking-tight text-foreground"
              >
                {formatCurrency(plan.investmentAmountCents, {
                  compactDecimals: true,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(plan.durationDays)} ·{" "}
                {plan.paymentPeriods} payment periods
              </p>
            </div>

            <dl className="flex flex-col gap-3 border-t border-brand-border pt-5">
              <SummaryRow
                label="Completion amount"
                value={formatCurrency(plan.completionAmountCents, {
                  compactDecimals: true,
                })}
                emphasis
              />
              <SummaryRow
                label="Available to invest"
                value={formatCurrency(spendableCents)}
              />
            </dl>

            {/* The single action on this page. Everything it may do — and every
                check that decides whether it may — lives in the panel's action and
                in `activate_investment`; this page only supplies the plan and the
                spendable balance. */}
            <InvestmentActivationPanel
              plan={plan}
              spendableCents={spendableCents}
              activationEnabled={isOpen && activationEnabled}
            />
          </section>

          <section
            aria-labelledby="next-heading"
            className="panel flex flex-col gap-3 p-6"
          >
            <h2 id="next-heading" className="text-sm font-semibold">
              Elsewhere
            </h2>
            <div className="flex flex-col gap-2">
              <Button asChild variant="hairline" size="md" className="justify-start">
                <Link href={appRoutes.investments}>View my investments</Link>
              </Button>
              <Button asChild variant="ghost" size="md" className="justify-start">
                <Link href={appRoutes.invest}>Compare other plans</Link>
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        data-numeric
        className={
          emphasis
            ? "text-base font-semibold text-brand-emphasis"
            : "text-sm font-semibold text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
