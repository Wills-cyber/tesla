import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoMarkProps = React.ComponentProps<"svg">;

/**
 * The brand mark: a chamfered aperture enclosing a "T" monogram.
 *
 * Drawn inline as an SVG so it inherits `currentColor` for the frame and uses
 * the gold token for the monogram — no asset request, no flash, crisp at any
 * size.
 */
export function LogoMark({ className, ...props }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
      {...props}
    >
      <defs>
        <linearGradient id="te-mark-gold" x1="8" y1="6" x2="26" y2="27">
          <stop offset="0%" stopColor="var(--gold-200)" />
          <stop offset="55%" stopColor="var(--gold-500)" />
          <stop offset="100%" stopColor="var(--gold-700)" />
        </linearGradient>
      </defs>

      {/* Chamfered aperture */}
      <path
        d="M11.4 2.6h9.2c1.02 0 2 .4 2.72 1.12l5.96 5.96A3.85 3.85 0 0 1 30.4 12.4v7.2c0 1.02-.4 2-1.12 2.72l-5.96 5.96a3.85 3.85 0 0 1-2.72 1.12h-9.2a3.85 3.85 0 0 1-2.72-1.12L2.72 22.32A3.85 3.85 0 0 1 1.6 19.6v-7.2c0-1.02.4-2 1.12-2.72l5.96-5.96A3.85 3.85 0 0 1 11.4 2.6Z"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.1"
      />

      {/* "T" monogram */}
      <path
        d="M10.6 11.6h10.8"
        stroke="url(#te-mark-gold)"
        strokeWidth="1.9"
        strokeLinecap="square"
      />
      <path
        d="M16 11.6v9.4"
        stroke="url(#te-mark-gold)"
        strokeWidth="1.9"
        strokeLinecap="square"
      />
      {/* Energy notch — reads as motion without becoming a lightning bolt */}
      <path
        d="M19.9 16.2h2.9l-2.1 3.1"
        stroke="url(#te-mark-gold)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** Hides the wordmark, leaving the mark alone (compact headers, avatars). */
  markOnly?: boolean;
  size?: "sm" | "md" | "lg";
  /** Renders as a plain element instead of a link to `/`. */
  asLink?: boolean;
};

const wordmarkSizes = {
  sm: { primary: "text-[0.95rem]", secondary: "text-[0.95rem]", mark: "size-7" },
  md: { primary: "text-[1.05rem]", secondary: "text-[1.05rem]", mark: "size-8" },
  lg: { primary: "text-xl", secondary: "text-xl", mark: "size-10" },
} as const;

/**
 * The full lockup. `TESLA` carries the weight, `Electronics` recedes — a
 * two-tone wordmark reads as one brand rather than two words.
 */
export function Logo({
  className,
  markOnly = false,
  size = "md",
  asLink = true,
}: LogoProps) {
  const sizes = wordmarkSizes[size];

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-foreground transition-opacity",
        asLink && "hover:opacity-85",
        className
      )}
    >
      <LogoMark className={sizes.mark} />
      {!markOnly && (
        <span className="flex items-baseline gap-[0.3em] leading-none whitespace-nowrap">
          <span
            className={cn(
              "font-semibold tracking-[0.16em] uppercase",
              sizes.primary
            )}
          >
            Tesla
          </span>
          <span
            className={cn(
              "font-light tracking-[0.02em] text-muted-foreground",
              sizes.secondary
            )}
          >
            Electronics
          </span>
        </span>
      )}
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      href="/"
      aria-label="TESLA Electronics — home"
      className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500/70"
    >
      {content}
    </Link>
  );
}
