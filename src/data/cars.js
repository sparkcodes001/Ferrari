// One model, many paints. Edit colors, copy and specs here.
// theme = [highlight, mid, shadow] stops of the background gradient.
// paint = body color (null = the GLB's original paint, i.e. the yellow).
// The spec numbers are PLACEHOLDERS: replace with real ones.
export const CAR_MODEL = "/models/ferrari.glb";

export const CARS = [
  {
    id: "yellow",
    paint: null,
    theme: ["#f7d64e", "#efca38", "#dcb022"],
    tagline: "Sculpted for speed",
    specs: [
      { val: "V12", lines: ["6.5 L", "830 CV"] },
      { val: "0 – 100", lines: ["2.9 SEC"] },
    ],
  },
  {
    id: "green",
    paint: "#1b8a55",
    theme: ["#7fc79a", "#4ea574", "#2f7d52"],
    tagline: "Born on the track",
    specs: [
      { val: "V12", lines: ["6.5 L", "800 CV"] },
      { val: "0 – 100", lines: ["3.0 SEC"] },
    ],
  },
  {
    id: "red",
    paint: "#d1121b",
    theme: ["#ee6a5e", "#d23a30", "#a11f1b"],
    tagline: "Power, refined",
    specs: [
      { val: "V8", lines: ["3.9 L", "720 CV"] },
      { val: "0 – 100", lines: ["2.9 SEC"] },
    ],
  },
  {
    id: "silver",
    paint: "#b9bcc2",
    theme: ["#d9d6d0", "#bdb9b1", "#8f8b83"],
    tagline: "Pure emotion",
    specs: [
      { val: "V12", lines: ["6.3 L", "780 CV"] },
      { val: "0 – 100", lines: ["2.9 SEC"] },
    ],
  },
];
