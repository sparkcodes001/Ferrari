// SINGLE SOURCE OF TRUTH for the car's numbers.
// Hero, Engineering labels, Specs dial and the spec sheet all read from here,
// so editing this one object updates the whole site.
// Figures are Ferrari's published 12Cilindri numbers (6.5 L V12, 830 CV, 678 Nm,
// 0-100 in 2.9 s, 340+ km/h, 9,500 rpm limit, 8-speed DCT).
// If the 3D model is a different car, change ONLY this block.
export const SPEC = {
  engine: "V12",
  displacement: "6.5 L",
  hp: 830,
  nm: 678,
  zeroTo100: 2.9,
  top: 340,
  redline: 9500,
  gears: 8,
};
export const SPEC_LABEL = `${SPEC.engine} · ${SPEC.displacement} · ${SPEC.hp} CV`;

export const SHEET = [
  ["Engine", SPEC.engine],
  ["Displacement", SPEC.displacement],
  ["Max power", `${SPEC.hp} CV`],
  ["Max torque", `${SPEC.nm} Nm`],
  ["0 – 100 km/h", `${SPEC.zeroTo100} s`],
  ["Top speed", `${SPEC.top} km/h`],
  ["Redline", `${SPEC.redline.toLocaleString("en-US")} rpm`],
];

const CX = 200;
const CY = 200;
const pt = (deg, r) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};
// needle angle for rpm fraction r (0..1): 270° sweep, gap at the bottom
export const angleFor = (r) => -135 + r * 270;

export function dialGeometry(redFrom = 0.9) {
  const ticks = [];
  const labels = [];
  for (let i = 0; i <= 50; i++) {
    const r = i / 50;
    const major = i % 5 === 0;
    const a = angleFor(r);
    const [x1, y1] = pt(a, major ? 148 : 156);
    const [x2, y2] = pt(a, 166);
    const red = r >= redFrom - 1e-9;
    ticks.push({ x1, y1, x2, y2, major, red });
    if (major) {
      const [x, y] = pt(a, 124);
      labels.push({ x, y, t: String(i / 5), red });
    }
  }
  const f = (n) => n.toFixed(2);
  const [ax, ay] = pt(angleFor(0), 172);
  const [bx, by] = pt(angleFor(1), 172);
  const [rx, ry] = pt(angleFor(redFrom), 172);
  return {
    ticks,
    labels,
    track: `M${f(ax)} ${f(ay)} A172 172 0 1 1 ${f(bx)} ${f(by)}`,
    red: `M${f(rx)} ${f(ry)} A172 172 0 0 1 ${f(bx)} ${f(by)}`,
  };
}

// plausible dyno-style curves, 0..1 in and out
const shape = (r) => Math.pow(r, 0.85) * (1.1 - 0.16 * Math.pow(r, 3));
let max = 0;
for (let i = 0; i <= 100; i++) max = Math.max(max, shape(i / 100));
export const powerAt = (r) => shape(r) / max;
export const torqueAt = (r) => 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, Math.max(0, r)) * 0.85);

export const CURVE_W = 600;
export const CURVE_H = 160;
export const curveY = (r) => CURVE_H - 10 - powerAt(r) * (CURVE_H - 24);
export function curvePath() {
  let d = "";
  for (let i = 0; i <= 50; i++) {
    const r = i / 50;
    d += `${i ? "L" : "M"}${(r * CURVE_W).toFixed(1)} ${curveY(r).toFixed(1)} `;
  }
  return d.trim();
}
