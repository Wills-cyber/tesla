import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** Optional short line explaining *why* it's empty, e.g. pre-launch status. */
  note?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
};

/**
 * The dashboard's honest zero state.
 *
 * Used wherever a real account would show data. It exists so the app never has
 * to invent a placeholder transaction or a sample balance to fill a panel.
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
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-white/12 bg-white/[0.015] text-center",
        size === "md" ? "gap-4 px-6 py-16" : "gap-3 px-5 py-10",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground"
      >
        <Icon className="size-5" />
      </span>

      <div className="flex flex-col gap-1.5">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>

      {note && (
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground/70">
          {note}
        </p>
      )}

      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
