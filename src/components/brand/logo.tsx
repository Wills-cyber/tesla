import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The TESLA Electronics brand mark.
 *
 * An original mark drawn for this product: a chamfered octagonal aperture — the
 * automotive/engineering reference — enclosing a "T" monogram whose crossbar
 * runs off into an energy trace. It is deliberately *not* any third party's
 * logo; TESLA Electronics is an independent platform (see
 * `siteConfig.affiliationDisclaimer`).
 *
 * Two variants, because a hairline outline disappears below ~20px:
 *   · `outline` — headers, nav, inline lockups.
 *   · `solid`   — favicon, app icon, avatars, small chips, dark overlays.
 *
 * Drawn inline as SVG so it inherits `currentColor`, needs no asset request and
 * stays crisp at any size. IDs are suffixed per instance so two marks on one
 * page can't collide in the SVG id namespace.
 */

type LogoMarkProps = React.ComponentProps<"svg"> & {
  variant?: "outline" | "solid";
};

const APERTURE_PATH =
  "M11.4 2.6h9.2c1.02 0 2 .4 2.72 1.12l5.96 5.96A3.85 3.85 0 0 1 30.4 12.4v7.2c0 1.02-.4 2-1.12 2.72l-5.96 5.96a3.85 3.85 0 0 1-2.72 1.12h-9.2a3.85 3.85 0 0 1-2.72-1.12L2.72 22.32A3.85 3.85 0 0 1 1.6 19.6v-7.2c0-1.02.4-2 1.12-2.72l5.96-5.96A3.85 3.85 0 0 1 11.4 2.6Z";

export function LogoMark({
  className,
  variant = "outline",
  ...props
}: LogoMarkProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const goldId = `te-gold-${uid}`;
  const plateId = `te-plate-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
      {...props}
    >
      <defs>
        <linearGradient id={goldId} x1="8" y1="6" x2="26" y2="27">
          <stop offset="0%" stopColor="var(--gold-300)" />
          <stop offset="48%" stopColor="var(--gold-500)" />
          <stop offset="100%" stopColor="var(--gold-700)" />
        </linearGradient>
        <linearGradient id={plateId} x1="4" y1="3" x2="28" y2="29">
          <stop offset="0%" stopColor="var(--ink-800)" />
          <stop offset="100%" stopColor="var(--ink-950)" />
        </linearGradient>
      </defs>

      {variant === "solid" ? (
        <path d={APERTURE_PATH} fill={`url(#${plateId})`} />
      ) : (
        <path
          d={APERTURE_PATH}
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1.2"
        />
      )}

      {/* "T" monogram */}
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
      {/* Circuit trace and pad — the "Electronics" half of the monogram. */}
      <path
        d="M16 18.9h3.7"
        stroke={`url(#${goldId})`}
        strokeWidth="1.7"
        fill="none"
      />
      <circle cx="21.6" cy="18.9" r="1.9" fill={`url(#${goldId})`} />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** Hides the wordmark, leaving the mark alone (compact headers, avatars). */
  markOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  /** Renders as a plain element instead of a link. */
  asLink?: boolean;
  /** Where the lockup links to. Defaults to the marketing home page. */
  href?: string;
  variant?: "outline" | "solid";
  /** Inverts the wordmark for use on the charcoal panel. */
  tone?: "default" | "inverse";
};

const wordmarkSizes = {
  xs: { text: "text-[0.8rem]", mark: "size-6", gap: "gap-2" },
  sm: { text: "text-[0.95rem]", mark: "size-7", gap: "gap-2.5" },
  md: { text: "text-[1.05rem]", mark: "size-8", gap: "gap-2.5" },
  lg: { text: "text-xl", mark: "size-10", gap: "gap-3" },
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
  href = "/",
  variant = "outline",
  tone = "default",
}: LogoProps) {
  const sizes = wordmarkSizes[size];

  const content = (
    <span
      className={cn(
        "inline-flex items-center transition-opacity",
        sizes.gap,
        tone === "inverse" ? "text-surface-inverse-foreground" : "text-foreground",
        asLink && "hover:opacity-80",
        className
      )}
    >
      <LogoMark variant={variant} className={sizes.mark} />
      {!markOnly && (
        <span className="flex items-baseline gap-[0.32em] leading-none whitespace-nowrap">
          <span
            className={cn("font-semibold tracking-[0.15em] uppercase", sizes.text)}
          >
            Tesla
          </span>
          <span
            className={cn(
              "font-light tracking-[0.02em]",
              tone === "inverse"
                ? "text-surface-inverse-foreground/65"
                : "text-muted-foreground",
              sizes.text
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
      href={href}
      aria-label="TESLA Electronics — home"
      className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
    >
      {content}
    </Link>
  );
}
