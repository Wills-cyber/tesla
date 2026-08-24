import * as React from "react";

import { TeslaHeroVehicle } from "@/components/vehicles/tesla-hero-vehicle";
import { INTENSITY_OPACITY, type VehicleIntensity } from "@/config/vehicle-visual";
import { cn } from "@/lib/utils";

export type VehicleBackgroundSize = "sm" | "md" | "lg" | "xl";
export type VehicleBackgroundPosition =
  | "bottom-right"
  | "bottom-left"
  | "bottom-center"
  | "center-right"
  | "top-right";

type TeslaVehicleBackgroundProps = {
  /** Loudness preset. Drives layer opacity and how much motion is drawn. */
  intensity?: VehicleIntensity;
  /** Overrides the preset's layer opacity. */
  opacity?: number;
  /** Vehicle width as a share of the container. */
  size?: VehicleBackgroundSize;
  position?: VehicleBackgroundPosition;
  /** Master switch. `false` renders the same composition, held still. */
  animated?: boolean;
  /** Drop the vehicle and keep only the environment. */
  vehicle?: boolean;
  /** Rotating wheels. Off by default — invisible at background opacity. */
  wheels?: boolean;
  lighting?: boolean;
  particles?: boolean;
  streaks?: boolean;
  /** The faint engineering grid. */
  grid?: boolean;
  /**
   * `true` pins the layer to the viewport (an app-shell backdrop that does not
   * scroll); `false` fills the nearest positioned ancestor.
   */
  fixed?: boolean;
  className?: string;
};

/** Ambient motes. Hand-placed so they never clump, and dropped on phones. */
const PARTICLES = [
  { left: "18%", top: "34%", size: 3, duration: "17s", delay: "0s" },
  { left: "41%", top: "62%", size: 2, duration: "22s", delay: "4.5s" },
  { left: "64%", top: "26%", size: 4, duration: "19s", delay: "2.2s" },
  { left: "78%", top: "54%", size: 2, duration: "25s", delay: "7.8s" },
  { left: "88%", top: "38%", size: 3, duration: "20s", delay: "11s" },
  { left: "31%", top: "78%", size: 2, duration: "24s", delay: "6.1s" },
] as const;

const SIZE_CLASSES: Record<VehicleBackgroundSize, string> = {
  sm: "w-[76%] sm:w-[46%] lg:w-[38%]",
  md: "w-[96%] sm:w-[64%] lg:w-[54%]",
  lg: "w-[118%] sm:w-[82%] lg:w-[70%]",
  xl: "w-[140%] sm:w-[104%] lg:w-[92%]",
};

const POSITION_CLASSES: Record<VehicleBackgroundPosition, string> = {
  "bottom-right": "right-[-6%] bottom-[4%] sm:right-[-3%]",
  "bottom-left": "left-[-10%] bottom-[4%] sm:left-[-4%]",
  "bottom-center": "left-1/2 bottom-[2%] -translate-x-1/2",
  "center-right": "right-[-8%] top-1/2 -translate-y-1/2 sm:right-[-2%]",
  "top-right": "right-[-8%] top-[8%] sm:right-[-2%]",
};

/**
 * TESLA Electronics' vehicle background treatment, as one reusable layer.
 *
 * This is the brand's environment: a faint engineering grid, two soft washes of
 * light, streaks passing horizontally, a few ambient motes, and the brand
 * vehicle sitting in the depth of the frame. Every surface in the product draws
 * from this single component with a different preset, so the animation exists
 * once and a change to the language changes everywhere at once.
 *
 * ---------------------------------------------------------------------------
 * Readability is the constraint, not an afterthought
 * ---------------------------------------------------------------------------
 * · The layer is inert — `pointer-events-none`, `aria-hidden`, no focusable
 *   children — so it cannot intercept a tap or a tab stop.
 * · It sits at `z-0` beneath page content, which stays on opaque card surfaces.
 * · The vehicle is masked to nothing toward the top of the frame (`te-fade-top`),
 *   because that is where headings and page copy sit on bare background.
 * · Presets top out at 26% opacity outside the landing hero. Balances, wallet
 *   addresses and transaction rows are read against `--surface-1`, which is
 *   fully opaque.
 *
 * Performance: CSS transforms, opacity and filters only. No JavaScript runs
 * after mount, and `prefers-reduced-motion` collapses the whole thing to a still
 * frame via the global block in `globals.css`.
 */
export function TeslaVehicleBackground({
  intensity = "subtle",
  opacity,
  size = "md",
  position = "bottom-right",
  animated = true,
  vehicle = true,
  wheels = false,
  lighting = true,
  particles = true,
  streaks = true,
  grid = true,
  fixed = false,
  className,
}: TeslaVehicleBackgroundProps) {
  const layerOpacity = opacity ?? INTENSITY_OPACITY[intensity];
  const loud = intensity === "medium" || intensity === "strong";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none overflow-hidden select-none",
        fixed ? "fixed inset-0 z-0" : "absolute inset-0 -z-10",
        className
      )}
    >
      {grid && (
        <div className="grid-field mask-fade-b absolute inset-0 opacity-[0.55]" />
      )}

      {/* Gold key light and a cool counter-light, so the wash never reads as a
          single flat tint. */}
      <div
        className={cn(
          "absolute -top-1/4 left-1/2 h-[38rem] w-[64rem] -translate-x-1/2 rounded-full blur-3xl",
          "bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--gold-500)_16%,transparent),transparent)]",
          animated && "motion-safe:animate-drift"
        )}
      />
      <div className="absolute bottom-0 -left-32 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,rgba(120,150,220,0.12),transparent)] blur-3xl" />

      {streaks && animated && (
        <div className="absolute inset-x-0 top-1/3 bottom-1/4">
          <span
            className="te-streak"
            style={{
              top: "12%",
              width: "34%",
              height: "1px",
              opacity: loud ? 0.5 : 0.32,
              ["--te-streak-duration" as string]: "12s",
            }}
          />
          <span
            className="te-streak"
            style={{
              top: "58%",
              width: "48%",
              height: "2px",
              opacity: loud ? 0.42 : 0.26,
              animationDelay: "4.6s",
              ["--te-streak-duration" as string]: "15s",
            }}
          />
        </div>
      )}

      {particles &&
        animated &&
        PARTICLES.map((particle) => (
          <span
            key={`${particle.left}-${particle.top}`}
            className="te-particle"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              opacity: loud ? 0.65 : 0.4,
              animationDelay: particle.delay,
              ["--te-particle-duration" as string]: particle.duration,
            }}
          />
        ))}

      {vehicle && (
        <div
          className={cn(
            "absolute",
            SIZE_CLASSES[size],
            POSITION_CLASSES[position]
          )}
          style={{ opacity: layerOpacity }}
        >
          <TeslaHeroVehicle
            intensity={intensity}
            // The vehicle is small and dim here, so a modest candidate is
            // plenty — the optimiser serves far fewer bytes than the hero's.
            sizes="(min-width: 1024px) 42vw, 92vw"
            wheels={wheels}
            lighting={lighting}
            motion={loud}
            driving={animated}
            className={cn(
              "te-fade-top",
              // Pulls the white bodywork toward the page's neutral so it reads
              // as depth rather than as a photograph someone left behind a card.
              "saturate-[0.7] contrast-[1.05]"
            )}
          />
        </div>
      )}
    </div>
  );
}
