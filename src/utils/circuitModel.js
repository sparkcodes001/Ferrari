// Builds a lap from a closed set of control points, with no DOM and no simulation library:
//  1. a smooth closed curve (Catmull-Rom) sampled densely
//  2. curvature along it
//  3. a speed profile: corner-limited, with an acceleration and a braking limit (forward and
//     backward passes, run twice around so the loop closes)
//  4. time, lateral g, throttle / brake, and the corners
const G = 9.81;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

export function buildCircuit(cfg) {
  const P = cfg.points;
  const n = P.length;

  // 1. dense closed curve, then re-sampled evenly by arc length
  const dense = [];
  const per = 40;
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], d = P[(i + 2) % n];
    for (let k = 0; k < per; k++) dense.push(catmull(a, b, c, d, k / per));
  }
  dense.push(dense[0]);
  const dl = [0];
  for (let i = 1; i < dense.length; i++)
    dl.push(dl[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = dl[dl.length - 1];
  const M = cfg.samples;
  const x = new Float64Array(M), y = new Float64Array(M), s = new Float64Array(M);
  let j = 0;
  for (let i = 0; i < M; i++) {
    const target = (i / M) * total;
    while (dl[j + 1] < target) j++;
    const f = (target - dl[j]) / (dl[j + 1] - dl[j] || 1);
    x[i] = dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f;
    y[i] = dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f;
    s[i] = target;
  }
  const ds = total / M; // px per sample
  const mPerPx = cfg.lengthM / total;
  const dsM = ds * mPerPx;

  // heading (unwrapped) and curvature, smoothed over a short window
  const head = new Float64Array(M);
  for (let i = 0; i < M; i++) {
    const a = (i + 1) % M, b = (i - 1 + M) % M;
    head[i] = Math.atan2(y[a] - y[b], x[a] - x[b]);
  }
  const w = Math.max(3, Math.round(M * 0.012));
  const kappaS = new Float64Array(M); // signed, 1/m
  // heading difference over the window, wrapped to (-π, π]
  for (let i = 0; i < M; i++) {
    const a = (i + w) % M, b = (i - w + M) % M;
    let d = head[a] - head[b];
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    kappaS[i] = d / (2 * w * dsM);
  }
  const kappa = kappaS.map(Math.abs);

  // 3. speed profile (m/s)
  const vMax = cfg.maxKmh / 3.6;
  const aLat = cfg.lateralG * G;
  const v = new Float64Array(M);
  for (let i = 0; i < M; i++) v[i] = Math.min(vMax, Math.sqrt(aLat / Math.max(kappa[i], 1e-5)));
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 0; k < M; k++) {
      const i = k, nx = (k + 1) % M;
      v[nx] = Math.min(v[nx], Math.sqrt(v[i] * v[i] + 2 * cfg.accel * dsM));
    }
    for (let k = M - 1; k >= 0; k--) {
      const i = (k + 1) % M, pv = k;
      v[pv] = Math.min(v[pv], Math.sqrt(v[i] * v[i] + 2 * cfg.brake * dsM));
    }
  }

  // 4. time, g, throttle/brake
  const t = new Float64Array(M + 1);
  for (let i = 0; i < M; i++) t[i + 1] = t[i] + (2 * dsM) / (v[i] + v[(i + 1) % M]);
  const lapTime = t[M];
  const latG = new Float64Array(M), acc = new Float64Array(M);
  for (let i = 0; i < M; i++) {
    latG[i] = (v[i] * v[i] * kappa[i]) / G;
    const nx = (i + 1) % M;
    acc[i] = (v[nx] * v[nx] - v[i] * v[i]) / (2 * dsM);
  }

  // corners: strongest curvature peaks, spaced out, numbered in lap order
  const minSep = Math.round(M * 0.05);
  const cand = [];
  for (let i = 0; i < M; i++) {
    let peak = true;
    for (let d = -minSep; d <= minSep && peak; d++) if (kappa[(i + d + M) % M] > kappa[i]) peak = false;
    if (peak && kappa[i] > 1 / 260) cand.push(i);
  }
  cand.sort((a, b) => kappa[b] - kappa[a]);
  const corners = cand
    .slice(0, 8)
    .sort((a, b) => a - b)
    .map((i, k) => ({
      no: k + 1,
      idx: i,
      f: i / M,
      x: x[i],
      y: y[i],
      kmh: v[i] * 3.6,
      g: latG[i],
      kind: kappa[i] > 1 / 75 ? "Hairpin" : kappa[i] > 1 / 130 ? "Tight bend" : "Fast bend",
    }));

  // centroid (to push labels to the outside of the track)
  let cx = 0, cy = 0;
  for (let i = 0; i < M; i++) { cx += x[i]; cy += y[i]; }
  cx /= M; cy /= M;

  // SVG path (closed polyline through the samples)
  let d = `M${x[0].toFixed(1)} ${y[0].toFixed(1)}`;
  for (let i = 1; i < M; i += 1) d += `L${x[i].toFixed(1)} ${y[i].toFixed(1)}`;
  d += "Z";

  // speed trace polyline (km/h vs distance) in a 600x100 box
  const TW = 600, TH = 100;
  let trace = "";
  for (let i = 0; i <= M; i += 4) {
    const vi = v[i % M] * 3.6;
    trace += `${i ? "L" : "M"}${((i / M) * TW).toFixed(1)} ${(TH - 6 - (vi / cfg.maxKmh) * (TH - 14)).toFixed(1)}`;
  }

  // sample the lap at distance fraction f (0..1)
  const at = (f) => {
    const q = clamp(f, 0, 0.99999) * M;
    const i = Math.floor(q), fr = q - i, n2 = (i + 1) % M;
    const lerp = (a, b) => a + (b - a) * fr;
    let dh = head[n2] - head[i];
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    const kmh = lerp(v[i], v[n2]) * 3.6;
    return {
      x: lerp(x[i], x[n2]),
      y: lerp(y[i], y[n2]),
      heading: head[i] + dh * fr,
      kmh,
      g: lerp(latG[i], latG[n2]),
      gear: clamp(Math.ceil((kmh / cfg.maxKmh) * cfg.gears * 1.12), 1, cfg.gears),
      throttle: clamp(acc[i] / cfg.accel, 0, 1),
      brake: clamp(-acc[i] / cfg.brake, 0, 1),
      time: t[i] + (t[i + 1] - t[i]) * fr,
      dist: f * total,
    };
  };

  return { x, y, M, total, lapTime, corners, centroid: [cx, cy], d, trace, traceSize: [TW, TH], at };
}

export function fmtLap(sec) {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}
