"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { InvestmentCard } from "@/components/investment/investment-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appRoutes } from "@/config/navigation";
import type { InvestmentWithPayments } from "@/lib/data";
import type { InvestmentPlan, InvestmentStatus } from "@/types/investment";

type Group = {
  key: string;
  label: string;
  statuses: readonly InvestmentStatus[];
  icon: typeof TrendingUp;
  empty: { title: string; description: string };
};

/**
 * The three states a position can be in, from the user's point of view.
 *
 * `cancelled` is folded into Completed rather than given a tab of its own: it is a
 * terminal state, and a tab that is empty for almost every account is noise.
 */
const GROUPS: readonly Group[] = [
  {
    key: "active",
    label: "Active",
    statuses: ["active"],
    icon: TrendingUp,
    empty: {
      title: "No active investments",
      description:
        "You haven't activated an investment yet. Plans are published with their full terms in Invest.",
    },
  },
  {
    key: "pending",
    label: "Pending",
    statuses: ["pending_activation"],
    icon: Clock3,
    empty: {
      title: "Nothing pending",
      description:
        "An investment appears here between being created and being activated.",
    },
  },
  {
    key: "completed",
    label: "Completed",
    statuses: ["completed", "cancelled"],
    icon: CheckCircle2,
    empty: {
      title: "No completed investments",
      description:
        "Once an investment reaches the end of its term, it moves here with its full payment history.",
    },
  },
] as const;

/**
 * The user's own investments, grouped by state.
 *
 * Everything rendered here comes from `investments` and `investment_payments` rows
 * belonging to the signed-in account. There is no marketplace content on this page
 * — plans are passed in only so each position can name the plan it was opened
 * against and link back to its terms.
 */
export function InvestmentsTabs({
  investments,
  plans,
}: {
  investments: readonly InvestmentWithPayments[];
  plans: readonly InvestmentPlan[];
}) {
  const grouped = React.useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: investments.filter((investment) =>
          group.statuses.includes(investment.status)
        ),
      })),
    [investments]
  );

  // Open on the first tab that actually has something in it.
  const initialTab =
    grouped.find((group) => group.items.length > 0)?.key ?? GROUPS[0].key;

  const planById = React.useMemo(
    () => new Map(plans.map((plan) => [plan.id, plan])),
    [plans]
  );

  return (
    <Tabs defaultValue={initialTab} className="gap-6">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
        {grouped.map((group) => (
          <TabsTrigger
            key={group.key}
            value={group.key}
            className="h-9 flex-none gap-2 px-4"
          >
            <group.icon aria-hidden="true" />
            {group.label}
            <span
              data-numeric
              className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[0.65rem] font-semibold"
            >
              {group.items.length}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {grouped.map((group) => (
        <TabsContent key={group.key} value={group.key} className="flex flex-col gap-5">
          {group.items.length === 0 ? (
            <EmptyState
              icon={group.icon}
              title={group.empty.title}
              description={group.empty.description}
              action={
                group.key === "active" ? (
                  <Button asChild variant="accent" size="md">
                    <Link href={appRoutes.invest}>Explore Investment Plans</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            group.items.map((investment) => (
              <InvestmentCard
                key={investment.id}
                investment={investment}
                plan={planById.get(investment.planId)}
              />
            ))
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
