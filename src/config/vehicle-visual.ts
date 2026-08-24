/**
 * The brand vehicle — geometry, not artwork.
 *
 * ---------------------------------------------------------------------------
 * What this file is
 * ---------------------------------------------------------------------------
 * `public/images/branding/tesla-electronics-hero-car.png` is a photographic
 * cutout (transparent RGBA, 1923x818) of a white electric performance SUV in
 * side profile, nose pointing right. It is the single hero/background vehicle
 * for the whole product and is deliberately SEPARATE from the five
 * investment-plan photographs in `public/images/investments/` — those stay
 * per-plan and are never replaced by this asset.
 *
 * Because it is one flat raster, nothing in it can be moved independently. What
 * *can* be done is overlay effects at exact coordinates: a circular crop of a
 * wheel rotated in place, a glow pinned to the headlight lens. That only works
 * if the coordinates are measured rather than guessed, so they are measured
 * here, once, in image pixels — and every consumer derives percentages from
 * them. Re-crop or replace the photo and this file is the only edit needed.
 *
 * Measurements were taken by decoding the PNG: circles fitted to the tyre
 * silhouette from horizontal chords, and light positions from the centroids of
 * the lens housing and the red tail-lamp pixels. They are accurate to ~3px.
 */

export const heroVehicle = {
  src: "/images/branding/tesla-electronics-hero-car.png",
  width: 1923,
  height: 818,
  alt: "White electric performance SUV in side profile, driving to the right",
} as const;

/** The vehicle drives to the right, so every motion cue trails to the left. */
export const VEHICLE_HEADING = "right" as const;

type Point = { x: number; y: number };
type Wheel = { id: "rear" | "front"; cx: number; cy: number; r: number };

/**
 * Tyre centres and radii.
 *
 * Derived from the alpha silhouette: for each wheel, two clean horizontal chords
 * below the fender arch (y=730 and y=750) determine the centre and radius
 * exactly. Chords nearer the ground are not used — the contact patch is slightly
 * flattened, and fitting through it biases the centre upward and the radius out.
 *
 * The radii here are a few pixels under the measured tyre so the circular clip in
 * `.te-wheel` (94% of this radius) stays comfortably inside the rubber.
 */
const WHEELS: readonly Wheel[] = [
  { id: "rear", cx: 351, cy: 604, r: 150 },
  { id: "front", cx: 1463, cy: 616, r: 158 },
] as const;

/**
 * Centre of the headlight's projector cluster, and of the tail lamp.
 *
 * The headlight is the centroid of the dark lens housing pulled slightly toward
 * the projector elements — that is where a real lamp is brightest, rather than
 * the geometric middle of the whole slanted lens. The tail lamp is the centroid
 * of its red pixels.
 */
const HEADLIGHT: Point = { x: 1690, y: 430 };
const TAILLIGHT: Point = { x: 111, y: 357 };
/** Front-most opaque pixel — where a projected beam leaves the bodywork. */
const NOSE: Point = { x: 1867, y: 470 };

/**
 * Rake of the headlight lens, in CSS degrees (positive = clockwise).
 *
 * The lens runs from roughly (1568, 390) at its inner end to (1785, 462) at the
 * outer, so it *descends* toward the nose — about 18°. The hot core is a short
 * blob over the projector rather than a bar spanning the whole lens, so it is
 * raked a little under the full lens angle; matching 18° exactly makes the glow
 * read as a tilted stripe stuck on the wing.
 */
export const HEADLIGHT_RAKE_DEG = 12;

const { width: W, height: H } = heroVehicle;

/** Trims float noise: `10.712400000000001%` is nobody's friend. */
const pct = (value: number) => `${Math.round(value * 1e4) / 1e4}%`;

export type WheelLayout = {
  id: Wheel["id"];
  /** Circular clip box, positioned against the vehicle wrapper. */
  frame: { left: string; top: string; width: string };
  /**
   * The same photograph again, blown up and offset so that this wheel — and
   * only this wheel — fills the circular clip. Rotating the wrapper then spins
   * the wheel in place without touching or distorting the car itself.
   */
  image: { width: string; left: string; top: string };
  /**
   * Where this tyre meets the ground. Its own value, not `frame.top` plus
   * `frame.width`: those two percentages look addable but resolve against
   * different axes, so that sum lands in the wrong place on any container whose
   * aspect ratio drifts from the photograph's.
   */
  contact: { left: string; top: string; width: string };
};

function wheelLayout(wheel: Wheel): WheelLayout {
  const diameter = wheel.r * 2;
  const left = pct(((wheel.cx - wheel.r) / W) * 100);
  const width = pct((diameter / W) * 100);

  return {
    id: wheel.id,
    frame: {
      left,
      top: pct(((wheel.cy - wheel.r) / H) * 100),
      width,
    },
    // Percentages resolve against the clip box, which is a square (aspect-ratio
    // 1), so one scale factor is correct on both axes.
    image: {
      width: pct((W / diameter) * 100),
      left: pct((-(wheel.cx - wheel.r) / diameter) * 100),
      top: pct((-(wheel.cy - wheel.r) / diameter) * 100),
    },
    contact: {
      left,
      top: pct(((wheel.cy + wheel.r) / H) * 100),
      width,
    },
  };
}

export const vehicleAnatomy = {
  wheels: WHEELS.map(wheelLayout),
  headlight: { left: pct((HEADLIGHT.x / W) * 100), top: pct((HEADLIGHT.y / H) * 100) },
  taillight: { left: pct((TAILLIGHT.x / W) * 100), top: pct((TAILLIGHT.y / H) * 100) },
  nose: { left: pct((NOSE.x / W) * 100), top: pct((NOSE.y / H) * 100) },
} as const;

/**
 * How loud the treatment is on a given surface.
 *
 * `strong` is the landing hero and nothing else. Everywhere money, forms or
 * lists are read, the vehicle is `ambient` or `subtle` — present as brand
 * texture, never as something competing with a balance.
 */
export type VehicleIntensity = "ambient" | "subtle" | "medium" | "strong";

/** Default layer opacity per intensity. Overridable per surface. */
export const INTENSITY_OPACITY: Record<VehicleIntensity, number> = {
  ambient: 0.1,
  subtle: 0.17,
  medium: 0.26,
  strong: 1,
};
