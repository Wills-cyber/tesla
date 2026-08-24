import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  /** Sits above the title, e.g. a preview or status pill. */
  badge?: React.ReactNode;
  /** Right-aligned actions — buttons, filters. */
  actions?: React.ReactNode;
  /** Small uppercase label above everything, naming the area. */
  eyebrow?: string;
  className?: string;
};

/**
 * Consistent page title block for every route in the app shell.
 *
 * Carries the page's only two pieces of colour: a short gold dash leading the
 * eyebrow, and a gradient hairline closing the block. Both are structural rather
 * than ornamental — the dash marks where the page identifies itself, and the rule
 * separates the header from content on pages that otherwise open onto bare
 * background, which is what made them read as unfinished.
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="flex min-w-0 flex-col gap-3">
          {eyebrow && (
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-px w-6 bg-gradient-to-r from-brand to-brand/20"
              />
              <span className="eyebrow text-brand-emphasis">{eyebrow}</span>
            </span>
          )}
          {badge}
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[2rem]">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {actions}
          </div>
        )}
      </div>

      <span
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-brand-border via-hairline to-transparent"
      />
    </div>
  );
}
