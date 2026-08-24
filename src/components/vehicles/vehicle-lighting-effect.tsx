import * as React from "react";

import {
  HEADLIGHT_RAKE_DEG,
  vehicleAnatomy,
  type VehicleIntensity,
} from "@/config/vehicle-visual";
import { cn } from "@/lib/utils";

type VehicleLightingEffectProps = {
  intensity?: VehicleIntensity;
  /** Projects light forward from the nose. Off for background treatments. */
  beam?: boolean;
  /** The rear cluster's soft red ember. */
  taillight?: boolean;
  className?: string;
};

/**
 * Headlight and tail-lamp illumination for the brand vehicle.
 *
 * Purely additive: nothing here touches the photograph. Layers are pinned to the
 * lens coordinates measured in `src/config/vehicle-visual.ts` and sized as a
 * share of the vehicle wrapper, so they stay locked to the lamps at every
 * breakpoint without a single line of JavaScript.
 *
 * Three layers per lamp — a hot core, a wide bloom, and (optionally) a cone
 * thrown forward. They share one keyframe so their brightness never drifts out
 * of phase, which is what separates "premium automotive lighting" from "bulb
 * about to fail".
 *
 * Must be rendered inside a `.te-vehicle` box, and only ever as decoration:
 * every element is inert and hidden from assistive technology by the wrapper.
 */
export function VehicleLightingEffect({
  intensity = "strong",
  beam = true,
  taillight = true,
  className,
}: VehicleLightingEffectProps) {
  // Ambient surfaces get a smaller, softer lamp: at 10% layer opacity a large
  // bloom just reads as haze.
  const scale = intensity === "strong" ? 1 : intensity === "medium" ? 0.82 : 0.62;

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      {beam && (
        <span
          className="te-lamp-beam"
          style={{
            left: vehicleAnatomy.nose.left,
            top: vehicleAnatomy.headlight.top,
            width: `${34 * scale}%`,
            height: `${30 * scale}%`,
          }}
        />
      )}

      <span
        className="te-lamp te-lamp-bloom"
        style={{
          left: vehicleAnatomy.headlight.left,
          top: vehicleAnatomy.headlight.top,
          width: `${22 * scale}%`,
          aspectRatio: "1",
        }}
      />

      <span
        className="te-lamp te-lamp-core"
        style={{
          left: vehicleAnatomy.headlight.left,
          top: vehicleAnatomy.headlight.top,
          width: `${7.6 * scale}%`,
          // The lens is a raked slot, not a disc — matching its rake keeps the
          // core reading as the lamp rather than as a dot stuck on the wing. It
          // descends toward the nose, hence a positive (clockwise) angle.
          aspectRatio: "2.3",
          rotate: `${HEADLIGHT_RAKE_DEG}deg`,
        }}
      />

      {taillight && (
        <span
          className="te-lamp-tail"
          style={{
            left: vehicleAnatomy.taillight.left,
            top: vehicleAnatomy.taillight.top,
            width: `${9 * scale}%`,
            aspectRatio: "1.7",
          }}
        />
      )}
    </div>
  );
}
