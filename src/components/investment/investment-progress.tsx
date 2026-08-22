import * as React from "react";
import { Check, Clock3, MinusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  InvestmentPayment,
  InvestmentPaymentStatus,
  InvestmentPlan,
} from "@/types/investment";

type PeriodCell = {
  index: number;
  amountCents: number;
  status: InvestmentPaymentStatus;
  dueAt: string | null;
  paidAt: string | null;
};

type InvestmentProgressProps = {
  /** Real `investment_payments` rows. Empty when the backend hasn't scheduled any. */
  payments: readonly InvestmentPayment[];
  /** Used only to describe the *proposed* schedule when no rows exist yet. */
  plan?: InvestmentPlan;
  currency?: string;
  className?: string;
};

const statusStyles: Record<
  InvestmentPaymentStatus,
  { ring: string; badge: string; icon: React.ElementType; label: string }
> = {
  paid: {
    ring: "border-success/35 bg-success-surface",
    badge: "bg-success text-success-foreground",
    icon: Check,
    label: "Paid",
  },
  scheduled: {
    ring: "border-hairline bg-surface-2",
    badge: "bg-surface-3 text-muted-foreground",
    icon: Clock3,
    label: "Scheduled",
  },
  skipped: {
    ring: "border-warning/35 bg-warning-surface",
    badge: "bg-warning text-warning-foreground",
    icon: MinusCircle,
    label: "Skipped",
  },
};

/**
 * The payment schedule for an investment, period by period.
 *
 * The honesty rule this component exists to enforce: **a period is only shown as
 * paid when a real `investment_payments` row says `paid`.** Progress is never
 * inferred from elapsed time, never from `periodsPaid` alone, and never from the
 * plan's stated schedule. A running investment that has paid nothing shows four
 * scheduled periods, because that is the truth.
 *
 * When no payment rows exist, it falls back to rendering the plan's *proposed*
 * division of the term with every period marked `Scheduled`, and says so — a
 * specification, clearly labelled, rather than a fabricated history.
 */
export function InvestmentProgress({
  payments,
  plan,
  currency = "USD",
  className,
}: InvestmentProgressProps) {
  const hasRealSchedule = payments.length > 0;

  const periods: PeriodCell[] = hasRealSchedule
    ? [...payments]
        .sort((a, b) => a.periodIndex - b.periodIndex)
        .map((payment) => ({
          index: payment.periodIndex,
          amountCents: payment.amountCents,
          status: payment.status,
          dueAt: payment.dueAt,
          paidAt: payment.paidAt,
        }))
    : Array.from({ length: plan?.paymentPeriods ?? 0 }, (_, index) => ({
        index: index + 1,
        amountCents: plan?.statedWeeklyProfitCents ?? 0,
        status: "scheduled" as const,
        dueAt: null,
        paidAt: null,
      }));

  if (periods.length === 0) return null;

  const paidCount = periods.filter((period) => period.status === "paid").length;
  const paidCents = periods
    .filter((period) => period.status === "paid")
    .reduce((total, period) => total + period.amountCents, 0);

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h4 className="eyebrow">
          {hasRealSchedule ? "Payment schedule" : "Proposed payment schedule"}
        </h4>
        <p className="text-xs text-muted-foreground">
          <span data-numeric className="font-semibold text-foreground">
            {paidCount}
          </span>{" "}
          of{" "}
          <span data-numeric className="font-semibold text-foreground">
            {periods.length}
          </span>{" "}
          periods paid ·{" "}
          <span data-numeric className="font-semibold text-foreground">
            {formatCurrency(paidCents, { currency, compactDecimals: true })}
          </span>{" "}
          received
        </p>
      </div>

      {/* Connector rail behind the period cells. */}
      <ol
        className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Weekly payment periods"
      >
        {periods.map((period) => {
          const style = statusStyles[period.status];
          const Icon = style.icon;

          return (
            <li
              key={period.index}
              className={cn(
                "relative flex flex-col gap-2.5 rounded-2xl border p-4 transition-colors duration-400",
                style.ring
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Week {period.index}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full",
                    style.badge
                  )}
                >
                  <Icon className="size-3" />
                </span>
              </div>

              <p
                data-numeric
                className="text-lg leading-none font-semibold text-foreground"
              >
                {formatCurrency(period.amountCents, {
                  currency,
                  compactDecimals: true,
                })}
              </p>

              <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
                {period.status === "paid" && period.paidAt
                  ? `Paid ${formatDate(period.paidAt)}`
                  : period.status === "paid"
                    ? "Paid"
                    : period.dueAt
                      ? `Due ${formatDate(period.dueAt)}`
                      : style.label}
              </p>
            </li>
          );
        })}
      </ol>

      <p className="text-[0.7rem] leading-relaxed text-subtle-foreground">
        {hasRealSchedule
          ? "A period is marked paid only when the payment has actually been recorded against your account."
          : "No payment schedule has been created for this investment yet. The periods above describe how the plan's term would be divided — none of them is a payment record."}
      </p>
    </div>
  );
}
