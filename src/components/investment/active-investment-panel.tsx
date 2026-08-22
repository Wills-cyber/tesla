import * as React from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { PlanTermsList } from "@/components/investment/plan-terms-list";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Investment, InvestmentPlan } from "@/types/investment";

type ActiveInvestmentPanelProps = {
  investment: Investment | null;
  plans: readonly InvestmentPlan[];
};

const statusTone = {
  pending_activation: "warning",
  active: "success",
  completed: "neutral",
  cancelled: "neutral",
} as const;

const statusLabel = {
  pending_activation: "Pending Activation",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

/**
 * A user's current position, or an honest empty state.
 *
 * Progress is measured by *periods actually paid*, taken from the investment row
 * — not by elapsed time against the plan's term, and not from the plan's stated
 * schedule. An investment that is running but has paid nothing shows 0 progress,
 * because nothing has been paid.
 */
export function ActiveInvestmentPanel({
  investment,
  plans,
}: ActiveInvestmentPanelProps) {
  if (!investment) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No Active Investment"
        description="You don't have an active investment."
        note="Plans are published with full terms, but none can be funded yet — deposits are not enabled."
        action={
          <Button asChild variant="hairline" size="md">
            <Link href="/dashboard/investments">Browse plans</Link>
          </Button>
        }
      />
    );
  }

  const plan = plans.find((candidate) => candidate.id === investment.planId);
  const totalPeriods = plan?.paymentPeriods ?? 0;
  const progress =
    totalPeriods > 0 ? (investment.periodsPaid / totalPeriods) * 100 : 0;

  return (
    <div className="surface flex flex-col gap-6 rounded-xl border border-white/10 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">{plan?.vehicleType ?? "Investment"}</span>
          <h3 className="text-lg font-medium">
            {plan?.name ?? "Investment position"}
          </h3>
        </div>
        <StatusPill tone={statusTone[investment.status]} dot>
          {statusLabel[investment.status]}
        </StatusPill>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Payment periods paid
          </span>
          <span data-numeric className="text-sm font-medium">
            {investment.periodsPaid} / {totalPeriods || "—"}
          </span>
        </div>
        <Progress
          value={progress}
          aria-label={`${investment.periodsPaid} of ${totalPeriods} payment periods paid`}
          className="h-1.5 bg-white/8"
        />
      </div>

      <PlanTermsList
        terms={[
          {
            label: "Capital committed",
            value: formatCurrency(investment.principalCents, {
              currency: investment.currency,
            }),
          },
          {
            label: "Profit credited to date",
            value: formatCurrency(investment.paidProfitCents, {
              currency: investment.currency,
            }),
            hint: "Actually credited — not a projection",
          },
          { label: "Started", value: formatDate(investment.startedAt) },
          { label: "Matures", value: formatDate(investment.maturesAt) },
        ]}
      />
    </div>
  );
}
