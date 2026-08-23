import type { InvestmentPlan, PlanStatus, VehicleCategory } from "@/types/investment";

/**
 * Investment plan catalogue — the single source of truth for plan figures.
 *
 * This is the *pre-launch* catalogue and it lives in code on purpose: it is
 * marketing content describing proposed plan terms, not a record of any capital
 * received, held or paid out.
 *
 * ---------------------------------------------------------------------------
 * One place, derived arithmetic
 * ---------------------------------------------------------------------------
 * Nothing downstream re-states a figure. Each plan declares the four independent
 * inputs — entry amount, weekly stated profit, number of periods, duration — and
 * `definePlan()` derives the total profit, the principal and the completion
 * amount. A component that wants a number reads it off the plan object; there is
 * no second copy of `$1,600` anywhere in the UI to drift out of step.
 *
 * All money is in integer cents, so the arithmetic is exact and no rounding error
 * is possible. `assertPlanArithmetic` re-checks each derived figure against the
 * value published in the spec below, and the `investment_plans` table enforces the
 * same two identities as CHECK constraints — a plan whose figures don't add up
 * cannot be stored at all.
 *
 * ---------------------------------------------------------------------------
 * Path to Supabase
 * ---------------------------------------------------------------------------
 * `src/lib/data/investment-plans.ts` reads the `investment_plans` table first and
 * falls back to this list only when the backend is unconfigured. The seed in
 * `supabase/migrations/0005_seed_vehicle_investment_plans.sql` inserts exactly
 * these rows, so connecting the backend changes no figure on any screen.
 *
 * ---------------------------------------------------------------------------
 * Branding
 * ---------------------------------------------------------------------------
 * `vehicleModel` names the vehicle each plan is modelled around. That is a
 * descriptive reference to a vehicle model and nothing more: TESLA Electronics is
 * an independent platform, and these plans are not offered, sponsored, endorsed or
 * guaranteed by Tesla, Inc. Every surface that renders a plan also renders
 * `siteConfig.affiliationDisclaimer`.
 */

const IMAGE_BASE = "/images/investments";

/**
 * The inputs for a plan. Everything else about it is derived.
 *
 * `expect` restates the figures exactly as published so `definePlan` can assert
 * that its own arithmetic reproduces them. It is a spec-vs-implementation check,
 * not a second source of truth — a mismatch is a build-time-visible error rather
 * than a wrong number quietly shipping to a marketing page.
 */
type PlanSpec = {
  slug: string;
  name: string;
  summary: string;
  vehicleModel: string;
  vehicleType: VehicleCategory;
  investmentAmountCents: number;
  durationDays: number;
  statedWeeklyProfitCents: number;
  paymentPeriods: number;
  status: PlanStatus;
  featured?: boolean;
  expect: {
    statedTotalProfitCents: number;
    completionAmountCents: number;
  };
};

/** Derives every dependent figure and verifies it against the published spec. */
function definePlan(index: number, spec: PlanSpec): InvestmentPlan {
  const statedTotalProfitCents =
    spec.statedWeeklyProfitCents * spec.paymentPeriods;

  // The principal is the entry amount returned at the end of the term. It is the
  // same figure, named for what it does at maturity rather than at entry.
  const principalCents = spec.investmentAmountCents;
  const completionAmountCents = principalCents + statedTotalProfitCents;

  assertPlanArithmetic(spec, statedTotalProfitCents, completionAmountCents);

  return {
    // A stable synthetic id for the pre-launch catalogue. Once Supabase serves
    // these, the real row `id` (a uuid) replaces it and the slug stays the
    // user-facing key — which is why every route and lookup uses the slug.
    id: `plan-${spec.slug}-${String(index + 1).padStart(3, "0")}`,
    slug: spec.slug,
    name: spec.name,
    summary: spec.summary,
    vehicleModel: spec.vehicleModel,
    vehicleType: spec.vehicleType,
    currency: "USD",
    investmentAmountCents: spec.investmentAmountCents,
    durationDays: spec.durationDays,
    statedWeeklyProfitCents: spec.statedWeeklyProfitCents,
    paymentPeriods: spec.paymentPeriods,
    statedTotalProfitCents,
    principalCents,
    completionAmountCents,
    status: spec.status,
    imageUrl: `${IMAGE_BASE}/${spec.slug}.webp`,
    featured: spec.featured,
  };
}

/**
 * Fails loudly when derivation and published figures disagree.
 *
 * Throws in development so the mismatch is impossible to miss; in production it
 * logs and lets the page render, because a live marketing page going blank is a
 * worse outcome than one figure being wrong — and the same identities are enforced
 * by CHECK constraints on `investment_plans` regardless.
 */
function assertPlanArithmetic(
  spec: PlanSpec,
  statedTotalProfitCents: number,
  completionAmountCents: number
): void {
  const problems: string[] = [];

  if (statedTotalProfitCents !== spec.expect.statedTotalProfitCents) {
    problems.push(
      `total stated profit: derived ${statedTotalProfitCents}, published ${spec.expect.statedTotalProfitCents}`
    );
  }
  if (completionAmountCents !== spec.expect.completionAmountCents) {
    problems.push(
      `completion amount: derived ${completionAmountCents}, published ${spec.expect.completionAmountCents}`
    );
  }
  if (problems.length === 0) return;

  const message = `[investment-plans] "${spec.slug}" does not add up — ${problems.join("; ")}`;
  if (process.env.NODE_ENV !== "production") throw new Error(message);
  console.error(message);
}

/* ------------------------------------------------------------------- Catalogue */

export const investmentPlans: readonly InvestmentPlan[] = [
  definePlan(0, {
    slug: "model-3-starter",
    name: "Model 3 Starter",
    summary:
      "The introductory plan, modelled on the compact electric sedan segment. The lowest entry amount on the platform, with stated profit released across four scheduled weekly periods.",
    vehicleModel: "Tesla Model 3",
    vehicleType: "Electric Sedan",
    investmentAmountCents: 100_000, // $1,000
    durationDays: 30,
    statedWeeklyProfitCents: 40_000, // $400
    paymentPeriods: 4,
    status: "open",
    // Lowest entry amount, so this is the plan newcomers are pointed at.
    featured: true,
    expect: {
      statedTotalProfitCents: 160_000, // $1,600
      completionAmountCents: 260_000, // $2,600
    },
  }),

  definePlan(1, {
    slug: "model-y-growth",
    name: "Model Y Growth",
    summary:
      "Modelled on the electric crossover segment, pairing sedan efficiency with SUV interior volume. A mid-tier entry amount over the same four-period term.",
    vehicleModel: "Tesla Model Y",
    vehicleType: "Electric SUV",
    investmentAmountCents: 250_000, // $2,500
    durationDays: 30,
    statedWeeklyProfitCents: 90_000, // $900
    paymentPeriods: 4,
    status: "open",
    expect: {
      statedTotalProfitCents: 360_000, // $3,600
      completionAmountCents: 610_000, // $6,100
    },
  }),

  definePlan(2, {
    slug: "model-s-premium",
    name: "Model S Premium",
    summary:
      "Modelled on the long-range performance sedan segment, where range, aerodynamics and drivetrain output are pushed hardest.",
    vehicleModel: "Tesla Model S",
    vehicleType: "Performance Sedan",
    investmentAmountCents: 500_000, // $5,000
    durationDays: 30,
    statedWeeklyProfitCents: 180_000, // $1,800
    paymentPeriods: 4,
    status: "open",
    expect: {
      statedTotalProfitCents: 720_000, // $7,200
      completionAmountCents: 1_220_000, // $12,200
    },
  }),

  definePlan(3, {
    slug: "model-x-elite",
    name: "Model X Elite",
    summary:
      "Modelled on the full-size electric SUV segment — three rows, high towing capability and the largest battery packs in the category.",
    vehicleModel: "Tesla Model X",
    vehicleType: "Electric SUV",
    investmentAmountCents: 1_000_000, // $10,000
    durationDays: 30,
    statedWeeklyProfitCents: 350_000, // $3,500
    paymentPeriods: 4,
    status: "open",
    expect: {
      statedTotalProfitCents: 1_400_000, // $14,000
      completionAmountCents: 2_400_000, // $24,000
    },
  }),

  definePlan(4, {
    slug: "cybertruck-executive",
    name: "Cybertruck Executive",
    summary:
      "The highest entry amount on the platform, modelled on the electric light-truck segment pushing electrification into commercial and utility use.",
    vehicleModel: "Tesla Cybertruck",
    vehicleType: "Electric Truck",
    investmentAmountCents: 2_500_000, // $25,000
    durationDays: 30,
    statedWeeklyProfitCents: 800_000, // $8,000
    paymentPeriods: 4,
    status: "open",
    expect: {
      statedTotalProfitCents: 3_200_000, // $32,000
      completionAmountCents: 5_700_000, // $57,000
    },
  }),
] as const;

/* --------------------------------------------------------------------- Lookups */

/**
 * The plan newcomers are pointed at.
 *
 * Resolved by the `featured` flag rather than by position, so re-ordering the
 * catalogue cannot silently change which plan is promoted. Falls back to the
 * lowest entry amount, which is what "featured" means here in the first place.
 */
export const featuredPlan: InvestmentPlan =
  investmentPlans.find((plan) => plan.featured) ??
  [...investmentPlans].sort(
    (a, b) => a.investmentAmountCents - b.investmentAmountCents
  )[0];

export function findPlanBySlug(slug: string): InvestmentPlan | undefined {
  return investmentPlans.find((plan) => plan.slug === slug);
}

/**
 * Re-checks a plan's arithmetic at the point of display.
 *
 * Plans served from Supabase have not been through `definePlan`, so this is the
 * guard that catches a hand-edited row whose figures don't add up. Both identities
 * are also CHECK constraints on the table; this is the belt to that braces.
 */
export function isPlanArithmeticConsistent(plan: InvestmentPlan): boolean {
  return (
    plan.statedTotalProfitCents ===
      plan.statedWeeklyProfitCents * plan.paymentPeriods &&
    plan.completionAmountCents ===
      plan.principalCents + plan.statedTotalProfitCents
  );
}
