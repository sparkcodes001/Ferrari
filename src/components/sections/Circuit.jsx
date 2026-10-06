import { useEffect, useMemo, useRef } from "react";
import useScrollProgress from "../../hooks/useScrollProgress";
import { CIRCUIT } from "../../data/circuit";
import { SPEC_LABEL } from "../../data/specs";
import { buildCircuit, fmtLap } from "../../utils/circuitModel";
import "./circuit.css";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const pad3 = (n) => String(Math.round(n)).padStart(3, "0");

export default function Circuit() {
  // the whole lap is computed once, from the shape of the line
  const model = useMemo(() => buildCircuit(CIRCUIT), []);
  const { view } = CIRCUIT;
  const [TW, TH] = model.traceSize;

  const sec = useRef(null);
  const stage = useRef(null);
  const svg = useRef(null);
  const run = useRef(null);
  const runGlow = useRef(null);
  const car = useRef(null);
  const cornerEls = useRef([]);
  const miniRun = useRef(null);
  const miniDot = useRef(null);
  const speedEl = useRef(null);
  const gearEl = useRef(null);
  const gEl = useRef(null);
  const lapEl = useRef(null);
  const thr = useRef(null);
  const brk = useRef(null);
  const cursor = useRef(null);
  const rail = useRef(null);
  const intro = useRef(null);
  const call = useRef(null);
  const callNo = useRef(null);
  const callKind = useRef(null);
  const callStats = useRef(null);
  const lastCorner = useRef(-2);
  const lastGear = useRef(0);
  const size = useRef({ w: 1280, h: 720 });

  // stage size, for the camera's aspect ratio
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      size.current = { w: e.contentRect.width || 1280, h: e.contentRect.height || 720 };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // where each corner label sits: pushed to the outside of the track
  const labels = useMemo(
    () =>
      model.corners.map((c) => {
        const dx = c.x - model.centroid[0];
        const dy = c.y - model.centroid[1];
        const l = Math.hypot(dx, dy) || 1;
        return { ...c, ox: dx / l, oy: dy / l };
      }),
    [model],
  );

  useScrollProgress(sec, (p) => {
    const f = clamp01((p - 0.05) / 0.9);
    const st = model.at(f);
    const { w: W, h: H } = size.current;
    const aspect = W / H;

    // camera: starts and ends zoomed out on the whole circuit, follows the car in between
    const follow = smooth(0.0, 0.1, p) * (1 - smooth(0.93, 1, p));
    const overW = Math.max(view.w * 1.12, view.h * 1.12 * aspect);
    const zoom = (aspect < 0.9 ? 2.1 : 2.5) - 0.8 * (st.kmh / CIRCUIT.maxKmh);
    const viewW = lerp(overW, view.w / zoom, follow);
    const viewH = viewW / aspect;
    const cx = lerp(view.w / 2, st.x, follow);
    const cy = lerp(view.h / 2, st.y, follow);
    const upp = viewW / W; // world units per screen pixel
    svg.current?.setAttribute("viewBox", `${(cx - viewW / 2).toFixed(1)} ${(cy - viewH / 2).toFixed(1)} ${viewW.toFixed(1)} ${viewH.toFixed(1)}`);

    // lap progress drawn on the road
    const dash = `${(f * model.total).toFixed(1)} ${model.total.toFixed(1)}`;
    if (run.current) run.current.style.strokeDasharray = dash;
    if (runGlow.current) runGlow.current.style.strokeDasharray = dash;
    if (miniRun.current) miniRun.current.style.strokeDasharray = dash;

    // the car keeps a constant size on screen
    car.current?.setAttribute(
      "transform",
      `translate(${st.x.toFixed(1)} ${st.y.toFixed(1)}) rotate(${((st.heading * 180) / Math.PI + 90).toFixed(1)}) scale(${upp.toFixed(4)})`,
    );
    if (miniDot.current) {
      miniDot.current.setAttribute("cx", st.x.toFixed(1));
      miniDot.current.setAttribute("cy", st.y.toFixed(1));
    }
    labels.forEach((c, i) => {
      const el = cornerEls.current[i];
      if (!el) return;
      const off = 30 * upp;
      el.setAttribute(
        "transform",
        `translate(${(c.x + c.ox * off).toFixed(1)} ${(c.y + c.oy * off).toFixed(1)}) scale(${upp.toFixed(4)})`,
      );
    });

    // telemetry
    if (speedEl.current) speedEl.current.textContent = pad3(st.kmh);
    if (gEl.current) gEl.current.textContent = st.g.toFixed(1);
    if (lapEl.current) lapEl.current.textContent = fmtLap(st.time);
    if (thr.current) thr.current.style.transform = `scaleY(${Math.max(0.03, st.throttle).toFixed(3)})`;
    if (brk.current) brk.current.style.transform = `scaleY(${Math.max(0.03, st.brake).toFixed(3)})`;
    if (gearEl.current && lastGear.current !== st.gear) {
      lastGear.current = st.gear;
      gearEl.current.textContent = String(st.gear);
    }
    cursor.current?.setAttribute("x1", (f * TW).toFixed(1));
    cursor.current?.setAttribute("x2", (f * TW).toFixed(1));
    if (rail.current) rail.current.style.transform = `scaleX(${p.toFixed(4)})`;
    if (intro.current) {
      intro.current.style.opacity = (1 - smooth(0.02, 0.1, p)).toFixed(3);
      intro.current.style.transform = `translateY(${(-smooth(0, 0.12, p) * 5).toFixed(2)}vh)`;
    }

    // corner call-out (or the lap result at the end)
    let near = -1;
    labels.forEach((c, i) => {
      const on = f >= c.f - 0.05 && f <= c.f + 0.012;
      if (on) near = i;
      cornerEls.current[i]?.classList.toggle("is-near", on);
    });
    const done = f > 0.985;
    const key = done ? 99 : near;
    if (key !== lastCorner.current) {
      lastCorner.current = key;
      const c = call.current;
      if (done) {
        if (callNo.current) callNo.current.textContent = "Lap complete";
        if (callKind.current) callKind.current.textContent = fmtLap(model.lapTime);
        if (callStats.current) callStats.current.textContent = "Computed from the drawn line";
      } else if (near >= 0) {
        const k = labels[near];
        if (callNo.current) callNo.current.textContent = `Turn ${k.no}`;
        if (callKind.current) callKind.current.textContent = k.kind;
        if (callStats.current)
          callStats.current.textContent = `Apex ${Math.round(k.kmh)} km/h · ${k.g.toFixed(1)} g lateral`;
      }
      c?.classList.toggle("is-on", done || near >= 0);
    }
  });

  return (
    <section className="circ" id="circuit" ref={sec} data-nav="light" aria-label="The circuit">
      <div className="circ-stage" ref={stage}>
        <svg
          className="circ-map"
          ref={svg}
          viewBox={`0 0 ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <pattern id="circ-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M50 0H0V50" fill="none" stroke="rgba(239,234,224,0.055)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="-2500" y="-2500" width="6000" height="6000" fill="url(#circ-grid)" />
          <path className="circ-kerb" d={model.d} />
          <path className="circ-road" d={model.d} />
          <path className="circ-centre" d={model.d} />
          <path className="circ-run-glow" ref={runGlow} d={model.d} strokeDasharray={`0 ${model.total.toFixed(1)}`} />
          <path className="circ-run" ref={run} d={model.d} strokeDasharray={`0 ${model.total.toFixed(1)}`} />
          <StartLine model={model} />
          {labels.map((c, i) => (
            <g key={c.no} className="circ-corner" ref={(el) => (cornerEls.current[i] = el)}>
              <circle r="12" />
              <text y="3.5">{`T${c.no}`}</text>
            </g>
          ))}
          <g ref={car} className="circ-car">
            <circle r="17" className="circ-car-glow" />
            <path d="M0 -12 L9 10 L0 5.5 L-9 10 Z" />
          </g>
        </svg>

        <div className="circ-shade" />

        <div className="circ-top">
          <span className="circ-label">( 07 ) — The Circuit</span>
          <span className="circ-label">{SPEC_LABEL}</span>
        </div>

        <div className="circ-intro" ref={intro}>
          <h2 className="circ-headline">
            <span>Every corner</span>
            <span>is a decision.</span>
          </h2>
        </div>

        <div className="circ-callout" ref={call} aria-live="polite">
          <p ref={callNo}>Turn 1</p>
          <h3 ref={callKind}>Tight bend</h3>
          <small ref={callStats}> </small>
        </div>

        <div className="circ-tele">
          <div className="circ-speed">
            <span ref={speedEl}>000</span>
            <small>km/h</small>
          </div>
          <div className="circ-mini-row">
            <div>
              <b ref={gearEl}>1</b>
              <span className="circ-tag">Gear</span>
            </div>
            <div>
              <b ref={gEl}>0.0</b>
              <span className="circ-tag">g lateral</span>
            </div>
          </div>
        </div>

        <div className="circ-right">
          <svg className="circ-minimap" viewBox={`0 0 ${view.w} ${view.h}`} aria-hidden="true">
            <path className="cm-road" d={model.d} />
            <path className="cm-run" ref={miniRun} d={model.d} strokeDasharray={`0 ${model.total.toFixed(1)}`} />
            <circle className="cm-dot" ref={miniDot} r="16" cx="0" cy="0" />
          </svg>
          <div className="circ-lap">
            <span ref={lapEl}>0:00.000</span>
            <span className="circ-tag">Lap time · illustrative</span>
          </div>
          <div className="circ-pedals" aria-hidden="true">
            <div><i ref={thr} /><span className="circ-tag">Thr</span></div>
            <div className="is-brake"><i ref={brk} /><span className="circ-tag">Brk</span></div>
          </div>
        </div>

        <svg className="circ-trace" viewBox={`0 0 ${TW} ${TH}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={model.trace} />
          <line ref={cursor} x1="0" y1="0" x2="0" y2={TH} />
        </svg>

        <div className="circ-rail" aria-hidden="true">
          <i ref={rail} />
        </div>
      </div>
    </section>
  );
}

// a short white bar across the road at the first sample, perpendicular to the direction of travel
function StartLine({ model }) {
  const a = model.at(0);
  const nx = -Math.sin(a.heading);
  const ny = Math.cos(a.heading);
  const L = 19;
  return (
    <line
      className="circ-start"
      x1={(a.x - nx * L).toFixed(1)}
      y1={(a.y - ny * L).toFixed(1)}
      x2={(a.x + nx * L).toFixed(1)}
      y2={(a.y + ny * L).toFixed(1)}
    />
  );
}
