import * as React from "react";

import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { cn } from "@/lib/utils";
import type { VehicleShowcaseItem } from "@/config/vehicles";

type VehicleCardProps = {
  vehicle: VehicleShowcaseItem;
  className?: string;
  /** Responsive `sizes` hint, set per layout to avoid oversized downloads. */
  sizes?: string;
};

/**
 * A vehicle *category* card.
 *
 * These describe market segments the investment plans are modelled around. Naming
 * a vehicle is descriptive and does not imply that any manufacturer supplies,
 * sponsors or endorses these plans — see `siteConfig.affiliationDisclaimer`.
 *
 * Artwork routes through `VehicleImage`, so swapping the placeholder SVGs for
 * licensed photography is an edit to `src/config/vehicles.ts` alone.
 */
export function VehicleCard({ vehicle, className, sizes }: VehicleCardProps) {
  return (
    <article
      className={cn(
        "group/vehicle panel panel-interactive flex flex-col overflow-hidden",
        className
      )}
    >
      <div className="relative border-b border-hairline bg-surface-2">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 bottom-2 h-14 rounded-[50%] bg-brand/12 blur-2xl"
        />
        <VehicleImage
          source={vehicle.image}
          sizes={sizes ?? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"}
          className="px-6 py-7"
          imageClassName="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/vehicle:scale-[1.03]"
          meaningful={false}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">{vehicle.segment}</span>
          <h3 className="text-lg font-semibold">{vehicle.name}</h3>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {vehicle.description}
        </p>

        <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {vehicle.highlights.map((highlight) => (
            <li
              key={highlight}
              className="rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-[0.68rem] font-medium text-muted-foreground"
            >
              {highlight}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
