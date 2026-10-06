import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import useScrollProgress from "../../hooks/useScrollProgress";
import ErrorBoundary, { SceneFallback } from "../ui/ErrorBoundary";
import AeroScene from "../canvas/AeroScene";
import { hasWebGL } from "../../utils/webgl";
import { IS_COARSE } from "../../utils/device";
import { SPEC_LABEL } from "../../data/specs";
import { AERO_STAGES, stageIndex, windKmh } from "../../data/aero";
import "./aero.css";

const N = AERO_STAGES.length;
const pad2 = (n) => String(n).padStart(2, "0");

export default function Aero() {
  const sec = useRef(null);
  const progressRef = useRef(0);
  const zoneRef = useRef(null);
  const hotRefs = useRef([]);
  const copyEl = useRef(null);
  const noEl = useRef(null);
  const titleEl = useRef(null);
  const textEl = useRef(null);
  const speedEl = useRef(null);
  const rail = useRef(null);
  const dots = useRef([]);
  const lastIdx = useRef(-1);

  const [gl] = useState(() => hasWebGL());

  // The canvas only exists while the section is near the screen, so this section never costs
  // a WebGL context while you are on the hero, the engineering view or the footer.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const el = sec.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setMounted(e.isIntersecting), {
      rootMargin: "50% 0px 50% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useScrollProgress(sec, (p) => {
    progressRef.current = p;

    const idx = stageIndex(p);
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      const s = AERO_STAGES[idx];
      zoneRef.current = s.zone;
      if (noEl.current) noEl.current.textContent = `${pad2(idx + 1)} / ${pad2(N)}`;
      if (titleEl.current) titleEl.current.textContent = s.title;
      if (textEl.current) textEl.current.textContent = s.copy;
      const c = copyEl.current;
      if (c) {
        c.classList.remove("is-in");
        void c.offsetWidth; // restart the CSS entrance
        c.classList.add("is-in");
      }
      dots.current.forEach((d, i) => d && d.classList.toggle("is-active", i === idx));
    }
    if (speedEl.current) speedEl.current.textContent = String(windKmh(p)).padStart(3, "0");
    if (rail.current) rail.current.style.transform = `scaleX(${p.toFixed(4)})`;
  });

  return (
    <section className="aero" id="aero" ref={sec} data-nav="light" aria-label="Aerodynamics">
      <div className="aero-stage">
        <div className="aero-canvas">
          {gl ? (
            mounted && (
              <ErrorBoundary
                fallback={
                  <SceneFallback dark title="Airflow view unavailable" note="The wind-tunnel scene could not start on this device." />
                }
              >
                <Canvas
                  camera={{ fov: 30, near: 0.1, far: 200, position: [8, 4, -8] }}
                  dpr={IS_COARSE ? [1, 1.25] : [1, 1.5]}
                  resize={{ scroll: false }}
                  gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                  onCreated={({ gl: r }) => {
                    r.setClearColor(0x000000, 0);
                    r.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
                  }}
                >
                  <AeroScene progressRef={progressRef} zoneRef={zoneRef} hotRefs={hotRefs} />
                </Canvas>
              </ErrorBoundary>
            )
          ) : (
            <SceneFallback dark title="Airflow view unavailable" note="This browser can't run the 3D scene." />
          )}
        </div>

        <div className="aero-vignette" />

        {AERO_STAGES.map(
          (s, i) =>
            s.label && (
              <div className="aero-hs" key={s.title} ref={(el) => (hotRefs.current[i] = el)} aria-hidden="true">
                <i className="aero-hs-dot" />
                <span className="aero-hs-line" />
                <p className="aero-hs-text">
                  <b>{s.label.title}</b>
                  <small>{s.label.sub}</small>
                </p>
              </div>
            ),
        )}

        <div className="aero-top">
          <span className="aero-label">( 04 ) — Aerodynamics</span>
          <span className="aero-label">{SPEC_LABEL}</span>
        </div>

        <div className="aero-copy is-in" ref={copyEl} aria-live="polite">
          <p className="aero-no" ref={noEl}>
            {`01 / ${pad2(N)}`}
          </p>
          <h2 className="aero-title" ref={titleEl}>
            {AERO_STAGES[0].title}
          </h2>
          <p className="aero-text" ref={textEl}>
            {AERO_STAGES[0].copy}
          </p>
        </div>

        <div className="aero-side">
          <div className="aero-speed">
            <span ref={speedEl}>000</span>
            <small>km/h airflow</small>
          </div>
          <div className="aero-legend" aria-hidden="true">
            <i />
            <span>Free stream</span>
            <span>Pressure</span>
          </div>
          <p className="aero-note">Illustrative flow, not CFD data</p>
        </div>

        <div className="aero-foot">
          <div className="aero-dots" aria-hidden="true">
            {AERO_STAGES.map((s, i) => (
              <span key={s.title} ref={(el) => (dots.current[i] = el)} className={i === 0 ? "is-active" : ""} />
            ))}
          </div>
          <div className="aero-rail" aria-hidden="true">
            <i ref={rail} />
          </div>
        </div>
      </div>
    </section>
  );
}
