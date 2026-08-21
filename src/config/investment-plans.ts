import type { InvestmentPlan } from "@/types/investment";

/**
 * Investment plan catalogue.
 *
 * This is the *pre-launch* catalogue and it lives in code on purpose: it is
 * marketing content describing proposed plan terms, not a record of any capital
 * received, held or paid out.
 *
 * When Supabase is connected, `src/lib/data/investment-plans.ts` reads the
 * `investment_plans` table first and only falls back to this list when the
 * backend is unconfigured. The seed in
 * `supabase/migrations/0002_seed_investment_plans.sql` inserts exactly these
 * rows, so the two never diverge.
 */
export const investmentPlans: readonly InvestmentPlan[] = [
  {
    id: "plan-vehicle-investment-001",
    slug: "vehicle-investment",
    name: "Vehicle Investment",
    summary:
      "A fixed-term plan modelled on the electric vehicle category, with stated profit released across four scheduled payment periods.",
    vehicleType: "Electric Vehicle",
    currency: "USD",
    investmentAmountCents: 100_000, // $1,000
    durationDays: 30,
    statedWeeklyProfitCents: 40_000, // $400
    paymentPeriods: 4,
    statedTotalProfitCents: 160_000, // $1,600
    principalCents: 100_000, // $1,000
    completionAmountCents: 260_000, // $2,600
    status: "coming_soon",
    imageKey: "compact-sedan",
    featured: true,
  },
] as const;

export const featuredPlan = investmentPlans[0];

export function findPlanBySlug(slug: string): InvestmentPlan | undefined {
  return investmentPlans.find((plan) => plan.slug === slug);
}

/**
 * Sanity check on the advertised arithmetic. Called by the plan card so a typo
 * in the catalogue surfaces in development instead of shipping wrong numbers.
 */
export function isPlanArithmeticConsistent(plan: InvestmentPlan): boolean {
  return (
    plan.statedTotalProfitCents ===
      plan.statedWeeklyProfitCents * plan.paymentPeriods &&
    plan.completionAmountCents ===
      plan.principalCents + plan.statedTotalProfitCents
  );
}
