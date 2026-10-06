// Aerodynamics section copy + choreography. Everything here is editable.
// range  = scroll progress window of the stage (0..1 across the section)
// zone   = part of the car's length (0 = nose, 1 = tail) whose airflow lights up
// anchor = where the on-screen label sits, as a fraction of the car's bounding box [x, y, z]
//          (x: left→right, y: floor→roof, z: nose→tail)
// NOTE: the airflow is an illustrative visualisation, not CFD data. No performance figures are
// claimed here on purpose; add real ones only from Ferrari's published material.
import { SPEC } from "./specs";

export const AERO_STAGES = [
  {
    range: [0, 0.14],
    title: "Air, made visible",
    copy: "At speed, a car spends most of its power pushing air out of the way. Every surface is shaped to decide where that air goes.",
    zone: null,
  },
  {
    range: [0.14, 0.36],
    title: "The nose",
    copy: "The front splits the flow: some over the body, some under it, some around the wheels. Where it splits sets how the whole car behaves.",
    zone: [0, 0.24],
    anchor: [0.5, 0.3, 0.02],
    label: { title: "Front splitter", sub: "Where the air divides" },
  },
  {
    range: [0.36, 0.58],
    title: "The canopy",
    copy: "Over the roof the air should stay attached for as long as possible. A smooth path to the tail keeps drag low and the rear calm.",
    zone: [0.24, 0.66],
    anchor: [0.5, 0.98, 0.45],
    label: { title: "Roofline", sub: "Attached flow" },
  },
  {
    range: [0.58, 0.8],
    title: "The floor",
    copy: "The underside is the quiet hero. Air sped up beneath the car lowers the pressure there and pulls the car toward the road.",
    zone: [0.12, 0.88],
    anchor: [0.5, 0.04, 0.5],
    label: { title: "Underbody", sub: "Low-pressure floor" },
  },
  {
    range: [0.8, 1.01],
    title: "The wake",
    copy: "What a car leaves behind matters as much as what it meets. A clean exit keeps drag down and keeps the tail planted.",
    zone: [0.76, 1],
    anchor: [0.5, 0.42, 0.98],
    label: { title: "Diffuser & tail", sub: "Clean exit" },
  },
];

export const stageIndex = (p) => {
  for (let i = AERO_STAGES.length - 1; i >= 0; i--) if (p >= AERO_STAGES[i].range[0]) return i;
  return 0;
};

// wind speed 0..1 over the scroll (the readout shows it as a fraction of top speed)
const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const windAt = (p) => 0.3 + 0.7 * sm(0, 0.3, p);
export const windKmh = (p) => Math.round(SPEC.top * windAt(p));

// camera keyframes: az 0 = looking at the nose, π/2 = from the side, π = from behind
export const AERO_CAMERA = [
  { p: 0.0, az: 0.8, el: 0.28, d: 1.15 },
  { p: 0.25, az: 0.3, el: 0.16, d: 0.85 },
  { p: 0.47, az: 1.45, el: 0.42, d: 0.95 },
  { p: 0.69, az: 1.57, el: 0.03, d: 0.9 },
  { p: 0.9, az: 2.7, el: 0.22, d: 1.0 },
  { p: 1.0, az: 2.9, el: 0.25, d: 1.05 },
];
