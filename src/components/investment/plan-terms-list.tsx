import * as React from "react";

import { cn } from "@/lib/utils";

export type PlanTerm = {
  label: string;
  value: string;
  /** Renders the value in the accent colour — use for the headline figure. */
  emphasis?: boolean;
  /** Small clarifier under the label, e.g. "stated, not guaranteed". */
  hint?: string;
};

type PlanTermsListProps = {
  terms: readonly PlanTerm[];
  className?: string;
  /** `rows` is a hairline-separated list; `grid` is a two-column spec block. */
  layout?: "rows" | "grid";
};

/**
 * Renders a plan's stated terms as a definition list.
 *
 * A `<dl>` rather than a table: these are label/value pairs, not tabular data,
 * and screen readers announce the pairing correctly.
 */
export function PlanTermsList({
  terms,
  className,
  layout = "rows",
}: PlanTermsListProps) {
  if (layout === "grid") {
    return (
      <dl className={cn("grid gap-x-8 gap-y-5 sm:grid-cols-2", className)}>
        {terms.map((term) => (
          <div key={term.label} className="flex flex-col gap-1">
            <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              {term.label}
            </dt>
            <dd
              data-numeric
              className={cn(
                "text-lg font-medium",
                term.emphasis ? "text-gold-200" : "text-foreground"
              )}
            >
              {term.value}
            </dd>
            {term.hint && (
              <p className="text-[0.7rem] leading-relaxed text-muted-foreground/70">
                {term.hint}
              </p>
            )}
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn("flex flex-col", className)}>
      {terms.map((term) => (
        <div
          key={term.label}
          className={cn(
            "flex items-baseline justify-between gap-4 border-b border-white/6 py-3 last:border-b-0",
            term.emphasis && "border-gold-500/20"
          )}
        >
          <dt className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            <span>{term.label}</span>
            {term.hint && (
              <span className="text-[0.7rem] text-muted-foreground/65">
                {term.hint}
              </span>
            )}
          </dt>
          <dd
            data-numeric
            className={cn(
              "shrink-0 text-right text-sm font-medium",
              term.emphasis
                ? "text-base text-gold-200"
                : "text-foreground"
            )}
          >
            {term.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
