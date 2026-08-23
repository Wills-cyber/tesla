/**
 * Vehicle showcase content.
 *
 * These entries describe electric-vehicle *categories* that the platform's
 * investment plans are modelled around. They are illustrative references, not a
 * claim that any manufacturer supplies, sponsors or endorses these plans.
 *
 * ---------------------------------------------------------------------------
 * Replacing the placeholder artwork
 * ---------------------------------------------------------------------------
 * Every image is referenced only by the `image` field below, so swapping in real
 * photography is a one-line change per entry:
 *
 *   1. Drop the licensed asset into `public/images/vehicles/`
 *      (recommended: 1600x900 WebP/AVIF, transparent or near-black background).
 *   2. Point `image` at the new file and update `width` / `height`.
 *   3. For remote images, add the host to `images.remotePatterns` in
 *      `next.config.ts` and use the absolute URL here.
 *
 * `VehicleImage` (src/components/vehicles/vehicle-image.tsx) handles sizing,
 * lazy loading and the fallback treatment, so no component edits are required.
 */
export type VehicleShowcaseItem = {
  id: string;
  /** Category label, e.g. the market segment the plan is modelled on. */
  name: string;
  segment: string;
  description: string;
  /** Short spec-style facts. Descriptive of the segment, not a plan promise. */
  highlights: readonly string[];
  image: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
};

const VEHICLE_IMAGE_BASE = "/images/vehicles";

export const vehicleShowcase: readonly VehicleShowcaseItem[] = [
  {
    id: "model-3",
    name: "Model 3",
    segment: "Compact electric sedan",
    description:
      "The high-volume electric sedan segment — the category most closely associated with mainstream EV adoption.",
    highlights: ["Rear & dual motor", "Compact sedan", "Mass-market segment"],
    image: {
      src: `${VEHICLE_IMAGE_BASE}/compact-sedan.svg`,
      width: 1600,
      height: 900,
      alt: "Illustration of a compact electric sedan in side profile",
    },
  },
  {
    id: "model-y",
    name: "Model Y",
    segment: "Electric crossover SUV",
    description:
      "The crossover segment, combining sedan efficiency with the interior volume buyers expect from an SUV.",
    highlights: ["Crossover platform", "Five to seven seats", "Utility focus"],
    image: {
      src: `${VEHICLE_IMAGE_BASE}/crossover-suv.svg`,
      width: 1600,
      height: 900,
      alt: "Illustration of an electric crossover SUV in side profile",
    },
  },
  {
    id: "cybertruck",
    name: "Cybertruck",
    segment: "Electric light truck",
    description:
      "Angular, exoskeleton-led light-truck design — the segment pushing electrification into commercial and utility use.",
    highlights: ["Exoskeleton body", "Light-truck class", "Utility payload"],
    image: {
      src: `${VEHICLE_IMAGE_BASE}/electric-truck.svg`,
      width: 1600,
      height: 900,
      alt: "Illustration of an angular electric light truck in side profile",
    },
  },
  {
    id: "model-s",
    name: "Model S",
    segment: "Performance electric sedan",
    description:
      "The long-range performance sedan segment, where range, aerodynamics and drivetrain output are pushed hardest.",
    highlights: ["Long range", "Tri-motor class", "Flagship segment"],
    image: {
      src: `${VEHICLE_IMAGE_BASE}/performance-sedan.svg`,
      width: 1600,
      height: 900,
      alt: "Illustration of a performance electric sedan in side profile",
    },
  },
] as const;

/** Artwork used in the hero. Replace with licensed photography when available. */
export const heroVehicleImage = {
  src: `${VEHICLE_IMAGE_BASE}/hero-vehicle.svg`,
  width: 1800,
  height: 900,
  alt: "Illustration of a premium electric vehicle in three-quarter profile",
} as const;

/**
 * Investment-plan artwork is NOT configured here.
 *
 * Plans carry their own `imageUrl` (see `src/config/investment-plans.ts`), which
 * points straight at `public/images/investments/<slug>.png`. That removed the
 * lookup table that used to live here: a key had to be resolved by the
 * application, so changing a plan's artwork needed a deploy. A path does not.
 *
 * The showcase entries above remain for the marketing vehicle section, which is
 * about vehicle *categories* rather than plans.
 */
