/**
 * Vehicle showcase content.
 *
 * These entries describe electric-vehicle *categories* that the platform's
 * investment plans are modelled around. They are illustrative references, not a
 * claim that any manufacturer supplies, sponsors or endorses these plans.
 *
 * ---------------------------------------------------------------------------
 * The artwork
 * ---------------------------------------------------------------------------
 * Four photographs, one per category, all 1024x585 (1.75:1). Identical dimensions
 * are load-bearing: the showcase preview crossfades between them, and any
 * variation in aspect ratio would make the card jump height on every switch.
 *
 * They replaced a set of line-art SVG placeholders. Their source is the vehicle
 * region of the corresponding plan banner in `public/images/investments/` — those
 * banners are composites with plan pricing, badges and a call-to-action burnt into
 * the raster, so each crop starts clear of the copy and stops short of the detail
 * card. Where that clips the nose, the vehicle bleeds off the frame on purpose.
 * The banners themselves are untouched and still used, whole, by the plan cards.
 *
 * Unlike the hero vehicle these are not cutouts — each keeps its road background
 * and is presented framed. They are also 3/4 views, so the hero's wheel rotation
 * cannot apply: a wheel drawn in perspective is an ellipse, and clipping a circle
 * out of it would drag the background round with it. `VehicleImage` therefore
 * sells movement by drifting the frame and lighting the lamp instead.
 *
 * To swap in licensed photography: drop a 1.75:1 file into
 * `public/images/vehicles/`, point `image` at it, and re-measure `lamp`.
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
  /** Where to light the headlight. Omit and the photograph stays unlit. */
  lamp?: VehicleLamp;
};

/**
 * A headlight's position within its photograph.
 *
 * Percentages, so the glow stays locked to the lamp at every card size without a
 * line of JavaScript. Measured off a 10% reference grid rendered over each asset —
 * automatic detection kept latching onto sky and paint highlights, which are just
 * as bright as a lamp and far larger.
 */
export type VehicleLamp = {
  /** Lamp centre, as a share of the photograph's width and height. */
  left: string;
  top: string;
  /** Width of the hot core, as a share of the photograph's width. */
  width: string;
  /**
   * Rake of the lens, in CSS degrees. All four vehicles face left, and a Tesla
   * lamp slopes down toward the nose, so these are negative (anticlockwise).
   */
  rake: number;
};

const VEHICLE_IMAGE_BASE = "/images/vehicles";

/** Every photograph is 1024x585, and identical dimensions are deliberate. */
const IMAGE_SIZE = { width: 1024, height: 585 } as const;

export const vehicleShowcase: readonly VehicleShowcaseItem[] = [
  {
    id: "model-3",
    name: "Model 3",
    segment: "Compact electric sedan",
    description:
      "The high-volume electric sedan segment — the category most closely associated with mainstream EV adoption.",
    highlights: ["Rear & dual motor", "Compact sedan", "Mass-market segment"],
    image: {
      ...IMAGE_SIZE,
      src: `${VEHICLE_IMAGE_BASE}/model-3-compact-sedan.webp`,
      alt: "White Tesla Model 3 compact sedan on a mountain highway, front three-quarter view",
    },
    lamp: { left: "47%", top: "53%", width: "15%", rake: -16 },
  },
  {
    id: "model-y",
    name: "Model Y",
    segment: "Electric crossover SUV",
    description:
      "The crossover segment, combining sedan efficiency with the interior volume buyers expect from an SUV.",
    highlights: ["Crossover platform", "Five to seven seats", "Utility focus"],
    image: {
      ...IMAGE_SIZE,
      src: `${VEHICLE_IMAGE_BASE}/model-y-crossover-suv.webp`,
      alt: "Blue Tesla Model Y crossover SUV on a coastal road, front three-quarter view",
    },
    lamp: { left: "37%", top: "40%", width: "15%", rake: -22 },
  },
  {
    id: "cybertruck",
    name: "Cybertruck",
    segment: "Electric light truck",
    description:
      "Angular, exoskeleton-led light-truck design — the segment pushing electrification into commercial and utility use.",
    highlights: ["Exoskeleton body", "Light-truck class", "Utility payload"],
    image: {
      ...IMAGE_SIZE,
      src: `${VEHICLE_IMAGE_BASE}/cybertruck-light-truck.webp`,
      alt: "Silver Tesla Cybertruck on desert terrain at dusk, front three-quarter view",
    },
    // A full-width light bar rather than a lens, so the core is wide and nearly level.
    lamp: { left: "13%", top: "46%", width: "20%", rake: -10 },
  },
  {
    id: "model-s",
    name: "Model S",
    segment: "Performance electric sedan",
    description:
      "The long-range performance sedan segment, where range, aerodynamics and drivetrain output are pushed hardest.",
    highlights: ["Long range", "Tri-motor class", "Flagship segment"],
    image: {
      ...IMAGE_SIZE,
      src: `${VEHICLE_IMAGE_BASE}/model-s-performance-sedan.webp`,
      alt: "Red Tesla Model S performance sedan on a coastal road, front three-quarter view",
    },
    lamp: { left: "27%", top: "61%", width: "17%", rake: -18 },
  },
] as const;

/**
 * The hero vehicle is NOT configured here.
 *
 * It used to be: a line-art `hero-vehicle.svg` placeholder alongside the four
 * category illustrations above. It is now a photographic transparent cutout with
 * measured wheel, headlight and tail-lamp coordinates, because the landing page
 * spins its wheels and lights its lamps — and that needs geometry, not just a
 * path. Both live in `src/config/vehicle-visual.ts`.
 *
 * The entries above are a different asset set: category photographs, framed and
 * opaque, one per market segment.
 */

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
