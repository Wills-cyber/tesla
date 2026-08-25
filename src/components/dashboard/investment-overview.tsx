import * as React from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Compass } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { InvestmentStatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { appRoutes } from "@/config/navigation";
import { formatCurrency } from "@/lib/format";
import type { InvestmentWithPayments } from "@/lib/data";
import type { InvestmentPlan } from "@/types/investment";
import type { UserBalance } from "@/types/balance";

type InvestmentOverviewProps = {
  investments: readonly InvestmentWithPayments[];
  plans: readonly InvestmentPlan[];
  balance: UserBalance;
  /** Shows at most this many position cards; the rest stay on /investments. */
  maxCards?: number;
  className?: string;
};

/**
 * The dashboard's investment summary.
 *
 * A compact mirror of /investments: totals on record, then the positions that
 * are actually running, each with its real progress. Every figure comes from
 * the user's own `investments` and `investment_payments` rows — progress is
 * payments received ÷ periods scheduled, never elapsed time, and profit is what
 * the ledger says was credited.
 */
export function InvestmentOverview({
  investments,
  plans,
  balance,
  maxCards = 2,
  className,
}: InvestmentOverviewProps) {
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  const active = investments.filter(
    (investment) => investment.status === "active"
  );
  const completed = investments.filter(
    (investment) => investment.status === "completed"
  );
  const pending = investments.filter(
    (investment) => investment.status === "pending_activation"
  );

  const shown = [...active, ...pending].slice(0, maxCards);
  const hiddenCount = investments.length - shown.length;

  return (
    <section
      aria-labelledby="investment-overview-heading"
      className={className}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 id="investment-overview-heading" className="text-lg font-semibold">
            Your investments
          </h2>
          <p className="text-sm text-muted-foreground">
            Positions on record, with progress measured by payments actually
            received.
          </p>
        </div>

        <Button asChild variant="ghost" size="sm">
          <Link href={appRoutes.investments}>
            View all
            <ArrowRight />
          </Link>
        </Button>
      </div>

      {/* ------------------------------------------------------------ Totals */}
      <dl className="panel mt-4 grid grid-cols-2 divide-hairline sm:grid-cols-4 sm:divide-x">
        <Summary
          label="Active"
          value={String(active.length)}
          hint={pending.length > 0 ? `${pending.length} pending activation` : "Running now"}
        />
        <Summary
          label="Completed"
          value={String(completed.length)}
          hint="Reached end of term"
        />
        <Summary
          label="Total Invested"
          value={formatCurrency(balance.totalInvestedCents, {
            currency: balance.currency,
            compactDecimals: true,
          })}
          hint="Capital committed"
        />
        <Summary
          label="Profit Credited"
          value={formatCurrency(balance.totalProfitCents, {
            currency: balance.currency,
            compactDecimals: true,
          })}
          hint="Actually paid"
          emphasis
        />
      </dl>

      {/* ---------------------------------------------------------- Positions */}
      {investments.length === 0 ? (
        <EmptyState
          icon={Compass}
          size="sm"
          className="mt-4"
          title="No investments yet"
          description="Browse the published plans, review their stated terms, and activate one once your wallet is funded."
          action={
            <Button asChild variant="accent" size="md">
              <Link href={appRoutes.invest}>Explore Investment Plans</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {shown.map((investment) => {
            const plan = planById.get(investment.planId);
            const scheduled = investment.payments.length;
            const paid = investment.payments.filter(
              (payment) => payment.status === "paid"
            ).length;
            const totalPeriods = scheduled || plan?.paymentPeriods || 0;
            const progress =
              totalPeriods > 0 ? (paid / totalPeriods) * 100 : 0;

            return (
              <li key={investment.id}>
                <Link
                  href={appRoutes.investments}
                  className="panel panel-interactive flex h-full flex-col gap-4 rounded-2xl p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="eyebrow">
                        {plan?.vehicleType ?? "Investment"}
                      </span>
                      <h3 className="text-base font-semibold">
                        {plan?.name ?? "Investment position"}
                      </h3>
                    </div>
                    <InvestmentStatusPill status={investment.status} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[0.68rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                        Payments received
                      </span>
                      <span data-numeric className="text-xs font-semibold">
                        {paid} / {totalPeriods || "—"}
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      aria-label={`${paid} of ${totalPeriods} payment periods paid`}
                      className="h-2"
                    />
                  </div>

                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <MiniFact
                      label="Invested"
                      value={formatCurrency(investment.principalCents, {
                        currency: investment.currency,
                        compactDecimals: true,
                      })}
                    />
                    <MiniFact
                      label="Profit credited"
                      value={formatCurrency(investment.paidProfitCents, {
                        currency: investment.currency,
                        compactDecimals: true,
                      })}
                      emphasis
                    />
                    {plan && (
                      <MiniFact
                        label="Completion (stated)"
                        value={formatCurrency(plan.completionAmountCents, {
                          currency: investment.currency,
                          compactDecimals: true,
                        })}
                        hint="Principal + stated profit at end of term"
                      />
                    )}
                    <MiniFact
                      label="Maturity"
                      value={
                        investment.daysRemaining === null
                          ? "—"
                          : `${investment.daysRemaining} ${investment.daysRemaining === 1 ? "day" : "days"} left`
                      }
                      icon={CalendarClock}
                    />
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hiddenCount > 0 && (
        <p className="mt-3 text-xs text-subtle-foreground">
          {hiddenCount} more {hiddenCount === 1 ? "position" : "positions"} on
          record —{" "}
          <Link
            href={appRoutes.investments}
            className="font-medium text-brand-emphasis underline-offset-4 hover:underline"
          >
            see them in Investments
          </Link>
          .
        </p>
      )}
    </section>
  );
}

function Summary({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 sm:p-5">
      <dt className="text-[0.65rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        data-numeric
        className={
          emphasis
            ? "text-xl font-semibold text-success"
            : "text-xl font-semibold text-foreground"
        }
      >
        {value}
      </dd>
      <dd className="text-[0.7rem] text-subtle-foreground">{hint}</dd>
    </div>
  );
}

function MiniFact({
  label,
  value,
  hint,
  emphasis = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {Icon && <Icon aria-hidden="true" className="size-3" />}
        {label}
      </dt>
      <dd
        data-numeric
        className={
          emphasis
            ? "text-sm font-semibold text-success"
            : "text-sm font-semibold text-foreground"
        }
      >
        {value}
      </dd>
      {hint && (
        <dd className="text-[0.65rem] leading-snug text-subtle-foreground">
          {hint}
        </dd>
      )}
    </div>
  );
}
