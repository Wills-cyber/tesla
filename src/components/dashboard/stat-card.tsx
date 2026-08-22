import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  /** Pre-formatted for display. Zero renders as "$0.00", never as "—". */
  value: string;
  icon?: LucideIcon;
  /** Short clarifier under the value, e.g. why it is zero. */
  note?: string;
  /** Emphasises the primary figure. */
  emphasis?: boolean;
  className?: string;
};

/**
 * A single account figure.
 *
 * Values arrive already formatted, and a zero balance is displayed as an actual
 * zero — a real account with no activity, which is what every account is today.
 * Nothing here derives a number from plan terms.
 *
 * Rendered on the server so the `icon` prop stays a plain import rather than
 * crossing the server/client boundary (Lucide icons are `forwardRef` objects and
 * are not serializable). Entrance animation comes from wrapping the card in
 * `RevealItem`, which keeps the motion in one client component instead of one per
 * card.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  note,
  emphasis = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group/stat relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl p-5 sm:p-6",
        emphasis
          ? "panel-brand"
          : "panel panel-interactive",
        className
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl border transition-colors duration-500",
              emphasis
                ? "border-brand-border bg-surface-1 text-brand"
                : "border-hairline bg-surface-2 text-muted-foreground group-hover/stat:text-foreground"
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <div className="relative mt-auto flex flex-col gap-1.5">
        <p
          data-numeric
          className={cn(
            "text-2xl leading-none font-semibold tracking-tight sm:text-[1.7rem]",
            emphasis ? "text-brand-emphasis" : "text-foreground"
          )}
        >
          {value}
        </p>
        {note && (
          <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
        )}
      </div>
    </div>
  );
}
