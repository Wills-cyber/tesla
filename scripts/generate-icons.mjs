/**
 * Generates the raster brand assets from `public/brand/tesla-electronics-mark.svg`.
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs:
 *   src/app/apple-icon.png            180x180  (Next auto-links as apple-touch-icon)
 *   src/app/favicon.ico                32x32   (PNG-in-ICO container)
 *   public/icons/icon-192.png         192x192  (PWA manifest)
 *   public/icons/icon-512.png         512x512  (PWA manifest)
 *   public/icons/icon-maskable-512.png 512x512 (PWA maskable, extra safe padding)
 *   public/brand/og-mark.png          512x512  (social/OG fallback)
 *
 * `sharp` ships with Next.js, so this needs no extra dependency. Re-run it
 * whenever the mark changes; nothing at runtime depends on this script.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "public", "brand", "tesla-electronics-mark.svg");

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
  entry.writeUInt32LE(header.length + entry.length, 12); // image offset

  return Buffer.concat([header, entry, png]);
}

async function render(size, { padding = 0, background } = {}) {
  const inner = size - padding * 2;
  const mark = await sharp(source, { density: 600 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  if (padding === 0 && !background) return mark;

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 250, g: 249, b: 246, alpha: 1 },
    },
  })
    .composite([{ input: mark, top: padding, left: padding }])
    .png()
    .toBuffer();
}

await mkdir(join(root, "public", "icons"), { recursive: true });

const targets = [
  { file: join(root, "src", "app", "apple-icon.png"), size: 180 },
  { file: join(root, "public", "icons", "icon-192.png"), size: 192 },
  { file: join(root, "public", "icons", "icon-512.png"), size: 512 },
  { file: join(root, "public", "brand", "og-mark.png"), size: 512 },
  // Maskable icons get cropped to a circle by some launchers: 12% safe padding.
  {
    file: join(root, "public", "icons", "icon-maskable-512.png"),
    size: 512,
    padding: 62,
  },
];

for (const { file, size, padding = 0 } of targets) {
  await writeFile(file, await render(size, { padding }));
  console.log(`wrote ${file.replace(root, ".")} (${size}x${size})`);
}

const favicon = await render(32);
await writeFile(join(root, "src", "app", "favicon.ico"), pngToIco(favicon));
console.log("wrote ./src/app/favicon.ico (32x32)");
