// Generates the investment-plan image placeholders.
//
// The five files under `public/images/investments/` are referenced by
// `src/config/investment-plans.ts` and must exist at those exact paths so that
// dropping in real vehicle photography needs no code change. Until then this
// writes a valid, optimiser-safe 1600x900 WebP per plan: a soft charcoal-to-gold
// wash in the product palette, deliberately empty of any vehicle imagery.
//
// They are real WebP files rather than empty ones on purpose — `next/image` runs
// every local asset through the optimiser, and a zero-byte source is a 500 in the
// network panel, not a graceful placeholder.
//
// Run with:  npm run generate:plan-images
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUTPUT_DIR = path.resolve(import.meta.dirname, "../public/images/investments");

const WIDTH = 1600;
const HEIGHT = 900;

/**
 * One entry per plan. `file` must match the `imageUrl` in
 * `src/config/investment-plans.ts` exactly.
 */
const placeholders = [
  { file: "model-3-starter.webp", tint: "#c9a227" },
  { file: "model-y-growth.webp", tint: "#c2a03a" },
  { file: "model-s-premium.webp", tint: "#bfa14a" },
  { file: "model-x-elite.webp", tint: "#b89a3f" },
  { file: "cybertruck-executive.webp", tint: "#b49a52" },
];

/** A neutral wash. No lettering, so it reads as an empty frame, not as content. */
function backdrop(tint) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f7f5f1" />
          <stop offset="55%" stop-color="#efece6" />
          <stop offset="100%" stop-color="#e6e2da" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="62%" r="52%">
          <stop offset="0%" stop-color="${tint}" stop-opacity="0.26" />
          <stop offset="100%" stop-color="${tint}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#base)" />
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)" />
      <ellipse cx="${WIDTH / 2}" cy="${HEIGHT * 0.78}" rx="${WIDTH * 0.3}" ry="26"
               fill="${tint}" opacity="0.12" />
    </svg>
  `);
}

await mkdir(OUTPUT_DIR, { recursive: true });

for (const { file, tint } of placeholders) {
  const webp = await sharp(backdrop(tint)).webp({ quality: 82 }).toBuffer();
  await writeFile(path.join(OUTPUT_DIR, file), webp);
  console.log(`wrote ${file}  ${(webp.length / 1024).toFixed(1)} KiB`);
}

console.log(
  `\n${placeholders.length} placeholders in public/images/investments/.\n` +
    "Replace each file in place — the paths are already wired up."
);
