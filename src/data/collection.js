// The Collection list. Edit names / meta freely.
// Images: run  node scripts/compress-cars.mjs  to build these from your originals.
//   public/media/cars/car1.webp   (large, shown full screen)
//   public/media/cars/car1-s.webp (small, the cursor-follow preview)
const CARS = [
  ["Ferrari 12Cilindri", "2024 · V12"],
  ["Ferrari 488 Pista", "2018 · V8"],
  ["Ferrari Twin-Turbo", "2023 · V6 Hybrid"],
  ["Ferrari 250 GTO", "1960 · V12"],
  ["Ferrari 296 GTB", "2022 · V12"],
  ["Ferrari Daytona SP3", "2022 · V12"],
  ["Ferrari Purosangue", "2023 · V12"],
  ["Ferrari 296 Challenge", "2024 · V6"],
  ["Ferrari 12Cilindri", "2024 · V12"],
  ["Ferrari Daytona SP3", "2023 · V12"],
];

export const COLLECTION = CARS.map(([name, meta], i) => ({
  no: String(i + 1).padStart(2, "0"),
  name,
  meta,
  full: `/media/cars/car${i + 1}.webp`,
  thumb: `/media/cars/car${i + 1}-s.webp`,
}));
