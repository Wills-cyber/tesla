import Image from "next/image";

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
};

/**
 * Single entry point for all vehicle artwork.
 *
 * Centralising it means the placeholder SVGs in `public/images/vehicles/` can be
 * swapped for licensed photography by editing `src/config/vehicles.ts` alone —
 * no component changes, no layout regressions.
 *
 * The current placeholders are SVG, which the image optimiser deliberately
 * refuses to process without `dangerouslyAllowSVG`. Rather than loosening that
 * setting, SVG sources are marked `unoptimized`; drop in a `.webp`/`.avif` later
 * and optimisation turns itself back on.
 */
export function VehicleImage({
  source,
  className,
  imageClassName,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  meaningful = true,
}: VehicleImageProps) {
  const isVector = source.src.toLowerCase().endsWith(".svg");

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={source.src}
        alt={meaningful ? source.alt : ""}
        width={source.width}
        height={source.height}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        unoptimized={isVector}
        className={cn("h-auto w-full object-contain", imageClassName)}
      />
    </div>
  );
}
