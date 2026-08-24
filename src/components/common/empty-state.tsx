import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  /** Falls back to the brand mark, which is the right choice for app-level voids. */
  icon?: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** Optional short line explaining *why* it's empty, e.g. pre-launch status. */
  note?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
};

/**
 * The app's honest zero state.
 *
 * Used wherever a real account would show data. It exists so the product never
 * has to invent a placeholder transaction or a sample balance to fill a panel —
 * an empty panel with an explanation and a next step is more useful than a
 * fabricated one.
 *
 * With no `icon`, the brand mark stands in: an empty screen is still the product,
 * and the mark makes it feel deliberate rather than broken. A soft gold wash sits
 * behind it for the same reason — a dashed grey box reads as something that failed
 * to load, where a lit one reads as a state the product intends.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  note,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const padding = {
    sm: "gap-3 px-5 py-9",
    md: "gap-4 px-6 py-14",
    lg: "gap-5 px-6 py-20",
  }[size];

  return (
    <div
      className={cn(
        "relative isolate flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-brand-border bg-surface-2/60 text-center",
        padding,
        className
      )}
    >
      {/* Light pooling behind the mark, with no edge of its own. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 -top-16 -z-10 h-48 rounded-[50%] bg-brand-surface-strong blur-3xl"
      />

      <span
        aria-hidden="true"
        className={cn(
          "grid place-items-center rounded-2xl border border-brand-border bg-surface-1 text-brand shadow-soft",
          size === "sm" ? "size-11" : "size-14"
        )}
      >
        {Icon ? (
          <Icon className={size === "sm" ? "size-4.5" : "size-5"} />
        ) : (
          <LogoMark className={size === "sm" ? "size-6" : "size-7"} />
        )}
      </span>

      <div className="flex flex-col gap-1.5">
        <p
          className={cn(
            "font-medium text-foreground",
            size === "sm" ? "text-sm" : "text-base"
          )}
        >
          {title}
        </p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>

      {note && (
        <p className="max-w-md text-xs leading-relaxed text-subtle-foreground">
          {note}
        </p>
      )}

      {action && <div className="flex flex-wrap justify-center gap-2.5 pt-1">{action}</div>}
    </div>
  );
}
