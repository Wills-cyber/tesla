import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * What the figure is, expressed as colour.
 *
 * Not decoration: `brand` is money you hold, `success` is money actually paid to
 * you, `info` is a position in flight, `warning` is something waiting on you.
 * Reading down a column of these, the hue identifies the figure before the label
 * does. `neutral` is the plain white card, for figures with no such meaning.
 */
export type StatTone = "neutral" | "brand" | "success" | "info" | "warning";

type StatCardProps = {
  label: string;
  /** Pre-formatted for display. Zero renders as "$0.00", never as "—". */
  value: string;
  icon?: LucideIcon;
  /** Short clarifier under the value, e.g. why it is zero. */
  note?: string;
  tone?: StatTone;
  /**
   * Emphasises the primary figure.
   *
   * Retained for callers that only want "make this one stand out" without picking
   * a meaning; it resolves to the brand tint.
   */
  emphasis?: boolean;
  className?: string;
};

const TONE_CLASS: Record<StatTone, string> = {
  neutral: "",
  brand: "tint-brand",
  success: "tint-success",
  info: "tint-info",
  warning: "tint-warning",
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
  tone,
  emphasis = false,
  className,
}: StatCardProps) {
  const resolved: StatTone = tone ?? (emphasis ? "brand" : "neutral");
  const tinted = resolved !== "neutral";

  return (
    <div
      className={cn(
        "group/stat relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl p-5 sm:p-6",
        tinted ? cn("panel-tint", TONE_CLASS[resolved]) : "panel panel-interactive",
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
              "grid size-9 shrink-0 place-items-center rounded-xl transition-colors duration-500",
              tinted
                ? "tint-chip"
                : "border border-hairline bg-surface-2 text-muted-foreground group-hover/stat:text-foreground"
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
            tinted ? "tint-ink" : "text-foreground"
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
