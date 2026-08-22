"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Info } from "lucide-react";

import { PlanDetailsDialog } from "@/components/investment/plan-details-dialog";
import { PlanTermsList } from "@/components/investment/plan-terms-list";
import { PlanStatusPill } from "@/components/common/status-pill";
import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { Button } from "@/components/ui/button";
import { planImages } from "@/config/vehicles";
import { isPlanArithmeticConsistent } from "@/config/investment-plans";
import {
  getPlanHeadlineTerms,
  getPlanTerms,
} from "@/components/investment/plan-terms";
import { fadeUp, transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { InvestmentPlan } from "@/types/investment";

type InvestmentPlanCardProps = {
  plan: InvestmentPlan;
  className?: string;
  /**
   * `full` shows the complete term sheet (landing page, investments page);
   * `compact` shows only the three headline figures (dashboard sidebars).
   */
  detail?: "full" | "compact";
  /** Skips the entrance animation for lists that animate their own container. */
  animate?: boolean;
};

/**
 * The canonical presentation of an investment plan.
 *
 * Every number on this card is a *stated term* from the plan catalogue — what
 * the plan proposes if it runs as described. None of it is a record of capital
 * received, held or paid out, and the card says so in the footnote rather than
 * relying on the reader to infer it.
 *
 * A plan can only be entered when `status === "open"`. Nothing is `open` in the
 * pre-launch build, so the action is a details view, never a purchase.
 */
export function InvestmentPlanCard({
  plan,
  className,
  detail = "full",
  animate = true,
}: InvestmentPlanCardProps) {
  const image = planImages[plan.imageKey];
  const terms = detail === "full" ? getPlanTerms(plan) : getPlanHeadlineTerms(plan);
  const isOpen = plan.status === "open";

  // Surfaces a catalogue typo during development instead of shipping bad maths.
  if (process.env.NODE_ENV !== "production" && !isPlanArithmeticConsistent(plan)) {
    console.warn(
      `[InvestmentPlanCard] Stated terms for "${plan.slug}" do not add up. ` +
        `Check investmentPlans in src/config/investment-plans.ts.`
    );
  }

  return (
    <motion.article
      variants={animate ? fadeUp : undefined}
      whileHover={{ y: -4 }}
      transition={transitions.fast}
      className={cn(
        "group/plan surface relative flex flex-col overflow-hidden rounded-2xl border border-white/10",
        "transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:border-gold-500/25 hover:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]",
        className
      )}
    >
      {/* Accent hairline along the top edge, brightening on hover. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent opacity-60 transition-opacity duration-500 group-hover/plan:opacity-100"
      />

      {image && (
        <div className="relative border-b border-white/8 bg-ink-900/60">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 bottom-2 h-16 rounded-[50%] bg-gold-500/10 blur-2xl"
          />
          <VehicleImage
            source={image}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
            className="px-6 py-8"
            imageClassName="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/plan:scale-[1.03]"
            meaningful={false}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-7">
        <header className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="eyebrow">{plan.vehicleType}</span>
              <h3 className="text-xl font-medium sm:text-[1.4rem]">
                {plan.name}
              </h3>
            </div>
            <PlanStatusPill status={plan.status} />
          </div>

          {detail === "full" && (
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {plan.summary}
            </p>
          )}
        </header>

        <PlanTermsList terms={terms} />

        <div className="mt-auto flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <PlanDetailsDialog
              plan={plan}
              trigger={
                <Button
                  variant={isOpen ? "accent" : "hairline"}
                  size="md"
                  className="group/cta w-full sm:flex-1"
                >
                  View Plan
                  <ArrowUpRight className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                </Button>
              }
            />

            {isOpen ? (
              <Button asChild variant="accent" size="md" className="w-full sm:flex-1">
                <Link href="/dashboard/investments">Invest</Link>
              </Button>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/12 px-4 py-2.5 text-xs text-muted-foreground/80 sm:flex-1">
                <Info className="size-3.5 shrink-0" />
                Not yet available
              </span>
            )}
          </div>

          <p className="text-[0.7rem] leading-relaxed text-muted-foreground/65">
            Figures are stated plan terms, not guaranteed returns, and do not
            represent funds received or paid.
          </p>
        </div>
      </div>
    </motion.article>
  );
}
