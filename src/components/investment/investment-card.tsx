import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { InvestmentStatusPill } from "@/components/common/status-pill";
import { InvestmentProgress } from "@/components/investment/investment-progress";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { appRoutes } from "@/config/navigation";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvestmentWithPayments } from "@/lib/data";
import type { InvestmentPlan } from "@/types/investment";

type InvestmentCardProps = {
  investment: InvestmentWithPayments;
  /** The plan this position was opened against, if it's still in the catalogue. */
  plan?: InvestmentPlan;
  className?: string;
};

/**
 * One of the user's actual investments.
 *
 * Every figure is read from the `investments` row and its `investment_payments`
 * rows. Three things are computed, and only from real dates and real payment
 * records: days remaining (from `matures_at`), payments received (rows with
 * status `paid`) and progress (paid periods ÷ scheduled periods).
 *
 * Profit credited comes from `paid_profit_cents` — money the ledger says was
 * actually paid — never from the plan's stated total.
 */
export function InvestmentCard({
  investment,
  plan,
  className,
}: InvestmentCardProps) {
  const scheduled = investment.payments.length;
  const paid = investment.payments.filter(
    (payment) => payment.status === "paid"
  ).length;

  // Fall back to the plan's period count only to describe the *term length*.
  const totalPeriods = scheduled || plan?.paymentPeriods || 0;
  const remainingPeriods = Math.max(0, totalPeriods - paid);
  const progress = totalPeriods > 0 ? (paid / totalPeriods) * 100 : 0;

  const daysRemaining = investment.maturesAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(investment.maturesAt).getTime() - Date.now()) / 86_400_000
        )
      )
    : null;

  return (
    <article className={cn("panel flex flex-col gap-7 p-6 sm:p-7", className)}>
      {/* --------------------------------------------------------------- Head */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">{plan?.vehicleType ?? "Investment"}</span>
          <h3 className="text-lg font-semibold sm:text-xl">
            {plan?.name ?? "Investment position"}
          </h3>
        </div>

        <div className="flex items-center gap-2.5">
          <InvestmentStatusPill status={investment.status} />
          {plan && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href={appRoutes.planDetail(plan.slug)}>
                Plan terms
                <ArrowUpRight />
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------ Progress */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Payments received
          </span>
          <span data-numeric className="text-sm font-semibold">
            {paid} / {totalPeriods || "—"}
          </span>
        </div>
        <Progress
          value={progress}
          aria-label={`${paid} of ${totalPeriods} payment periods paid`}
          className="h-2"
        />
      </div>

      {/* --------------------------------------------------------------- Facts */}
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Fact
          label="Amount invested"
          value={formatCurrency(investment.principalCents, {
            currency: investment.currency,
          })}
        />
        <Fact
          label="Principal"
          value={formatCurrency(investment.principalCents, {
            currency: investment.currency,
          })}
          hint="Returned at end of term"
        />
        <Fact
          label="Profit credited"
          value={formatCurrency(investment.paidProfitCents, {
            currency: investment.currency,
          })}
          emphasis
          hint="Actually paid — never projected"
        />
        <Fact label="Start date" value={formatDate(investment.startedAt)} />
        <Fact label="Completion date" value={formatDate(investment.maturesAt)} />
        <Fact
          label="Days remaining"
          value={daysRemaining === null ? "—" : String(daysRemaining)}
          hint={
            daysRemaining === null ? "No maturity date recorded" : undefined
          }
        />
        <Fact
          label="Payments received"
          value={`${paid}${totalPeriods ? ` of ${totalPeriods}` : ""}`}
        />
        <Fact
          label="Remaining payments"
          value={totalPeriods ? String(remainingPeriods) : "—"}
        />
        <Fact
          label="Status"
          value={
            investment.status === "pending_activation"
              ? "Pending activation"
              : investment.status.charAt(0).toUpperCase() +
                investment.status.slice(1)
          }
        />
      </dl>

      {/* ------------------------------------------------------------ Schedule */}
      <div className="border-t border-hairline pt-7">
        <InvestmentProgress
          payments={investment.payments}
          plan={plan}
          currency={investment.currency}
        />
      </div>
    </article>
  );
}

function Fact({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[0.68rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        data-numeric
        className={cn(
          "text-base font-semibold",
          emphasis ? "text-brand-emphasis" : "text-foreground"
        )}
      >
        {value}
      </dd>
      {hint && (
        <p className="text-[0.7rem] leading-relaxed text-subtle-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
