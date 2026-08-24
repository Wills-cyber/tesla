import * as React from "react";

import { vehicleAnatomy, type VehicleIntensity } from "@/config/vehicle-visual";
import { cn } from "@/lib/utils";

/**
 * Speed streaks, travelling right to left because the vehicle faces right.
 *
 * Positions are hand-placed rather than generated: they sit in the gaps around
 * the bodywork — above the roofline, along the sill, below the floor — so a
 * streak never crosses the car and read as a scratch on the paint.
 */
const STREAKS = [
  { top: "20%", width: "44%", height: "2px", duration: "8.4s", delay: "0s", opacity: 0.5 },
  { top: "38%", width: "62%", height: "1px", duration: "11s", delay: "2.1s", opacity: 0.34 },
  { top: "62%", width: "38%", height: "3px", duration: "7.2s", delay: "3.4s", opacity: 0.6 },
  { top: "83%", width: "70%", height: "2px", duration: "9.6s", delay: "1.2s", opacity: 0.42 },
] as const;

type VehicleMotionEffectProps = {
  intensity?: VehicleIntensity;
  /** Ground contact shadow. Off when the vehicle is cropped below the fold. */
  shadow?: boolean;
  /** Light streaks passing the car. */
  streaks?: boolean;
  /** Road markings rushing under the wheels. */
  road?: boolean;
  className?: string;
};

/**
 * The sense of movement around the brand vehicle.
 *
 * The car is a single raster, so the honest way to sell speed is to move the
 * world instead of distorting the subject: streaks overtake it, road markings
 * rush beneath it, and the contact shadow breathes in time with the body drift.
 * That is how it is done on a camera rig, and it has the useful side effect of
 * looping seamlessly — nothing has to travel back to where it started.
 *
 * Rendered inside a `.te-vehicle` box. Decorative and inert.
 */
export function VehicleMotionEffect({
  intensity = "strong",
  shadow = true,
  streaks = true,
  road = true,
  className,
}: VehicleMotionEffectProps) {
  const strong = intensity === "strong" || intensity === "medium";

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      {road && (
        <span
          className="te-road"
          style={{
            // Sits on the tyre contact line, spanning the wheelbase.
            top: "89%",
            left: "-50%",
            height: strong ? "3px" : "2px",
            opacity: strong ? 0.4 : 0.24,
            ["--te-road-duration" as string]: strong ? "5.2s" : "8s",
          }}
        />
      )}

      {shadow && (
        <span
          className="te-contact-shadow"
          style={{
            top: "88%",
            width: "82%",
            height: "9%",
          }}
        />
      )}

      {streaks &&
        STREAKS.map((streak) => (
          <span
            key={streak.top}
            className="te-streak"
            style={{
              top: streak.top,
              left: 0,
              width: streak.width,
              height: streak.height,
              opacity: streak.opacity * (strong ? 1 : 0.7),
              animationDelay: streak.delay,
              ["--te-streak-duration" as string]: streak.duration,
            }}
          />
        ))}

      {/* A short smear off the trailing edge of each wheel — the one place a
          still photograph of a moving car actually does blur. */}
      {strong &&
        vehicleAnatomy.wheels.map((wheel) => (
          <span
            key={wheel.id}
            aria-hidden="true"
            className="absolute -translate-y-1/2 rounded-full blur-[6px] motion-safe:animate-pulse-ring"
            style={{
              left: wheel.contact.left,
              top: wheel.contact.top,
              width: wheel.contact.width,
              height: "5%",
              background:
                "radial-gradient(closest-side, oklch(0.222 0.009 264 / 34%), transparent 76%)",
            }}
          />
        ))}
    </div>
  );
}
