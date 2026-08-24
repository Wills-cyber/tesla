/**
 * Generates every brand raster from `public/brand/tesla-electronics-logo.png`.
 *
 *   node scripts/generate-icons.mjs
 *
 * ---------------------------------------------------------------------------
 * Why the source needs processing at all
 * ---------------------------------------------------------------------------
 * The supplied logo is chrome artwork on a black plate — it is a light-on-dark
 * asset, and dropping it straight into an ivory-themed header would paste a black
 * rectangle into the page. So two derivatives are cut from it:
 *
 *   · A transparent cutout, taking alpha straight from luminance. That is the
 *     correct un-multiply for artwork drawn white-on-black: the chrome's mid-tones
 *     become partial opacity, which composites over any *dark* surface exactly as
 *     the original does over its own black.
 *   · A dark plate carrying that cutout, for use on light surfaces. A logo badge,
 *     which is what the artwork already is.
 *
 * A near-black floor is subtracted first, otherwise the source's background
 * vignette survives as a faint grey haze across the whole rectangle.
 *
 * Outputs:
 *   public/brand/logo-lockup.png       transparent full lockup (mark + wordmark)
 *   public/brand/logo-mark.png         transparent mark only, for small sizes
 *   public/brand/logo-mark-plate.png   mark on a dark plate, for light surfaces
 *   public/brand/og-cover.png          1200x630 link-preview card
 *   public/brand/og-mark.png           512x512  square social fallback
 *   src/app/apple-icon.png             180x180  (Next auto-links as apple-touch-icon)
 *   src/app/favicon.ico                 32x32   (PNG-in-ICO container)
 *   public/icons/icon-192.png          192x192  (PWA manifest)
 *   public/icons/icon-512.png          512x512  (PWA manifest)
 *   public/icons/icon-maskable-512.png 512x512  (PWA maskable, extra safe padding)
 *
 * `sharp` ships with Next.js, so this needs no extra dependency. Re-run it
 * whenever the logo changes; nothing at runtime depends on this script.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "public", "brand", "tesla-electronics-logo.png");

/**
 * Region of the source holding just the ring-and-monogram, no type.
 *
 * Measured from a row-luminance profile of the source: the monogram's tip fades
 * out by y≈700 and the wordmark's caps start at y≈704, so the boundary is
 * unambiguous. The generator trims whatever it finds inside this box, so the
 * numbers only have to be generous, not exact.
 */
const MARK_REGION = { left: 290, top: 8, width: 960, height: 682 };

/** Below this luminance the source is background, not artwork. */
const BLACK_FLOOR = 16;

/**
 * Turns white-on-black artwork into a white transparent cutout.
 *
 * Alpha is the per-pixel maximum channel rather than a weighted luminance: the
 * artwork is neutral silver, and `max` keeps the specular highlights at full
 * opacity where a Rec.601 luma would pull them down.
 */
async function cutout(region) {
  let pipeline = sharp(source).removeAlpha();
  if (region) pipeline = pipeline.extract(region);

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  const span = 255 - BLACK_FLOOR;
  for (let p = 0; p < width * height; p++) {
    const i = p * channels;
    const peak = Math.max(data[i], data[i + 1], data[i + 2]);
    const alpha = peak <= BLACK_FLOOR ? 0 : Math.round(((peak - BLACK_FLOOR) / span) * 255);
    const o = p * 4;
    out[o] = 255;
    out[o + 1] = 255;
    out[o + 2] = 255;
    out[o + 3] = alpha;
  }

  // `trim` drops the fully transparent margin so consumers can size by the
  // artwork itself rather than by whatever padding the source happened to have.
  return sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer()
    .then((buf) => sharp(buf).trim({ threshold: 1 }).png().toBuffer());
}

/**
 * The dark badge used on light surfaces.
 *
 * `inset` is the share of the plate left as breathing room. Maskable icons need a
 * much larger one: Android may crop up to 20% off every edge, and a mark that
 * survives that crop is a mark that was drawn small enough to begin with.
 */
async function plate(markPng, size, { inset = 0.24, radius = 0.235 } = {}) {
  const artSize = Math.round(size * (1 - inset * 2));
  const art = await sharp(markPng)
    .resize(artSize, artSize, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const artMeta = await sharp(art).metadata();

  const r = Math.round(size * radius);
  const backdrop = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <defs>
         <linearGradient id="plate" x1="0" y1="0" x2="${size}" y2="${size}">
           <stop offset="0%" stop-color="#2b3038"/>
           <stop offset="55%" stop-color="#14161b"/>
           <stop offset="100%" stop-color="#08090b"/>
         </linearGradient>
       </defs>
       <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#plate)"/>
     </svg>`
  );

  return sharp(backdrop)
    .composite([
      {
        input: art,
        left: Math.round((size - artMeta.width) / 2),
        top: Math.round((size - artMeta.height) / 2),
      },
    ])
    .png()
    .toBuffer();
}

/** Wraps a 32x32 PNG in a single-image ICO container. */
function pngToIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0); // width  (32)
  entry.writeUInt8(32, 1); // height (32)
  entry.writeUInt8(0, 2); // palette colours (0 = truecolour)
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image byte length
  entry.writeUInt32LE(22, 12); // offset of image data

  return Buffer.concat([header, entry, png]);
}

async function write(relative, buffer) {
  const target = join(root, relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  console.log(`  ${relative.padEnd(38)} ${(buffer.length / 1024).toFixed(1)} KB`);
}

console.log("Generating brand assets from public/brand/tesla-electronics-logo.png");

const lockup = await cutout(null);
const mark = await cutout(MARK_REGION);

await write("public/brand/logo-lockup.png", await sharp(lockup).resize({ width: 1200 }).png({ compressionLevel: 9 }).toBuffer());
await write("public/brand/logo-mark.png", await sharp(mark).resize({ width: 512 }).png({ compressionLevel: 9 }).toBuffer());
await write("public/brand/logo-mark-plate.png", await plate(mark, 512, { inset: 0.18 }));

/* ---------------------------------------------------------------- Icons
   `src/app/icon.png` replaces the hand-drawn `icon.svg` that used to live here.
   Browsers prefer an SVG icon when one is offered, so leaving that file in place
   would have kept serving the old mark no matter what these PNGs contain. */
await write("src/app/icon.png", await plate(mark, 512, { inset: 0.16 }));
await write("src/app/apple-icon.png", await plate(mark, 180, { inset: 0.2 }));
await write("src/app/favicon.ico", pngToIco(await plate(mark, 32, { inset: 0.14, radius: 0.2 })));
await write("public/icons/icon-192.png", await plate(mark, 192, { inset: 0.2 }));
await write("public/icons/icon-512.png", await plate(mark, 512, { inset: 0.2 }));
await write("public/icons/icon-maskable-512.png", await plate(mark, 512, { inset: 0.3, radius: 0.5 }));
await write("public/brand/og-mark.png", await plate(mark, 512, { inset: 0.16 }));

/* -------------------------------------------------------- Link previews
   The source is already a dark presentation card, so the preview keeps it: the
   full lockup, contained on the plate's own near-black with generous margin, at
   the 1.91:1 that Open Graph and Twitter both crop to. */
await write(
  "public/brand/og-cover.png",
  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: "#07080a" },
  })
    .composite([
      {
        input: await sharp(lockup).resize({ width: 760, fit: "inside" }).png().toBuffer(),
        gravity: "centre",
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer()
);

console.log("Done.");
