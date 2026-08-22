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
 * meaningful fallback: with no backend it serves the static catalogue from
 * `src/config/investment-plans.ts`. That is safe because plan terms are
 * *statements of intent*, not records of activity.
 */

export function mapPlanRow(row: Tables<"investment_plans">): InvestmentPlan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
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
    imageKey: row.image_key,
    featured: row.featured,
  };
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

  return ready(data.map(mapPlanRow));
}

export async function getInvestmentPlanBySlug(
  slug: string
): Promise<DataResult<InvestmentPlan | null>> {
  if (!isSupabaseConfigured()) {
    return ready(investmentPlans.find((plan) => plan.slug === slug) ?? null);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return ready(investmentPlans.find((plan) => plan.slug === slug) ?? null);
  }

  const { data, error } = await supabase
    .from("investment_plans")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return failed(describeError(error, "getInvestmentPlanBySlug"));
  }

  return ready(data ? mapPlanRow(data) : null);
}
