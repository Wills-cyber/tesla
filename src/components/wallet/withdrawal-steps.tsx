"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type FlowStep = {
  /** Stable key used in state, never shown. */
  id: string;
  /** Full label, used on desktop and announced to assistive tech. */
  label: string;
  /** Two or three characters for narrow phones. */
  shortLabel: string;
};

/**
 * Progress through the withdrawal flow.
 *
 * A withdrawal is the one irreversible action in the product, so the user is
 * never left guessing how much further there is to go or what they have already
 * decided. Completed steps stay tappable — going back to change the network is a
 * normal thing to want, and forcing a restart to do it is how people give up and
 * guess instead.
 *
 * Forward steps are *not* tappable. Skipping to review with no address entered
 * would produce a confirmation screen with holes in it, which is exactly the
 * screen that must never be ambiguous.
 *
 * The bar is a real `<ol>` with `aria-current`, so a screen reader announces
 * "step 3 of 5, current" rather than a row of decorative dots.
 */
export function WithdrawalSteps({
  steps,
  currentIndex,
  onStepSelect,
  className,
}: {
  steps: readonly FlowStep[];
  currentIndex: number;
  /** Called for completed steps only. Omit to make the bar read-only. */
  onStepSelect?: (index: number) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Withdrawal progress" className={cn("w-full", className)}>
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {steps.map((step, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;
          const interactive = complete && Boolean(onStepSelect);

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1.5">
              <button
                type="button"
                disabled={!interactive}
                aria-current={current ? "step" : undefined}
                onClick={interactive ? () => onStepSelect?.(index) : undefined}
                className={cn(
                  "group/step flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg py-1 text-left transition-opacity duration-300",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  interactive ? "cursor-pointer" : "cursor-default",
                  !complete && !current && "opacity-55"
                )}
              >
                {/* The rail. Fills as the step completes. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1 w-full rounded-full transition-colors duration-500",
                    complete
                      ? "bg-brand"
                      : current
                        ? "bg-brand/45"
                        : "bg-hairline-strong",
                    interactive && "group-hover/step:bg-brand-emphasis"
                  )}
                />

                <span className="flex min-w-0 items-center gap-1.5">
                  {complete ? (
                    <Check
                      aria-hidden="true"
                      className="size-3 shrink-0 text-brand"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      data-numeric
                      className={cn(
                        "shrink-0 text-[0.65rem] font-semibold",
                        current ? "text-brand-emphasis" : "text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                  )}

                  <span
                    className={cn(
                      "truncate text-[0.65rem] font-medium tracking-[0.04em] sm:text-[0.7rem]",
                      current
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <span className="sm:hidden">{step.shortLabel}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </span>
                </span>

                <span className="sr-only">
                  {complete
                    ? "completed"
                    : current
                      ? `current step, ${index + 1} of ${steps.length}`
                      : "not started"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
