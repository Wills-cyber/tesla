"use client";

import * as React from "react";
import { motion } from "motion/react";

import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { vehicleShowcase } from "@/config/vehicles";
import { revealViewport, transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Vehicle category showcase.
 *
 * A tab-less selector: clicking a category swaps the large preview. Kept as one
 * client component because the crossfade needs shared state, but the artwork
 * still routes through `VehicleImage` so replacing placeholders is a config edit.
 *
 * These are market *categories* the plans are modelled on. Naming a vehicle here
 * is descriptive and does not imply any manufacturer supplies, sponsors or
 * endorses these plans.
 */
export function VehicleShowcase() {
  const [activeId, setActiveId] = React.useState(vehicleShowcase[0].id);
  const active =
    vehicleShowcase.find((item) => item.id === activeId) ?? vehicleShowcase[0];

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:items-center lg:gap-14">
      {/* ------------------------------------------------------- Category list */}
      <ul
        className="flex flex-col overflow-hidden rounded-2xl border border-white/8"
        aria-label="Vehicle categories"
      >
        {vehicleShowcase.map((item) => {
          const isActive = item.id === active.id;

          return (
            <li key={item.id} className="border-b border-white/6 last:border-b-0">
              <button
                type="button"
                onClick={() => setActiveId(item.id)}
                aria-pressed={isActive}
                aria-controls="vehicle-showcase-preview"
                className={cn(
                  "group/vehicle relative flex w-full items-center gap-4 px-5 py-5 text-left transition-colors duration-400",
                  isActive
                    ? "bg-white/[0.035]"
                    : "hover:bg-white/[0.02] focus-visible:bg-white/[0.02]"
                )}
              >
                {/* Active rail */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-px origin-center bg-gold-500 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isActive ? "scale-y-100" : "scale-y-0"
                  )}
                />

                <div className="flex flex-1 flex-col gap-1">
                  <span
                    className={cn(
                      "text-base font-medium transition-colors duration-300",
                      isActive
                        ? "text-foreground"
                        : "text-foreground/70 group-hover/vehicle:text-foreground"
                    )}
                  >
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.segment}
                  </span>
                </div>

                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full transition-all duration-400",
                    isActive
                      ? "bg-gold-400 shadow-[0_0_10px_2px_var(--gold-700)]"
                      : "bg-white/15"
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* ------------------------------------------------------------ Preview */}
      <div
        id="vehicle-showcase-preview"
        aria-live="polite"
        className="surface relative overflow-hidden rounded-2xl border border-white/10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[12%] top-[38%] h-40 rounded-[50%] bg-gold-500/10 blur-3xl"
        />

        <motion.div
          key={active.id}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={transitions.base}
          className="relative flex flex-col gap-6 p-6 sm:p-8"
        >
          <VehicleImage
            source={active.image}
            sizes="(min-width: 1024px) 52vw, 92vw"
            imageClassName="drop-shadow-[0_28px_60px_rgba(0,0,0,0.6)]"
          />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-xl font-medium sm:text-2xl">{active.name}</h3>
              <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                {active.segment}
              </span>
            </div>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
              {active.description}
            </p>

            <ul className="mt-1 flex flex-wrap gap-2">
              {active.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.7rem] tracking-[0.06em] text-muted-foreground"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Static grid variant used where interactivity isn't warranted. */
export function VehicleShowcaseGrid() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {vehicleShowcase.map((item, index) => (
        <motion.li
          key={item.id}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={revealViewport}
          transition={{ ...transitions.base, delay: index * 0.07 }}
          whileHover={{ y: -4 }}
          className="surface group/card flex flex-col gap-4 rounded-2xl border border-white/10 p-5 transition-colors duration-500 hover:border-gold-500/25"
        >
          <VehicleImage
            source={item.image}
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 44vw, 88vw"
            imageClassName="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.04]"
            meaningful={false}
          />
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-medium">{item.name}</h3>
            <p className="text-xs text-muted-foreground">{item.segment}</p>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
