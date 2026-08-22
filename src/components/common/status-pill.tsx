import * as React from "react";

import { cn } from "@/lib/utils";
import type { PlanStatus } from "@/types/investment";

type StatusPillProps = {
  children: React.ReactNode;
  tone?: "gold" | "neutral" | "success" | "warning" | "danger";
  className?: string;
  /** Adds a small leading dot. */
  dot?: boolean;
};

const toneClasses = {
  gold: "border-gold-500/30 bg-gold-500/8 text-gold-200",
  neutral: "border-white/12 bg-white/[0.04] text-muted-foreground",
  success: "border-emerald-400/25 bg-emerald-400/8 text-emerald-200",
  warning: "border-amber-400/25 bg-amber-400/8 text-amber-100",
  danger: "border-red-400/25 bg-red-400/8 text-red-200",
} as const;

const dotClasses = {
  gold: "bg-gold-400",
  neutral: "bg-muted-foreground",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
} as const;

/** Small capsule label. Deliberately the only badge style in the product. */
export function StatusPill({
  children,
  tone = "neutral",
  className,
  dot = false,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase",
        toneClasses[tone],
        className
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", dotClasses[tone])}
        />
      )}
      {children}
    </span>
  );
}

const planStatusCopy: Record<
  PlanStatus,
  { label: string; tone: StatusPillProps["tone"] }
> = {
  coming_soon: { label: "Coming Soon", tone: "gold" },
  open: { label: "Open", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
  sold_out: { label: "Fully Allocated", tone: "neutral" },
};

export function PlanStatusPill({
  status,
  className,
}: {
  status: PlanStatus;
  className?: string;
}) {
  const { label, tone } = planStatusCopy[status];
  return (
    <StatusPill tone={tone} dot className={className}>
      {label}
    </StatusPill>
  );
}
