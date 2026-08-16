/**
 * Download missing artist portraits via Deezer public search API
 * (returns picture_xl). Falls back to Wikipedia when Deezer has no hit.
 *
 * Usage: node scripts/download-missing-artist-images.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ARTISTS_MISSING_IMAGES } from "../src/data/artistsMissingImages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/Artists");
const UA = "BeatifyArtistImageBot/1.0 (local; beatify)";

const SKIP = new Set(["Om Shanti Om"]);

const SEARCH_ALIASES = {
  "SANAM (Band)": "SANAM",
  "Taz (Stereo Nation)": "Stereo Nation",
  "Javed-Bashir": "Javed Bashir",
  "Sachin Jigar": "Sachin-Jigar",
  "R.D. Burman": "RD Burman",
  "Auliʻi Cravalho": "Auli'i Cravalho",
  "Nikhil D’Souza": "Nikhil D'Souza",
  King: "King Indian singer",
  Mukesh: "Mukesh singer",
};

const toImageKey = (name) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['ʻ’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function deezerArtistImage(name) {
  const q = SEARCH_ALIASES[name] || name;
  const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=5`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`deezer HTTP ${res.status}`);
  const data = await res.json();
  const artists = data?.data || [];
  if (!artists.length) return null;

  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const target = norm(name.replace(/\(.*?\)/g, "").trim());
  const hit =
    artists.find((a) => norm(a.name) === target) ||
    artists.find((a) => norm(a.name).includes(target) || target.includes(norm(a.name))) ||
    artists[0];

  const img =
    hit.picture_xl || hit.picture_big || hit.picture_medium || hit.picture;
  // Deezer placeholder when no photo
  if (!img || img.includes("/artist//") || img.includes("artist-default")) {
    return null;
  }
  return { url: img, matched: hit.name };
}

async function downloadToFile(imageUrl, destPath) {
  const res = await fetch(imageUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1500) throw new Error("image too small");
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ok = [];
  const fail = [];

  for (const name of ARTISTS_MISSING_IMAGES) {
    if (SKIP.has(name)) {
      fail.push({ name, reason: "skipped" });
      continue;
    }

    const key = toImageKey(name);
    if (!key) {
      fail.push({ name, reason: "bad key" });
      continue;
    }

    const existing = ["jpg", "jpeg", "png", "webp"]
      .map((ext) => path.join(OUT_DIR, `${key}.${ext}`))
      .find((p) => fs.existsSync(p));

    // Re-download if previous run saved a wrong wiki image for Aaron Smith etc.
    // Keep file if size looks like a real portrait (>= 8KB) unless forced.
    if (existing) {
      const size = fs.statSync(existing).size;
      if (size >= 8000) {
        ok.push({
          name,
          key,
          file: path.basename(existing),
          source: "existing",
        });
        console.log(`EXISTS  ${name}`);
        continue;
      }
    }

    try {
      const found = await deezerArtistImage(name);
      if (!found) {
        fail.push({ name, reason: "no deezer image" });
        console.log(`FAIL    ${name}`);
        continue;
      }

      const dest = path.join(OUT_DIR, `${key}.jpg`);
      await downloadToFile(found.url, dest);
      ok.push({
        name,
        key,
        file: `${key}.jpg`,
        matched: found.matched,
        source: "deezer",
      });
      console.log(`OK      ${name} <- ${found.matched}`);
    } catch (e) {
      fail.push({ name, reason: e.message || String(e) });
      console.log(`FAIL    ${name} (${e.message || e})`);
    }

    await sleep(120);
  }

  const reportPath = path.join(__dirname, "artist-image-download-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      { ok, fail, downloadedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`\nDone. OK=${ok.length} FAIL=${fail.length}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
