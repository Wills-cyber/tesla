import "server-only";

import { investmentPlans } from "@/config/investment-plans";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { InvestmentPlan, VehicleCategory } from "@/types/investment";
import type { Tables } from "@/types/database";

import { describeError, failed, ready, type DataResult } from "./query-context";

/**
 * Investment plan catalogue access.
 *
 * Plans are public marketing content, so this is the one repository that has a
 * meaningful fallback: with no backend — or with a backend whose schema predates
 * the current catalogue — it serves the static catalogue from
 * `src/config/investment-plans.ts`. That is safe because plan terms are
 * *statements of intent*, not records of activity.
 */

/**
 * Turns a row into a plan, or `null` if the row cannot be rendered honestly.
 *
 * `vehicle_model` and `image_url` arrive with migration 0005. A database still on
 * the older schema returns `undefined` for both, and a plan with no image path is
 * not a plan that can be put on screen — `next/image` would throw on an undefined
 * `src`, taking the whole marketplace down. So the row is rejected here and the
 * caller falls back to the catalogue, which is complete by construction.
 */
export function mapPlanRow(
  row: Tables<"investment_plans">
): InvestmentPlan | null {
  if (!row.image_url || !row.vehicle_model) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    vehicleModel: row.vehicle_model,
    vehicleType: row.vehicle_type as VehicleCategory,
    currency: "USD",
    investmentAmountCents: row.investment_amount_cents,
    durationDays: row.duration_days,
    statedWeeklyProfitCents: row.stated_weekly_profit_cents,
    paymentPeriods: row.payment_periods,
    statedTotalProfitCents: row.stated_total_profit_cents,
    principalCents: row.principal_cents,
    completionAmountCents: row.completion_amount_cents,
    status: row.status,
    imageUrl: row.image_url,
    featured: row.featured,
  };
}

/**
 * Says once, loudly, that the database is behind the code.
 *
 * Without this the fallback is silent and someone spends an afternoon wondering
 * why an edit in the Supabase dashboard changes nothing on the page.
 */
function warnStaleSchema(context: string): void {
  console.warn(
    `[data:${context}] investment_plans rows are missing vehicle_model / ` +
      `image_url — serving the built-in catalogue instead. Apply ` +
      `supabase/migrations/0005_seed_vehicle_investment_plans.sql to have the ` +
      `database serve these plans.`
  );
}

export async function getInvestmentPlans(): Promise<
  DataResult<InvestmentPlan[]>
> {
  if (!isSupabaseConfigured()) {
    return ready([...investmentPlans]);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return ready([...investmentPlans]);

  const { data, error } = await supabase
    .from("investment_plans")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return failed(describeError(error, "getInvestmentPlans"));
  }

  const mapped = data.map(mapPlanRow).filter((plan): plan is InvestmentPlan =>
    Boolean(plan)
  );

  // All-or-nothing on purpose. A partial list would silently hide plans that do
  // exist, and a marketplace missing three of its five plans is worse than one
  // served from the catalogue the seed was written from.
  if (mapped.length !== data.length) {
    warnStaleSchema("getInvestmentPlans");
    return ready([...investmentPlans]);
  }

  return ready(mapped);
}

export async function getInvestmentPlanBySlug(
  slug: string
): Promise<DataResult<InvestmentPlan | null>> {
  const fromCatalogue = () =>
    investmentPlans.find((plan) => plan.slug === slug) ?? null;

  if (!isSupabaseConfigured()) return ready(fromCatalogue());

  const supabase = await getSupabaseServerClient();
  if (!supabase) return ready(fromCatalogue());

  const { data, error } = await supabase
    .from("investment_plans")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return failed(describeError(error, "getInvestmentPlanBySlug"));
  }

  if (!data) return ready(fromCatalogue());

  const mapped = mapPlanRow(data);
  if (!mapped) {
    warnStaleSchema("getInvestmentPlanBySlug");
    return ready(fromCatalogue());
  }

  return ready(mapped);
}
