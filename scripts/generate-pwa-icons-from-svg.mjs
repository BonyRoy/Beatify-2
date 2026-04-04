/**
 * Rasterizes public/vite.svg into PWA / iOS icon PNGs (does not modify the SVG).
 * Run: node scripts/generate-pwa-icons-from-svg.mjs
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const svgPath = join(publicDir, "vite.svg");
const svg = readFileSync(svgPath);

/** Opaque tile behind the art (matches app theme-color) */
const BG = { r: 26, g: 26, b: 26, alpha: 1 };

async function writePng(size, filename) {
  await sharp(svg)
    .resize(size, size, {
      fit: "cover",
      position: "centre",
      background: BG,
    })
    .flatten({ background: BG })
    .png()
    .toFile(join(publicDir, filename));
  console.log(`Wrote public/${filename} (${size}×${size})`);
}

await writePng(180, "apple-touch-icon.png");
await writePng(192, "pwa-192x192.png");
await writePng(512, "pwa-512x512.png");
console.log("Done (source: vite.svg, unchanged).");
