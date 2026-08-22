"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Info, Sparkles } from "lucide-react";

import { PlanDetailsDialog } from "@/components/investment/plan-details-dialog";
import { PlanImage } from "@/components/investment/plan-image";
import { PlanTermsList } from "@/components/investment/plan-terms-list";
import { PlanStatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import { isPlanArithmeticConsistent } from "@/config/investment-plans";
import {
  getPlanCardTerms,
  getPlanHeadlineTerms,
} from "@/components/investment/plan-terms";
import { formatCurrency, formatDuration } from "@/lib/format";
import { fadeUp, transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { InvestmentPlan } from "@/types/investment";

type InvestmentPlanCardProps = {
  plan: InvestmentPlan;
  className?: string;
  /**
   * `full` shows the complete term sheet (Invest marketplace, landing page);
   * `compact` shows only the three headline figures (dashboard rails).
   */
  detail?: "full" | "compact";
  /**
   * `link` sends "View Details" to `/invest/[slug]` — the in-app behaviour.
   * `dialog` opens the term sheet in place, for the public landing page where the
   * detail route is behind the auth guard.
   */
  action?: "link" | "dialog";
  /** Skips the entrance animation for lists that animate their own container. */
  animate?: boolean;
  /** Renders the subtle Featured treatment. Defaults to the plan's own flag. */
  showFeatured?: boolean;
  /** First card in the grid gets the image eagerly, for LCP. */
  priority?: boolean;
};

/**
 * The canonical presentation of an investment plan.
 *
 * Every field is read from the `plan` object, which comes from the
 * `investment_plans` table (or the pre-launch catalogue when the backend is
 * unconfigured). Nothing about the marketplace is hard-coded in the UI: adding a
 * plan is inserting a row, and no figure on this card is written out by hand.
 *
 * Image-led by design — the vehicle is the first thing you see, at a fixed 16:9
 * frame so the grid stays even whatever artwork lands. Hover does three quiet
 * things: the image scales 3%, the card lifts 4px, the accent hairline brightens.
 * Nothing spins, nothing bounces.
 *
 * Every number here is a *stated term* — what the plan proposes if it runs as
 * described. None of it is a record of capital received, held or paid out.
 *
 * A plan can only be entered when `status === "open"`. Nothing is `open` in the
 * pre-launch build, so the action is a details view, never a purchase.
 */
export function InvestmentPlanCard({
  plan,
  className,
  detail = "full",
  action = "link",
  animate = true,
  showFeatured,
  priority = false,
}: InvestmentPlanCardProps) {
  const terms =
    detail === "full" ? getPlanCardTerms(plan) : getPlanHeadlineTerms(plan);
  const isOpen = plan.status === "open";
  const featured = showFeatured ?? Boolean(plan.featured);

  // Surfaces a bad row during development instead of shipping wrong maths. Plans
  // built by `definePlan` can't fail this; hand-edited database rows can.
  if (process.env.NODE_ENV !== "production" && !isPlanArithmeticConsistent(plan)) {
    console.warn(
      `[InvestmentPlanCard] Stated terms for "${plan.slug}" do not add up. ` +
        `Check the investment_plans row (or src/config/investment-plans.ts).`
    );
  }

  const detailsLabel = "View Details";
  const detailsButton = (
    <Button
      variant={isOpen ? "accent" : "outline"}
      size="md"
      className="group/cta w-full"
    >
      {detailsLabel}
      <ArrowUpRight className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
    </Button>
  );

  return (
    <motion.article
      variants={animate ? fadeUp : undefined}
      whileHover={{ y: -4 }}
      transition={transitions.fast}
      className={cn(
        "group/plan panel relative flex flex-col overflow-hidden",
        "transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:shadow-lift",
        // The featured treatment: a warmer border and a faint gold rim. No badge
        // shouting, no scale-up, no second accent colour.
        featured
          ? "border-brand-border shadow-[0_0_0_1px_var(--brand-border)]"
          : "hover:border-brand-border",
        className
      )}
    >
      {/* Accent hairline along the top edge, brightening on hover. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-brand to-transparent transition-opacity duration-500",
          featured ? "opacity-80" : "opacity-40 group-hover/plan:opacity-90"
        )}
      />

      {/* ------------------------------------------------------------- Image */}
      <div className="relative border-b border-hairline">
        <PlanImage
          src={plan.imageUrl}
          alt={plan.vehicleModel}
          priority={priority}
          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 92vw"
          imageClassName="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/plan:scale-[1.03]"
        />

        {/* Status and Featured sit over the image so the header below stays
            about the plan itself. */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          {featured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-surface-1/92 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.1em] text-brand-emphasis uppercase shadow-soft backdrop-blur-sm">
              <Sparkles aria-hidden="true" className="size-3" />
              Featured
            </span>
          ) : (
            <span aria-hidden="true" />
          )}

          <PlanStatusPill
            status={plan.status}
            className="bg-surface-1/92 shadow-soft backdrop-blur-sm"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
        <header className="flex flex-col gap-2">
          {/* Model first, then the segment it sits in. */}
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {plan.vehicleModel}
            <span aria-hidden="true" className="text-hairline-strong">
              ·
            </span>
            {plan.vehicleType}
          </span>

          <h3 className="text-lg font-semibold tracking-[-0.015em] sm:text-xl">
            {plan.name}
          </h3>

          {detail === "full" && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              {plan.summary}
            </p>
          )}
        </header>

        {/* Entry amount and term, the two figures that decide whether the rest
            is worth reading. */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 rounded-xl border border-hairline bg-surface-2 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Investment
            </span>
            <span
              data-numeric
              className="text-xl leading-none font-semibold tracking-tight"
            >
              {formatCurrency(plan.investmentAmountCents, {
                compactDecimals: true,
              })}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Duration
            </span>
            <span data-numeric className="text-sm leading-none font-semibold">
              {plan.durationDays} Days
            </span>
          </div>
        </div>

        <PlanTermsList terms={terms} />

        <div className="mt-auto flex flex-col gap-3 pt-1">
          {action === "dialog" ? (
            <PlanDetailsDialog plan={plan} trigger={detailsButton} />
          ) : (
            <Button
              asChild
              variant={isOpen ? "accent" : "outline"}
              size="md"
              className="group/cta w-full"
            >
              <Link href={appRoutes.planDetail(plan.slug)}>
                {detailsLabel}
                <ArrowUpRight className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
              </Link>
            </Button>
          )}

          {!isOpen && (
            <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-hairline-strong px-4 py-2 text-[0.7rem] text-muted-foreground">
              <Info aria-hidden="true" className="size-3.5 shrink-0" />
              Not yet available — {formatDuration(plan.durationDays)} term
            </span>
          )}

          <p className="text-[0.7rem] leading-relaxed text-subtle-foreground">
            Figures are stated plan terms and do not represent funds received or
            paid.
          </p>
        </div>
      </div>
    </motion.article>
  );
}
