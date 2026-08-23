import * as React from "react";

import { cn } from "@/lib/utils";
import type { InvestmentStatus, PlanStatus } from "@/types/investment";
import type { TransactionStatus } from "@/types/transaction";

export type PillTone =
  | "brand"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

type StatusPillProps = {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string;
  /** Adds a small leading dot. */
  dot?: boolean;
};

/**
 * Tone styles.
 *
 * Each pairs a tinted surface with the *readable* foreground for that tone
 * rather than the saturated colour itself, so the label passes contrast on both
 * the light and dark palettes.
 */
const toneClasses: Record<PillTone, string> = {
  brand: "border-brand-border bg-brand-surface text-brand-emphasis",
  neutral: "border-hairline bg-surface-2 text-muted-foreground",
  success: "border-success/25 bg-success-surface text-success",
  warning: "border-warning/25 bg-warning-surface text-warning",
  danger: "border-destructive/25 bg-destructive-surface text-destructive",
  info: "border-info/25 bg-info-surface text-info",
};

const dotClasses: Record<PillTone, string> = {
  brand: "bg-brand",
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
};

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
        // No `whitespace-nowrap`. A capsule that refuses to wrap is a latent
        // horizontal-overflow bug: it holds its full width whatever the viewport,
        // and a long label then pushes the document wider than the screen. Short
        // labels — which is nearly all of them — sit on one line regardless, so
        // allowing the wrap costs nothing and removes the failure mode.
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.09em] uppercase text-pretty",
        toneClasses[tone],
        className
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", dotClasses[tone])}
        />
      )}
      {children}
    </span>
  );
}

/* --------------------------------------------------------- Domain mappings */

const planStatusCopy: Record<PlanStatus, { label: string; tone: PillTone }> = {
  coming_soon: { label: "Coming Soon", tone: "brand" },
  open: { label: "Available", tone: "success" },
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

export const investmentStatusCopy: Record<
  InvestmentStatus,
  { label: string; tone: PillTone }
> = {
  pending_activation: { label: "Pending", tone: "warning" },
  active: { label: "Active", tone: "success" },
  completed: { label: "Completed", tone: "info" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function InvestmentStatusPill({
  status,
  className,
}: {
  status: InvestmentStatus;
  className?: string;
}) {
  const { label, tone } = investmentStatusCopy[status];
  return (
    <StatusPill tone={tone} dot className={className}>
      {label}
    </StatusPill>
  );
}

export const transactionStatusCopy: Record<
  TransactionStatus,
  { label: string; tone: PillTone }
> = {
  completed: { label: "Completed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  processing: { label: "Processing", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function TransactionStatusPill({
  status,
  className,
}: {
  status: TransactionStatus;
  className?: string;
}) {
  const { label, tone } = transactionStatusCopy[status];
  return (
    <StatusPill tone={tone} dot className={className}>
      {label}
    </StatusPill>
  );
}
