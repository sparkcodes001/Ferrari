// One model, many paints. Edit colors and copy here; the numbers come from data/specs.js
// so every paint shows the same (true) figures for the same car.
// theme = [highlight, mid, shadow] stops of the background gradient.
// paint = body color (null = the GLB's original paint, i.e. the yellow).
import { SPEC } from "./specs";

export const CAR_MODEL = "/models/ferrari.glb";

const specs = () => [
  { val: SPEC.engine, lines: [SPEC.displacement, `${SPEC.hp} CV`] },
  { val: "0 – 100", lines: [`${SPEC.zeroTo100.toFixed(1)} SEC`] },
];

export const CARS = [
  { id: "yellow", paint: null, theme: ["#f7d64e", "#efca38", "#dcb022"], tagline: "Sculpted for speed" },
  { id: "green", paint: "#1b8a55", theme: ["#7fc79a", "#4ea574", "#2f7d52"], tagline: "Born on the track" },
  { id: "red", paint: "#d1121b", theme: ["#ee6a5e", "#d23a30", "#a11f1b"], tagline: "Power, refined" },
  { id: "silver", paint: "#b9bcc2", theme: ["#d9d6d0", "#bdb9b1", "#8f8b83"], tagline: "Pure emotion" },
].map((c) => ({ ...c, topSpeed: SPEC.top, specs: specs() }));
