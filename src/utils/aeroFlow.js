// Analytic "flow around a body" used by the Aero section. No simulation: every streamline is a
// closed-form curve, so a particle's whole trail is computed straight from its head position.
const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth01 = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

// info = { center:{x,y,z}, half:{x,y,z}, groundY } of the car (car length runs along z, nose at -z)
export function makeFlow(info) {
  const { center: c, half: h, groundY } = info;
  const a = h.z;
  return {
    cx: c.x, cy: c.y, cz: c.z,
    a, // half length
    b: h.y * 1.15, // half height of the "body ellipsoid"
    w: h.x * 1.1, // half width
    L: 2 * h.z,
    groundY,
    k: 1.2, // how far the flow is pushed out at mid-body
    zStart: c.z - a * 2.4,
    zEnd: c.z + a * 2.8,
  };
}

// a seed streamline: lateral offset from the car axis, never starting inside the body
export function seedStream(F, rnd) {
  for (let i = 0; i < 12; i++) {
    const lx = (rnd() * 2 - 1) * F.w * 2.6;
    const yAbs = F.groundY + 0.03 + Math.pow(rnd(), 1.4) * (F.cy + F.b * 3.4 - F.groundY);
    const ly = yAbs - F.cy;
    const rho0 = Math.hypot(lx / F.w, ly / F.b);
    if (rho0 >= 0.22) return { lx, ly, rho0, ph: rnd() * 6.283 };
  }
  return { lx: F.w * 1.5, ly: F.b * 1.5, rho0: 2.1, ph: rnd() * 6.283 };
}

// position of seed `s` when its z is `zz`. Writes x,y into out; returns "heat" 0..1
// (how hard the streamline has been pushed aside = how close to the body it runs).
export function flowPoint(F, s, zz, t, out) {
  const u = (zz - F.cz) / F.a;
  const bump = u * u < 1 ? F.k * (1 - u * u) : 0;
  const f = Math.sqrt(s.rho0 * s.rho0 + bump) / s.rho0;
  const wake = smooth01((u - 0.35) / 1.4); // turbulence only behind the car
  const wob = wake * 0.09 * F.w * Math.sin((zz - F.cz) * 2.6 + t * 5 + s.ph);
  out[0] = F.cx + s.lx * f + wob;
  out[1] = Math.max(F.groundY + 0.03, F.cy + s.ly * f + wob * 0.6 * Math.cos((zz - F.cz) * 2.1 + t * 4 + s.ph));
  return clamp01((f - 1) * 1.1);
}
