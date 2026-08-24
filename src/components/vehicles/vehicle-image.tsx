import Image from "next/image";

import type { VehicleLamp } from "@/config/vehicles";
import { cn } from "@/lib/utils";

export type VehicleImageSource = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

type VehicleImageProps = {
  source: VehicleImageSource;
  className?: string;
  imageClassName?: string;
  /** Responsive `sizes` hint. Set this per layout to avoid oversized downloads. */
  sizes?: string;
  priority?: boolean;
  /** Decorative usages pass `false` so the alt text is emptied for AT. */
  meaningful?: boolean;
  /** Tracking-shot drift, so the vehicle reads as being under way. */
  driving?: boolean;
  /** Illuminates the headlight at the coordinates measured for this photograph. */
  lamp?: VehicleLamp;
  /** Light passing the vehicle. Worth switching off on small cards. */
  streaks?: boolean;
};

/**
 * Single entry point for all vehicle artwork.
 *
 * Centralising it means the photography in `public/images/vehicles/` can be
 * swapped by editing `src/config/vehicles.ts` alone — no component changes, no
 * layout regressions.
 *
 * ---------------------------------------------------------------------------
 * The driving treatment
 * ---------------------------------------------------------------------------
 * The category photographs are 3/4 views on an opaque road background, which
 * rules out everything the hero cutout does: a wheel in perspective is an
 * ellipse, so no circular clip can spin it without dragging the road round with
 * it, and an additive glow over lit paint reads as a smudge. So movement comes
 * from drifting the frame — the photographs already carry a motion-blurred road,
 * which makes that read as a tracking shot — and the lamp is *screen*-blended so
 * it brightens the headlight already in the image.
 *
 * All of it is CSS (`globals.css`, the `.te-photo-*` block), all of it inert and
 * `aria-hidden`, and `prefers-reduced-motion` parks the drift at origin and
 * removes the streaks entirely.
 *
 * SVG sources are still handled: the optimiser refuses them without
 * `dangerouslyAllowSVG`, so rather than loosening that setting they are marked
 * `unoptimized`. Raster sources optimise normally.
 */
export function VehicleImage({
  source,
  className,
  imageClassName,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  meaningful = true,
  driving = false,
  lamp,
  streaks = true,
}: VehicleImageProps) {
  const isVector = source.src.toLowerCase().endsWith(".svg");

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="te-photo-frame">
        <Image
          src={source.src}
          alt={meaningful ? source.alt : ""}
          width={source.width}
          height={source.height}
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          unoptimized={isVector}
          className={cn(
            "h-auto w-full object-contain",
            driving && "te-photo-drive",
            imageClassName
          )}
        />

        {lamp && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            {/* Wide bloom under a hot core, sharing one keyframe so their
                brightness never drifts out of phase — which is the difference
                between a premium lamp and a failing bulb. */}
            <span
              className="te-lamp-photo te-lamp-photo-bloom"
              style={{
                left: lamp.left,
                top: lamp.top,
                width: `calc(${lamp.width} * 2.6)`,
                aspectRatio: "1",
              }}
            />
            <span
              className="te-lamp-photo te-lamp-photo-core"
              style={{
                left: lamp.left,
                top: lamp.top,
                width: lamp.width,
                // A lamp is a raked slot, not a disc.
                aspectRatio: "2.6",
                rotate: `${lamp.rake}deg`,
              }}
            />
          </span>
        )}

        {driving && streaks && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <span
              className="te-streak"
              style={{
                top: "26%",
                width: "42%",
                height: "2px",
                opacity: 0.34,
                ["--te-streak-duration" as string]: "8.6s",
              }}
            />
            <span
              className="te-streak"
              style={{
                top: "78%",
                width: "56%",
                height: "1px",
                opacity: 0.24,
                animationDelay: "3.1s",
                ["--te-streak-duration" as string]: "11.2s",
              }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
