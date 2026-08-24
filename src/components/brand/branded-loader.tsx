import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The branded loading experience.
 *
 * A generic spinning circle tells you nothing and belongs to no product, so the
 * app never shows one on its own. Instead the brand mark draws itself in, settles
 * with a breath and a soft halo, and a fine progress ring orbits it — the
 * sequence reads as "TESLA Electronics is opening", then hands off to the page.
 *
 * Implemented in pure CSS (keyframes live in `globals.css`) with no client
 * JavaScript, so it can be rendered from a Server Component — including
 * `loading.tsx` route boundaries, where a client component would add a bundle to
 * the critical path for something the user sees for 200ms.
 *
 * Reduced-motion users get the settled state immediately: the global
 * `prefers-reduced-motion` block collapses every animation duration.
 */

const sizeMap = {
  sm: { box: "size-9", mark: "size-5", ring: 34, stroke: 1.5 },
  md: { box: "size-14", mark: "size-8", ring: 54, stroke: 1.75 },
  lg: { box: "size-20", mark: "size-11", ring: 78, stroke: 2 },
} as const;

type BrandedLoaderProps = {
  size?: keyof typeof sizeMap;
  /** Short status line under the mark. Also announced to assistive tech. */
  label?: string;
  /** Hides the visible label but still announces it. */
  labelHidden?: boolean;
  className?: string;
};

/**
 * The animated mark on its own.
 *
 * Split out from `BrandedLoader` so buttons and inline slots can use the mark
 * without the ring, label or layout around it.
 */
export function BrandedMark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const goldId = `te-loader-gold-${uid}`;

  return (
    <span className={cn("relative grid place-items-center", className)}>
      {/* Soft gold halo, breathing in phase with the mark. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-brand blur-lg motion-safe:animate-mark-halo"
      />

      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className={cn(
          "relative size-8 shrink-0 origin-center motion-safe:animate-mark-breathe",
          markClassName
        )}
      >
        <defs>
          <linearGradient id={goldId} x1="8" y1="6" x2="26" y2="27">
            <stop offset="0%" stopColor="var(--gold-300)" />
            <stop offset="48%" stopColor="var(--gold-500)" />
            <stop offset="100%" stopColor="var(--gold-700)" />
          </linearGradient>
        </defs>

        {/* Aperture — traced in over the first half of the cycle. */}
        <path
          d="M11.4 2.6h9.2c1.02 0 2 .4 2.72 1.12l5.96 5.96A3.85 3.85 0 0 1 30.4 12.4v7.2c0 1.02-.4 2-1.12 2.72l-5.96 5.96a3.85 3.85 0 0 1-2.72 1.12h-9.2a3.85 3.85 0 0 1-2.72-1.12L2.72 22.32A3.85 3.85 0 0 1 1.6 19.6v-7.2c0-1.02.4-2 1.12-2.72l5.96-5.96A3.85 3.85 0 0 1 11.4 2.6Z"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1.2"
          pathLength={100}
          strokeDasharray="100"
          className="motion-safe:animate-mark-trace"
          style={{ ["--mark-dash" as string]: "100" }}
        />

        {/* "T" monogram + circuit trace. */}
        <path
          d="M10.2 11.3h11.6"
          stroke={`url(#${goldId})`}
          strokeWidth="2.3"
          strokeLinecap="square"
        />
        <path
          d="M16 11.3v10"
          stroke={`url(#${goldId})`}
          strokeWidth="2.3"
          strokeLinecap="square"
        />
        <path
          d="M16 18.9h3.7"
          stroke={`url(#${goldId})`}
          strokeWidth="1.7"
          fill="none"
        />
        <circle cx="21.6" cy="18.9" r="1.9" fill={`url(#${goldId})`} />
      </svg>
    </span>
  );
}

/** Mark + orbiting progress ring + optional label. */
export function BrandedLoader({
  size = "md",
  label = "Loading",
  labelHidden = false,
  className,
}: BrandedLoaderProps) {
  const { box, mark, ring, stroke } = sizeMap[size];
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center gap-4", className)}
    >
      <span className={cn("relative grid place-items-center", box)}>
        {/* Fine progress ring: a quarter-arc orbiting the mark. */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${ring} ${ring}`}
          className="absolute inset-0 size-full origin-center text-brand motion-safe:animate-orbit"
        >
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.24} ${circumference}`}
            opacity={0.9}
          />
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            opacity={0.12}
          />
        </svg>

        <BrandedMark className="size-full" markClassName={mark} />
      </span>

      <span
        className={cn(
          "text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase",
          labelHidden && "sr-only"
        )}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Page-level loading state.
 *
 * Fills its container and centres the loader, so it works both as a route
 * `loading.tsx` and inside a panel that is waiting on data.
 *
 * The mark is untouched — it is still the brand's loading language. What is added
 * behind it is the automotive lighting from the vehicle treatment: two light
 * streaks passing horizontally and a soft lamp bloom, the same `te-*` classes the
 * hero uses. It ties a route transition to the rest of the product without
 * turning the loader into a car, and it costs two spans and no JavaScript.
 */
export function BrandedLoaderScreen({
  label = "Loading",
  className,
  size = "lg",
}: {
  label?: string;
  className?: string;
  size?: keyof typeof sizeMap;
}) {
  return (
    <div
      aria-busy="true"
      className={cn(
        "relative flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-6 py-20",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <span
          className="te-lamp te-lamp-bloom absolute top-1/2 left-1/2 size-64"
          style={{ opacity: 0.5 }}
        />
        <span
          className="te-streak"
          style={{
            top: "38%",
            width: "36%",
            height: "1px",
            opacity: 0.34,
            ["--te-streak-duration" as string]: "9s",
          }}
        />
        <span
          className="te-streak"
          style={{
            top: "63%",
            width: "26%",
            height: "2px",
            opacity: 0.26,
            animationDelay: "3.2s",
            ["--te-streak-duration" as string]: "11.5s",
          }}
        />
      </span>

      <BrandedLoader size={size} label={label} />
    </div>
  );
}

/**
 * Button-sized mark for in-flight form submissions.
 *
 * Same brand language as the full loader, sized to sit beside button text.
 */
export function BrandedSpinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid size-4 shrink-0 origin-center place-items-center motion-safe:animate-orbit",
        className
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-full">
        <circle
          cx="8"
          cy="8"
          r="6.5"
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.2"
        />
        <circle
          cx="8"
          cy="8"
          r="6.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="10 41"
        />
      </svg>
    </span>
  );
}
