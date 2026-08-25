import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
  className?: string;
  /** When true, hides the gradient rule separator (used on pages with their own header layout). */
  noRule?: boolean;
};

/**
 * Enhanced page header — premium gradient rule, gold eyebrow accent.
 *
 * Can be used standalone or with `noRule` for custom header layouts.
 * When `eyebrow` is provided, it appears with a gold dash accent.
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  eyebrow,
  className,
  noRule = false,
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

      {!noRule && (
        <span
          aria-hidden="true"
          className="h-px w-full bg-gradient-to-r from-brand-border via-hairline to-transparent"
        />
      )}
    </div>
  );
}