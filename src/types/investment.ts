/**
 * Availability of an investment plan.
 *
 * Only `open` plans can ever accept capital. Nothing in the current build is
 * `open` — the platform is pre-launch, so plans are advertised as `coming_soon`
 * and no plan can be activated.
 */
export type PlanStatus = "coming_soon" | "open" | "closed" | "sold_out";

export type VehicleCategory =
  | "Electric Vehicle"
  | "Electric SUV"
  | "Electric Truck"
  | "Performance Sedan";

export type Currency = "USD";

/**
 * The *stated terms* of an investment plan.
 *
 * Every monetary field here describes what a plan proposes, not money that has
 * been received, held or paid out. Amounts are stored in minor units (cents) to
 * keep arithmetic exact and to match how the Postgres schema stores them.
 */
export type InvestmentPlan = {
  id: string;
  slug: string;
  name: string;
  /** Short marketing line shown under the plan name. */
  summary: string;
  vehicleType: VehicleCategory;
  currency: Currency;
  /** Capital required to enter the plan, in cents. */
  investmentAmountCents: number;
  /** Total plan length in days. */
  durationDays: number;
  /** Stated profit released per payment period, in cents. */
  statedWeeklyProfitCents: number;
  /** Number of scheduled payment periods across the plan duration. */
  paymentPeriods: number;
  /** `statedWeeklyProfitCents * paymentPeriods`, in cents. */
  statedTotalProfitCents: number;
  /** Capital returned at the end of the term, in cents. */
  principalCents: number;
  /** `principalCents + statedTotalProfitCents`, in cents. */
  completionAmountCents: number;
  status: PlanStatus;
  /** Reference to an image in `vehicleConfig`; safe to swap for real photography. */
  imageKey: string;
  featured?: boolean;
};

/** Lifecycle of a user's position in a plan. */
export type InvestmentStatus =
  | "pending_activation"
  | "active"
  | "completed"
  | "cancelled";

export type Investment = {
  id: string;
  userId: string;
  planId: string;
  plan?: InvestmentPlan;
  status: InvestmentStatus;
  /** Capital committed, in cents. */
  principalCents: number;
  currency: Currency;
  startedAt: string | null;
  maturesAt: string | null;
  /** Profit actually credited so far, in cents. Never inferred from plan terms. */
  paidProfitCents: number;
  periodsPaid: number;
  createdAt: string;
};

export type InvestmentPaymentStatus = "scheduled" | "paid" | "skipped";

export type InvestmentPayment = {
  id: string;
  investmentId: string;
  periodIndex: number;
  amountCents: number;
  currency: Currency;
  status: InvestmentPaymentStatus;
  dueAt: string;
  paidAt: string | null;
};
