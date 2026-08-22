import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Clock3 } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { cn } from "@/lib/utils";

type ComingSoonPanelProps = {
  title: string;
  description: React.ReactNode;
  icon?: LucideIcon;
  /** Bullet list of what has to happen before the feature ships. */
  requirements?: readonly string[];
  footnote?: React.ReactNode;
  className?: string;
};

/**
 * The panel used wherever a money-moving feature will eventually live.
 *
 * It states plainly that the feature is off, and lists what is outstanding, so
 * a visitor never has to guess whether a deposit "went through". No form, no
 * amount field, no gateway — there is nothing here to submit.
 */
export function ComingSoonPanel({
  title,
  description,
  icon: Icon = Clock3,
  requirements,
  footnote,
  className,
}: ComingSoonPanelProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]",
        className
      )}
    >
      {/* Single soft gold wash — the one decorative flourish in this component. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-gold-500/8 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-lg border border-gold-500/25 bg-gold-500/8 text-gold-300"
          >
            <Icon className="size-5" />
          </span>
          <StatusPill tone="gold" dot>
            Coming Soon
          </StatusPill>
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="text-2xl font-medium sm:text-[1.75rem]">{title}</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[0.95rem]">
            {description}
          </p>
        </div>

        {requirements && requirements.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-white/8 pt-6">
            <p className="eyebrow">Before this opens</p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {requirements.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-gold-500/70"
                  />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {footnote && (
          <p className="text-xs leading-relaxed text-muted-foreground/70">
            {footnote}
          </p>
        )}
      </div>
    </div>
  );
}
