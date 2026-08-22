import * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  /** Right-aligned actions — buttons, filters. */
  actions?: React.ReactNode;
  /** Sits above the title, e.g. a preview or status pill. */
  badge?: React.ReactNode;
  className?: string;
};

/** Consistent page title block for every dashboard route. */
export function PageHeader({
  title,
  description,
  actions,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 border-b border-white/8 pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        {badge}
        <h1 className="text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      )}
    </div>
  );
}
