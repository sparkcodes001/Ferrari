import { useMemo, useRef } from "react";
import useScrollProgress from "../../hooks/useScrollProgress";
import { blip } from "../../utils/engineSound";
import {
  SPEC,
  SPEC_LABEL,
  SHEET,
  angleFor,
  dialGeometry,
  powerAt,
  torqueAt,
  curvePath,
  curveY,
  CURVE_W,
  CURVE_H,
} from "../../data/specs";
import "./specs.css";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export default function Specs() {
  const sec = useRef(null);
  const stage = useRef(null);
  const needle = useRef(null);
  const gearEl = useRef(null);
  const rpmEl = useRef(null);
  const speedEl = useRef(null);
  const hpEl = useRef(null);
  const nmEl = useRef(null);
  const timeEl = useRef(null);
  const dot = useRef(null);
  const guide = useRef(null);
  const live = useRef(null);
  const sheet = useRef(null);
  const rows = useRef([]);
  const rail = useRef(null);
  const lastGear = useRef("");

  const dial = useMemo(() => dialGeometry(0.9), []);
  const path = useMemo(() => curvePath(), []);

  useScrollProgress(sec, (p) => {
    // drive phase: 0 → top speed over the first 80% of the scroll
    const sp = clamp01(p / 0.8);
    const kmh = sp * SPEC.top;
    const g = sp * SPEC.gears;
    const idle = sp < 0.01;
    const gear = idle ? "N" : String(Math.min(SPEC.gears, Math.floor(g) + 1));
    const frac = g - Math.floor(Math.min(g, SPEC.gears - 0.0001));
    const r = idle ? 0.08 : 0.3 + 0.7 * Math.pow(frac, 0.85);

    if (needle.current)
      needle.current.style.transform = `rotate(${angleFor(r).toFixed(2)}deg)`;
    if (speedEl.current)
      speedEl.current.textContent = String(Math.round(kmh)).padStart(3, "0");
    if (rpmEl.current)
      rpmEl.current.textContent = (Math.round((r * 10000) / 10) * 10).toLocaleString("en-US");
    if (hpEl.current) hpEl.current.textContent = String(Math.round(SPEC.hp * powerAt(r)));
    if (nmEl.current) nmEl.current.textContent = String(Math.round(SPEC.nm * torqueAt(r)));
    if (timeEl.current)
      timeEl.current.textContent = (kmh < 100 ? (kmh / 100) * SPEC.zeroTo100 : SPEC.zeroTo100).toFixed(1);

    if (dot.current) {
      dot.current.setAttribute("cx", (r * CURVE_W).toFixed(1));
      dot.current.setAttribute("cy", curveY(r).toFixed(1));
    }
    if (guide.current) {
      const x = (r * CURVE_W).toFixed(1);
      guide.current.setAttribute("x1", x);
      guide.current.setAttribute("x2", x);
    }

    if (gear !== lastGear.current) {
      if (lastGear.current) blip(170, 0.1, 0.07);
      lastGear.current = gear;
      const el = gearEl.current;
      if (el) {
        el.textContent = gear;
        el.classList.remove("is-bump");
        void el.offsetWidth; // restart the animation
        el.classList.add("is-bump");
      }
    }
    stage.current?.classList.toggle("is-red", r > 0.9 && !idle);

    // finish: live readouts give way to the spec sheet
    const s = smooth(0.84, 0.94, p);
    if (live.current) live.current.style.opacity = (1 - s).toFixed(3);
    if (sheet.current) {
      sheet.current.style.opacity = s.toFixed(3);
      sheet.current.style.pointerEvents = s > 0.5 ? "auto" : "none";
    }
    rows.current.forEach((el, i) => {
      if (!el) return;
      const o = clamp01(s * 1.5 - i * 0.12);
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${((1 - o) * 18).toFixed(1)}px)`;
    });
    if (rail.current) rail.current.style.transform = `scaleX(${p.toFixed(4)})`;
  });

  return (
    <section className="specs" id="specs" ref={sec} data-nav="light">
      <div className="specs-stage" ref={stage}>
        <div className="specs-top">
          <span className="specs-label">( 05 ) — The Numbers</span>
          <span className="specs-label">
            {SPEC_LABEL}
          </span>
        </div>

        <div className="specs-grid">
          <div className="specs-dialwrap">
            <svg className="specs-dial" viewBox="0 0 400 400" aria-hidden="true">
              <path className="sd-track" d={dial.track} />
              <path className="sd-red" d={dial.red} />
              {dial.ticks.map((t, i) => (
                <line
                  key={i}
                  className={`sd-tick${t.major ? " is-major" : ""}${t.red ? " is-red" : ""}`}
                  x1={t.x1}
                  y1={t.y1}
                  x2={t.x2}
                  y2={t.y2}
                />
              ))}
              {dial.labels.map((l) => (
                <text
                  key={l.t}
                  className={`sd-label${l.red ? " is-red" : ""}`}
                  x={l.x}
                  y={l.y}
                >
                  {l.t}
                </text>
              ))}
              <text className="sd-unit" x="200" y="262">x1000 rpm</text>
              <g className="sd-needle" ref={needle}>
                <line x1="200" y1="214" x2="200" y2="52" />
                <circle cx="200" cy="200" r="9" />
              </g>
            </svg>
            <div className="specs-gear">
              <span className="specs-tag">Gear</span>
              <b ref={gearEl}>N</b>
              <span className="specs-tag">
                <span ref={rpmEl}>0</span> rpm
              </span>
            </div>
          </div>

          <div className="specs-side">
            <div className="specs-stack">
              <div className="specs-live" ref={live}>
                <div className="specs-speed">
                  <span ref={speedEl}>000</span>
                  <small>km/h</small>
                </div>
                <div className="specs-cards">
                  <div>
                    <b ref={hpEl}>0</b>
                    <span className="specs-tag">CV · Power</span>
                  </div>
                  <div>
                    <b ref={nmEl}>0</b>
                    <span className="specs-tag">Nm · Torque</span>
                  </div>
                  <div>
                    <b ref={timeEl}>0.0</b>
                    <span className="specs-tag">s · 0–100</span>
                  </div>
                </div>
                <svg
                  className="specs-curve"
                  viewBox={`0 0 ${CURVE_W} ${CURVE_H}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path className="sc-line" d={path} />
                  <line className="sc-guide" ref={guide} x1="0" y1="0" x2="0" y2={CURVE_H} />
                  <circle className="sc-dot" ref={dot} cx="0" cy={CURVE_H} r="5" />
                </svg>
                <span className="specs-tag">Power curve</span>
              </div>

              <ul className="specs-sheet" ref={sheet}>
                {SHEET.map(([k, v], i) => (
                  <li key={k} ref={(el) => (rows.current[i] = el)}>
                    <span>{k}</span>
                    <b>{v}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="specs-rail">
          <i ref={rail} />
        </div>
      </div>
    </section>
  );
}
