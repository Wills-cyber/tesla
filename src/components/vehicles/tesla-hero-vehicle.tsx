import * as React from "react";
import Image from "next/image";

import { VehicleLightingEffect } from "@/components/vehicles/vehicle-lighting-effect";
import { VehicleMotionEffect } from "@/components/vehicles/vehicle-motion-effect";
import {
  heroVehicle,
  vehicleAnatomy,
  type VehicleIntensity,
} from "@/config/vehicle-visual";
import { cn } from "@/lib/utils";

type TeslaHeroVehicleProps = {
  /** How loud the treatment is. `strong` is the landing hero. */
  intensity?: VehicleIntensity;
  /** Responsive `sizes` hint. Every copy must share it — see below. */
  sizes?: string;
  priority?: boolean;
  /** Rotating wheel overlays. Wasted below `medium`, where they aren't visible. */
  wheels?: boolean;
  lighting?: boolean;
  motion?: boolean;
  /** Body drift. Off for reduced surfaces and inside static contexts. */
  driving?: boolean;
  /** Non-empty only where the vehicle carries meaning rather than atmosphere. */
  alt?: string;
  className?: string;
  imageClassName?: string;
  style?: React.CSSProperties;
};

/**
 * The brand vehicle, presented as if it were being driven.
 *
 * The photograph is a transparent cutout, so there is no rectangle and no edge
 * to hide — it composites straight onto whatever is behind it. Everything that
 * moves is an overlay: see `src/config/vehicle-visual.ts` for the measured
 * coordinates and `globals.css` for the keyframes.
 *
 * ---------------------------------------------------------------------------
 * Why the wheels genuinely rotate
 * ---------------------------------------------------------------------------
 * Rotating the whole car would be wrong, and rotating a raster wheel usually
 * means distorting the body with it. Neither happens here. Each wheel gets a
 * circular window clipped to 94% of its tyre radius, and inside that window sits
 * the *same* photograph scaled and offset so that wheel alone fills it. Spin the
 * window's contents and the wheel spins; the bodywork above it never moves, and
 * no pixel is stretched. The remaining sliver of tyre outside the clip is
 * uniform rubber, so the join is invisible.
 *
 * That does mean three `<Image>` elements referencing one file. They are handed
 * an identical `src` *and* an identical `sizes`, which is what makes the browser
 * resolve all three to the same `srcset` candidate and fetch the bytes once. Do
 * not vary `sizes` between them — it would triple the download for no visual
 * gain.
 */
export function TeslaHeroVehicle({
  intensity = "strong",
  sizes = "(min-width: 1024px) 46vw, 92vw",
  priority = false,
  wheels = true,
  lighting = true,
  motion = true,
  driving = true,
  alt = "",
  className,
  imageClassName,
  style,
}: TeslaHeroVehicleProps) {
  return (
    <div
      className={cn("te-vehicle w-full", className)}
      style={style}
      // Atmosphere, not information: with an empty `alt` the whole subtree is
      // skipped by assistive tech, which is the correct outcome on every
      // surface except the hero, where the caller passes real alt text.
      aria-hidden={alt ? undefined : "true"}
    >
      {/* `te-vehicle-drive` is a plain component class, not a Tailwind utility,
          so it takes no `motion-safe:` variant — reduced motion is handled by
          the global `prefers-reduced-motion` block, which parks every keyframe
          on its resting state. */}
      <div className={cn("relative", driving && "te-vehicle-drive")}>
        <Image
          src={heroVehicle.src}
          alt={alt}
          width={heroVehicle.width}
          height={heroVehicle.height}
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className={cn("relative z-10 h-auto w-full", imageClassName)}
        />

        {wheels &&
          vehicleAnatomy.wheels.map((wheel) => (
            <span
              key={wheel.id}
              className="te-wheel z-20"
              style={{
                left: wheel.frame.left,
                top: wheel.frame.top,
                width: wheel.frame.width,
              }}
            >
              <span className="te-wheel-spin">
                <Image
                  src={heroVehicle.src}
                  alt=""
                  width={heroVehicle.width}
                  height={heroVehicle.height}
                  sizes={sizes}
                  loading="eager"
                  className="absolute max-w-none"
                  style={{
                    width: wheel.image.width,
                    height: "auto",
                    left: wheel.image.left,
                    top: wheel.image.top,
                  }}
                />
              </span>
              <span className="te-wheel-sheen" />
            </span>
          ))}

        {motion && <VehicleMotionEffect intensity={intensity} className="z-0" />}
        {lighting && (
          <VehicleLightingEffect intensity={intensity} className="z-30" />
        )}
      </div>
    </div>
  );
}
