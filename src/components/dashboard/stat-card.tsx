import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  /** Pre-formatted for display. Zero renders as "$0.00", never as "—". */
  value: string;
  icon: LucideIcon;
  /** Short clarifier under the value, e.g. why it is zero. */
  note?: string;
  /** Emphasises the primary figure on the overview. */
  emphasis?: boolean;
  className?: string;
};

/**
 * A single dashboard figure.
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
        "surface group/stat relative flex h-full flex-col gap-5 overflow-hidden rounded-xl border p-5 transition-colors duration-500 sm:p-6",
        emphasis
          ? "border-gold-500/22 hover:border-gold-500/35"
          : "border-white/10 hover:border-white/20",
        className
      )}
    >
      {emphasis && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-16 size-40 rounded-full bg-gold-500/10 blur-3xl"
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </p>
        <span
          aria-hidden="true"
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg border transition-colors duration-500",
            emphasis
              ? "border-gold-500/25 bg-gold-500/8 text-gold-300"
              : "border-white/10 bg-white/[0.03] text-muted-foreground group-hover/stat:text-foreground/80"
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>

      <div className="relative mt-auto flex flex-col gap-1.5">
        <p
          data-numeric
          className={cn(
            "text-2xl leading-none font-medium tracking-tight sm:text-[1.75rem]",
            emphasis ? "text-gold-100" : "text-foreground"
          )}
        >
          {value}
        </p>
        {note && (
          <p className="text-xs leading-relaxed text-muted-foreground/75">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
