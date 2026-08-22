import type { InvestmentPlan } from "@/types/investment";
import { formatCurrency, formatDuration } from "@/lib/format";

import type { PlanTerm } from "@/components/investment/plan-terms-list";

/**
 * Derives the display terms for a plan.
 *
 * Kept in one place so the card, the details dialog and the dashboard can never
 * describe the same plan differently — and so the "stated term" qualifiers travel
 * with the numbers rather than being remembered per surface.
 */
export function getPlanTerms(plan: InvestmentPlan): PlanTerm[] {
  const currency = plan.currency;

  return [
    { label: "Vehicle Type", value: plan.vehicleType },
    {
      label: "Investment",
      value: formatCurrency(plan.investmentAmountCents, {
        currency,
        compactDecimals: true,
      }),
      hint: "Capital required to enter the plan",
    },
    { label: "Duration", value: formatDuration(plan.durationDays) },
    {
      label: "Weekly Stated Profit",
      value: formatCurrency(plan.statedWeeklyProfitCents, {
        currency,
        compactDecimals: true,
      }),
      hint: "Stated plan term, per payment period",
    },
    { label: "Payment Periods", value: String(plan.paymentPeriods) },
    {
      label: "Total Stated Profit",
      value: formatCurrency(plan.statedTotalProfitCents, {
        currency,
        compactDecimals: true,
      }),
      hint: "Stated plan term, across the full term",
    },
    {
      label: "Principal",
      value: formatCurrency(plan.principalCents, {
        currency,
        compactDecimals: true,
      }),
      hint: "Capital returned at end of term",
    },
    {
      label: "Completion Amount",
      value: formatCurrency(plan.completionAmountCents, {
        currency,
        compactDecimals: true,
      }),
      emphasis: true,
      hint: "Principal + total stated profit",
    },
  ];
}

/** The three figures shown on the compact card face. */
export function getPlanHeadlineTerms(plan: InvestmentPlan): PlanTerm[] {
  return [
    {
      label: "Investment",
      value: formatCurrency(plan.investmentAmountCents, {
        currency: plan.currency,
        compactDecimals: true,
      }),
    },
    { label: "Duration", value: `${plan.durationDays} Days` },
    {
      label: "Completion Amount",
      value: formatCurrency(plan.completionAmountCents, {
        currency: plan.currency,
        compactDecimals: true,
      }),
      emphasis: true,
    },
  ];
}

export type ScheduledPeriod = {
  index: number;
  label: string;
  amount: string;
  /** Always "Scheduled" pre-launch — no period has ever been paid. */
  state: "Scheduled";
};

/**
 * The plan's stated payment schedule.
 *
 * Every row is `Scheduled`, deliberately. Nothing here is a payment record; it
 * describes how the term would be divided if the plan were active.
 */
export function getPlanSchedule(plan: InvestmentPlan): ScheduledPeriod[] {
  return Array.from({ length: plan.paymentPeriods }, (_, index) => ({
    index: index + 1,
    label: `Period ${index + 1}`,
    amount: formatCurrency(plan.statedWeeklyProfitCents, {
      currency: plan.currency,
      compactDecimals: true,
    }),
    state: "Scheduled" as const,
  }));
}
