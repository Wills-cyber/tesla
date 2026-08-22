"use client";

import * as React from "react";

import { scorePassword } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

const SEGMENTS = 4;

const segmentColours = [
  "bg-destructive/70",
  "bg-amber-500/80",
  "bg-amber-400/90",
  "bg-emerald-400/90",
] as const;

/**
 * Password strength hint.
 *
 * A UI affordance only — `registerSchema` is what actually gates submission, so
 * a "Very strong" reading never bypasses the minimum requirements. The reading is
 * announced politely rather than assertively so it doesn't interrupt typing.
 */
export function PasswordStrengthMeter({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const { score, label } = scorePassword(value);

  if (!value) return null;

  return (
    <div className={cn("flex flex-col gap-1.5 pt-1", className)}>
      <div
        className="flex gap-1.5"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={SEGMENTS}
        aria-label="Password strength"
      >
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-400",
              index < score ? segmentColours[score - 1] : "bg-white/10"
            )}
          />
        ))}
      </div>

      <p aria-live="polite" className="text-[0.7rem] text-muted-foreground/80">
        {label}
      </p>
    </div>
  );
}
