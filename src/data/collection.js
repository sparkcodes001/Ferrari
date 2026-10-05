// The Collection list. Edit names / meta freely.
// Order = image order: row 1 uses car1.webp, row 2 car2.webp ... keep names in step with your photos.
// TODO (needs your eyes): rows 3, 9 and 10 repeat or don't name a real model. Look at car3 / car9 / car10
// and put the true model + year in. Rows 1 and 9 are both the 12Cilindri, rows 6 and 10 both the Daytona SP3.
// Images: run  node scripts/compress-cars.mjs  to build these from your originals.
//   public/media/cars/car1.webp   (large, shown full screen)
//   public/media/cars/car1-s.webp (small, the cursor-follow preview)
const CARS = [
  ["Ferrari 12Cilindri", "2024 · V12"],
  ["Ferrari 488 Pista", "2018 · V8"],
  ["Ferrari Twin-Turbo", "V6 Hybrid"],
  ["Ferrari 250 GTO", "1962 · V12"],
  ["Ferrari 296 GTB", "2022 · V6 Hybrid"],
  ["Ferrari Daytona SP3", "2021 · V12"],
  ["Ferrari Purosangue", "2022 · V12"],
  ["Ferrari 296 Challenge", "2023 · V6"],
  ["Ferrari 12Cilindri", "2024 · V12"],
  ["Ferrari Daytona SP3", "2021 · V12"],
];

export const COLLECTION = CARS.map(([name, meta], i) => ({
  no: String(i + 1).padStart(2, "0"),
  name,
  meta,
  full: `/media/cars/car${i + 1}.webp`,
  thumb: `/media/cars/car${i + 1}-s.webp`,
}));
