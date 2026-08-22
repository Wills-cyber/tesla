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
            <dt className="text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {term.label}
            </dt>
            <dd
              data-numeric
              className={cn(
                "text-lg font-semibold",
                term.emphasis ? "text-brand-emphasis" : "text-foreground"
              )}
            >
              {term.value}
            </dd>
            {term.hint && (
              <p className="text-[0.7rem] leading-relaxed text-subtle-foreground">
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
            "flex items-baseline justify-between gap-4 border-b border-hairline py-3 last:border-b-0",
            term.emphasis && "border-brand-border"
          )}
        >
          <dt className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            <span>{term.label}</span>
            {term.hint && (
              <span className="text-[0.7rem] text-subtle-foreground">
                {term.hint}
              </span>
            )}
          </dt>
          <dd
            data-numeric
            className={cn(
              "shrink-0 text-right text-sm font-semibold",
              term.emphasis ? "text-base text-brand-emphasis" : "text-foreground"
            )}
          >
            {term.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
