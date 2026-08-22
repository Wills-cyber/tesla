import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GuideStep = {
  title: string;
  description: string;
  icon: LucideIcon;
  action: {
    label: string;
    href: string;
  };
  /**
   * Marks a step the account has genuinely completed. Only pass `true` where a
   * real backend record proves it — never to make the list look progressed.
   */
  complete?: boolean;
  /** Short note when the step can't be taken yet, e.g. deposits not enabled. */
  note?: string;
};

/**
 * The "Start Here" path.
 *
 * The dashboard's job is orientation, so this is the spine of the page: five
 * ordered steps from browsing plans to tracking an investment, each with one
 * button that goes somewhere real. There are no decorative steps and no
 * placeholder links.
 *
 * Completion is data, not decoration: a step is ticked only when the caller can
 * point at a backend record for it. An account with nothing behind it shows five
 * open steps, which is accurate.
 */
export function DashboardGuide({
  steps,
  className,
}: {
  steps: readonly GuideStep[];
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-col gap-3", className)}>
      {steps.map((step, index) => (
        <li key={step.title}>
          <div
            className={cn(
              "panel panel-interactive flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6",
              step.complete && "border-success/30"
            )}
          >
            {/* Step index / completion marker */}
            <span
              aria-hidden="true"
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl border text-sm font-semibold",
                step.complete
                  ? "border-success/30 bg-success-surface text-success"
                  : "border-brand-border bg-brand-surface text-brand-emphasis"
              )}
            >
              {step.complete ? (
                <Check className="size-5" />
              ) : (
                <span data-numeric>{index + 1}</span>
              )}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2.5">
                <step.icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-brand"
                />
                <h3 className="text-base font-semibold">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {step.description}
              </p>

              {step.note && (
                <p className="text-xs leading-relaxed text-subtle-foreground">
                  {step.note}
                </p>
              )}
            </div>

            <Button
              asChild
              variant={index === 0 ? "accent" : "hairline"}
              size="md"
              className="group/step shrink-0 sm:w-auto"
            >
              <Link href={step.action.href}>
                {step.action.label}
                <ArrowRight className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/step:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}
