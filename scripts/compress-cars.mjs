// Usage (from the project root):
//   1. npm i -D sharp
//   2. put your originals in  assets-src/cars/  named car1.jpg … car10.jpg
//   3. node scripts/compress-cars.mjs
// Writes public/media/cars/carN.webp (1800px wide) and carN-s.webp (640px preview).
// Keep assets-src OUTSIDE public so the 40 MB originals are never deployed.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "assets-src/cars";
const OUT = "public/media/cars";
fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /^car\d+\.(jpe?g|png|webp)$/i.test(f));
if (!files.length) {
  console.error(`No car*.jpg found in ${SRC}`);
  process.exit(1);
}

let before = 0;
let after = 0;
for (const f of files) {
  const n = f.match(/\d+/)[0];
  const input = path.join(SRC, f);
  before += fs.statSync(input).size;
  const big = path.join(OUT, `car${n}.webp`);
  const small = path.join(OUT, `car${n}-s.webp`);
  await sharp(input).rotate().resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 76 }).toFile(big);
  await sharp(input).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 70 }).toFile(small);
  after += fs.statSync(big).size + fs.statSync(small).size;
  console.log(`car${n}: done`);
}
console.log(`\n${(before / 1e6).toFixed(1)} MB  ->  ${(after / 1e6).toFixed(1)} MB`);
