// ─────────────────────────────────────────────────────────────────────────────
// Advanced Ferrari Preloader
// ─────────────────────────────────────────────────────────────────────────────
// Visual features
//  • Circular SVG rev-counter (270° arc) that sweeps as assets load
//  • Ambient red glow orb behind the horse that grows with progress
//  • Horizontal scan line that periodically sweeps across the logo
//  • Scrolling vehicle-data stream panel (desktop)
//  • Staggered header / footer reveals via GSAP
//  • Cinematic outro: glow burst → curtain lift → scene reveal
// Entry gate
//  • Slide-up button row after 100%
//  • "Enter with sound" — red pill with shimmer sweep on hover
//  • Auto-enter countdown with 10-second failsafe
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import useStore from "../../store/useStore";
import usePreloaderGate from "../../hooks/usePreloaderGate";
import FerrariLogo from "../ui/FerrariLogo";
import { strokeUnits, pad3 } from "../../utils/logoDraw";
import { applySound, startEngine, setRev, flyBy } from "../../utils/engineSound";
import { primeBed } from "../../utils/bed";
import { SPEC } from "../../data/specs";

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_TIME   = 2.4;   // seconds to animate 0 → 90 %
const GATE_AUTO  = 10;    // seconds before auto-silent-enter

const STATUS_STEPS = [
  [0,   "CHASSIS INITIALISING"],
  [18,  "LOADING POWERTRAIN"],
  [36,  "CALIBRATING AERO SURFACES"],
  [55,  "COMPILING GPU SHADERS"],
  [74,  "WARMING TYRES"],
  [90,  "IGNITION SEQUENCE"],
  [100, "PRIMED  ·  READY"],
];

const DATA_LINES = [
  { val: SPEC.engine,                  lbl: "ENGINE CONFIG"  },
  { val: SPEC.displacement,            lbl: "DISPLACEMENT"   },
  { val: SPEC.hp + " CV",              lbl: "POWER OUTPUT"   },
  { val: SPEC.nm + " Nm",              lbl: "MAX TORQUE"     },
  { val: SPEC.redline + " RPM",        lbl: "REDLINE"        },
  { val: SPEC.zeroTo100 + " s",        lbl: "0 – 100 KM/H"  },
  { val: SPEC.top + " KM/H",           lbl: "V MAX"          },
  { val: SPEC.gears + "-SPEED DCT",    lbl: "TRANSMISSION"   },
  { val: "Carbon",                     lbl: "BODY PANELS"    },
  { val: "E-DIFF 3.0",                 lbl: "DIFFERENTIAL"  },
  { val: "Brembo CCM",                 lbl: "BRAKE SYSTEM"  },
  { val: "P ZERO",                     lbl: "TYRE SPEC"     },
];

// ── SVG Rev-Counter geometry ──────────────────────────────────────────────────
// We use a <circle> + stroke-dasharray trick so the arc animates smoothly
// via a single CSS/GSAP property (strokeDashoffset).
const RC_R         = 118;               // circle radius  (viewBox units)
const RC_CX        = 130;
const RC_CY        = 130;
const RC_VIEWBOX   = 260;
const CIRCUMF      = 2 * Math.PI * RC_R;  // ≈ 741.4
const ARC_DEG      = 270;               // visible span
const ARC_LEN      = CIRCUMF * (ARC_DEG / 360); // ≈ 556
const GAP_LEN      = CIRCUMF - ARC_LEN;         // ≈ 185
// Rotate so the arc runs from 7 o'clock → 5 o'clock (clockwise)
// SVG 0° = 3 o'clock; 7 o'clock = 120°  →  rotate by 120°
const ARC_ROTATE   = 120;

// Tick marks along the arc
const NUM_TICKS   = 52;
const RED_TICKS   = 10;
const R_TICK_IN   = 104;
const R_TICK_OUT  = 118;
const ARC_START_DEG = ARC_ROTATE;        // 7 o'clock
const ARC_SPAN_DEG  = ARC_DEG;           // 270°

function degToXY(cx, cy, r, angleDeg) {
  // SVG angle: 0° = 3 o'clock, increases clockwise
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

// ── Component ─────────────────────────────────────────────────────────────────
function Preloader() {
  const root      = useRef(null);
  const primaryBtn = useRef(null);
  const outroTl   = useRef(null);
  const markReady = useRef(() => {});
  const chosenRef = useRef(false);
  const soundRef  = useRef(false);

  const setIsLoading = useStore((s) => s.setIsLoading);
  const setRevealed  = useStore((s) => s.setRevealed);
  const setSoundOn   = useStore((s) => s.setSoundOn);

  const [gate,   setGate]   = useState(false);
  const [chosen, setChosen] = useState(false);
  const [left,   setLeft]   = useState(GATE_AUTO);
  const ready = usePreloaderGate();

  // ── GSAP master context ─────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Logo layers ──────────────────────────────────────────────────────────
      const base = root.current.querySelector("[data-base]");
      const lit  = root.current.querySelector("[data-lit]");

      // base layer: very faint ghost outline
      gsap.utils.toArray(".ferrari-main, .ferrari-detail", base).forEach((p) =>
        gsap.set(p, {
          fill: "rgba(255,255,255,0.025)",
          stroke: "rgba(255,255,255,0.18)",
          strokeWidth: strokeUnits(p, 0.9),
        })
      );
      gsap.set(gsap.utils.toArray(".ferrari-highlight", base), { opacity: 0 });

      // lit layer: solid red, revealed by clip-path from the bottom
      gsap.set(gsap.utils.toArray(".ferrari-main", lit),      { fill: "#e10600", stroke: "none" });
      gsap.utils.toArray(".ferrari-detail", lit).forEach((p) =>
        gsap.set(p, { fill: "none", stroke: "#ff6a5a", strokeWidth: strokeUnits(p, 0.9) })
      );
      gsap.set(gsap.utils.toArray(".ferrari-highlight", lit), { fill: "#fff", opacity: 1 });

      // ── References to animated nodes ─────────────────────────────────────────
      const count      = root.current.querySelector("[data-count]");
      const status     = root.current.querySelector("[data-status]");
      const arcCircle  = root.current.querySelector("[data-arc-circle]");
      const glowEl     = root.current.querySelector("[data-glow]");
      const ticks      = gsap.utils.toArray("[data-tick]", root.current);
      const scanEl     = root.current.querySelector("[data-scan]");
      const progressEl = root.current.querySelector("[data-progress-fill]");

      // Initialise arc: dasharray shows 270° band, dashoffset hides it fully
      if (arcCircle) {
        arcCircle.style.strokeDasharray  = `${ARC_LEN} ${GAP_LEN}`;
        arcCircle.style.strokeDashoffset = String(ARC_LEN);
      }

      // ── Scan-line loop ────────────────────────────────────────────────────────
      if (scanEl) {
        gsap.set(scanEl, { yPercent: -120, opacity: 0 });
        gsap.timeline({ repeat: -1, repeatDelay: 3.0 })
          .to(scanEl, { opacity: 0.7,  duration: 0.2,  ease: "power1.in" })
          .to(scanEl, { yPercent: 230, duration: 1.5,  ease: "none" }, "<")
          .to(scanEl, { opacity: 0,   duration: 0.2,  ease: "power1.out" }, "-=0.2");
      }

      // ── State object ─────────────────────────────────────────────────────────
      const state = { v: 0 };
      let prevLabel = STATUS_STEPS[0][1];

      const render = () => {
        const val = Math.round(state.v);

        // Percentage counter
        count.textContent = pad3(state.v);

        // Horse fill (bottom-up clip)
        lit.style.clipPath = `inset(${100 - state.v}% 0% 0% 0%)`;

        // Progress bar (bottom strip)
        if (progressEl) progressEl.style.width = `${state.v}%`;

        // Ambient glow
        if (glowEl) {
          const scale = 0.4 + (state.v / 100) * 0.9;
          const alpha = 0.15 + (state.v / 100) * 0.5;
          glowEl.style.transform  = `translate(-50%, -50%) scale(${scale})`;
          glowEl.style.opacity    = String(alpha);
        }

        // Arc fill (stroke-dashoffset decreases as progress grows)
        if (arcCircle) {
          arcCircle.style.strokeDashoffset = String(ARC_LEN * (1 - state.v / 100));
        }

        // Tick marks
        const nLit = Math.round((state.v / 100) * ticks.length);
        ticks.forEach((t, i) => {
          t.style.opacity = i < nLit ? "1" : "0.1";
        });

        // Status text cross-fade
        let label = STATUS_STEPS[0][1];
        for (const [at, txt] of STATUS_STEPS) if (val >= at) label = txt;
        if (label !== prevLabel) {
          prevLabel = label;
          gsap.timeline()
            .to(status, { opacity: 0, y: -6, duration: 0.2, ease: "power1.in" })
            .call(() => { status.textContent = label; })
            .to(status, { opacity: 1, y: 0,  duration: 0.3, ease: "power2.out" });
        }
      };
      render();

      // ── Outro timeline ────────────────────────────────────────────────────────
      outroTl.current = gsap.timeline({
        paused: true,
        onComplete: () => setIsLoading(false),
      })
        // 1. Glow flares
        .to(glowEl, {
          scale: 2.4,
          opacity: 0.85,
          duration: 0.35,
          ease: "power3.in",
        })
        // 2. UI elements dissolve
        .to("[data-ui]", { opacity: 0, duration: 0.3, stagger: 0.04 }, "<0.15")
        // 3. Logo breathes in
        .to("[data-logo]", { scale: 1.08, duration: 1.1, ease: "expo.inOut" }, "<")
        // 4. Signal hero + optional fly-by sound
        .call(() => {
          setRevealed(true);
          if (soundRef.current) flyBy();
        }, null, "<0.1")
        // 5. Curtain wipes up
        .to(root.current, {
          clipPath: "inset(100% 0% 0% 0%)",
          duration: 0.9,
          ease: "expo.inOut",
        }, "<0.05");

      // ── Loading progress ──────────────────────────────────────────────────────
      let minDone = false, readyFlag = false, started = false;

      const finish = gsap.timeline({
        paused: true,
        onComplete: () => setGate(true),
      }).to(state, { v: 100, duration: 0.55, ease: "power2.out", onUpdate: render });

      const tryFinish = () => {
        if (minDone && readyFlag && !started) {
          started = true;
          finish.play();
        }
      };

      gsap.to(state, {
        v: 90,
        duration: MIN_TIME,
        ease: "power2.inOut",
        onUpdate: render,
        onComplete: () => { minDone = true; tryFinish(); },
      });

      markReady.current = () => { readyFlag = true; tryFinish(); };
    }, root);

    return () => ctx.revert();
  }, [setIsLoading, setRevealed]);

  useEffect(() => { if (ready) markReady.current(); }, [ready]);

  // ── User choice ─────────────────────────────────────────────────────────────
  const choose = useCallback((withSound) => {
    if (chosenRef.current) return;
    chosenRef.current = true;
    soundRef.current  = withSound;
    setChosen(true);
    applySound(withSound);
    setSoundOn(withSound);
    if (withSound) { primeBed(); startEngine(); }
    const r = { v: 0 };
    gsap.to(r, {
      v: 1,
      duration: withSound ? 1.1 : 0.08,
      ease: "power2.in",
      onUpdate: () => withSound && setRev(r.v, true),
      onComplete: () => outroTl.current?.play(),
    });
  }, [setSoundOn]);

  // ── Auto-enter countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!gate || chosen) return;
    setLeft(GATE_AUTO);
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [gate, chosen]);

  useEffect(() => {
    if (gate && !chosen && left <= 0) choose(false);
  }, [left, gate, chosen, choose]);

  const open = gate && !chosen;
  useEffect(() => {
    if (open) primaryBtn.current?.focus({ preventScroll: true });
  }, [open]);

  // ── Pre-compute tick positions (stable across renders) ────────────────────────
  const tickData = Array.from({ length: NUM_TICKS }, (_, i) => {
    const frac    = i / (NUM_TICKS - 1);
    const angleDeg = ARC_START_DEG + frac * ARC_SPAN_DEG;
    const isRed   = i >= NUM_TICKS - RED_TICKS;
    const rIn     = R_TICK_IN  - (isRed ? 0 : 2);
    const [x1, y1] = degToXY(RC_CX, RC_CY, rIn,        angleDeg);
    const [x2, y2] = degToXY(RC_CX, RC_CY, R_TICK_OUT, angleDeg);
    return { x1, y1, x2, y2, isRed };
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      ref={root}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#080706] text-white"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
    >
      {/* ── Radial vignette ─────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        data-ui
        className="relative z-20 flex items-center justify-between px-6 pt-[max(1.4rem,env(safe-area-inset-top))] font-mono text-[9px] tracking-[0.38em] text-white/30 md:px-10 md:pt-8"
      >
        <span>SCUDERIA FERRARI</span>
        <span className="hidden md:block text-white/15">FERRARI · 12CILINDRI</span>
        <span>MARANELLO · 1947</span>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">

        {/* ─ Ambient glow ─────────────────────────────────────────────────── */}
        <div
          data-glow
          className="pointer-events-none absolute"
          style={{
            width: "65%",
            paddingBottom: "65%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(220,40,0,0.5) 0%, rgba(200,10,0,0.22) 42%, transparent 68%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%) scale(0.4)",
            opacity: 0.15,
            filter: "blur(22px)",
          }}
        />

        {/* ─ Percentage counter (left) ────────────────────────────────────── */}
        <div
          data-ui
          className="absolute left-6 bottom-[18%] md:left-10 md:bottom-auto md:top-1/2 md:-translate-y-[40%]"
        >
          <div
            className="flex items-start leading-none"
            style={{ fontFamily: "Syncopate, sans-serif", fontWeight: 700 }}
          >
            <span
              data-count
              style={{
                fontSize: "clamp(52px,14vw,148px)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              000
            </span>
            <span
              className="text-[#e10600]"
              style={{ fontSize: "clamp(14px,3vw,34px)", marginTop: "0.28em" }}
            >
              %
            </span>
          </div>

          {/* Status line */}
          <p
            data-status
            className="mt-2 font-mono text-[8px] tracking-[0.32em] text-white/40 uppercase md:text-[9px]"
          >
            CHASSIS INITIALISING
          </p>
        </div>

        {/* ─ Rev ring + horse (centre) ────────────────────────────────────── */}
        <div
          data-logo
          className="relative flex-shrink-0"
          style={{
            width:       "min(56vw, 52svh, 360px)",
            aspectRatio: "1",
          }}
        >
          {/* SVG rev counter */}
          <svg
            viewBox={`0 0 ${RC_VIEWBOX} ${RC_VIEWBOX}`}
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              {/* Arc colour: white → red in the last 20% */}
              <linearGradient id="plArcGrad" gradientUnits="userSpaceOnUse"
                x1="0" y1={RC_CY} x2={RC_VIEWBOX} y2={RC_CY}>
                <stop offset="0%"   stopColor="rgba(255,255,255,0.95)" />
                <stop offset="72%"  stopColor="rgba(255,255,255,0.95)" />
                <stop offset="100%" stopColor="#ff1a1a" />
              </linearGradient>
            </defs>

            {/* Background track */}
            <circle
              cx={RC_CX} cy={RC_CY} r={RC_R}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1.5"
              strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform={`rotate(${ARC_ROTATE} ${RC_CX} ${RC_CY})`}
            />

            {/* Foreground arc — animated by strokeDashoffset */}
            <circle
              data-arc-circle
              cx={RC_CX} cy={RC_CY} r={RC_R}
              fill="none"
              stroke="url(#plArcGrad)"
              strokeWidth="2.5"
              strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
              strokeLinecap="round"
              transform={`rotate(${ARC_ROTATE} ${RC_CX} ${RC_CY})`}
              style={{ transition: "stroke-dashoffset 0.05s linear" }}
            />

            {/* Tick marks */}
            {tickData.map((t, i) => (
              <line
                key={i}
                data-tick
                x1={t.x1.toFixed(2)} y1={t.y1.toFixed(2)}
                x2={t.x2.toFixed(2)} y2={t.y2.toFixed(2)}
                stroke={t.isRed ? "#e10600" : "rgba(255,255,255,0.7)"}
                strokeWidth={t.isRed ? 1.8 : 1}
                opacity="0.1"
              />
            ))}

            {/* RPM label — sits below the gap */}
            <text
              x={RC_CX} y={RC_CY + RC_R + 16}
              textAnchor="middle"
              fill="rgba(255,255,255,0.18)"
              fontSize="7"
              fontFamily="monospace"
              letterSpacing="3"
            >
              RPM ×1000
            </text>
          </svg>

          {/* Horse (two layers) */}
          <div className="absolute inset-[14%]">
            <div data-base className="absolute inset-0">
              <FerrariLogo className="h-full w-full" />
            </div>
            <div data-lit className="absolute inset-0">
              <FerrariLogo className="h-full w-full" />
            </div>

            {/* Scan line */}
            <div
              data-scan
              className="pointer-events-none absolute inset-x-0 top-0"
              style={{
                height: "28%",
                background:
                  "linear-gradient(to bottom, transparent, rgba(225,6,0,0.3) 35%, rgba(255,200,180,0.18) 50%, rgba(225,6,0,0.3) 65%, transparent)",
              }}
            />
          </div>
        </div>

        {/* ─ Scrolling data stream (right, desktop only) ──────────────────── */}
        <div
          data-ui
          className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col md:right-10 lg:flex"
          style={{ width: "clamp(100px,10vw,150px)" }}
        >
          <p className="mb-3 font-mono text-[7px] tracking-[0.42em] text-white/20 uppercase">
            VEHICLE DATA
          </p>
          <div className="overflow-hidden" style={{ height: "34vh" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
                animation: "plDataScroll 14s linear infinite",
              }}
            >
              {[...DATA_LINES, ...DATA_LINES].map((d, i) => (
                <div key={i} className="flex flex-col gap-0.5 border-l border-white/10 pl-2.5">
                  <span className="font-mono text-[11px] font-bold tracking-wide text-white/75">
                    {d.val}
                  </span>
                  <span className="font-mono text-[7px] tracking-[0.28em] text-white/25 uppercase">
                    {d.lbl}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer / bottom dock ─────────────────────────────────────────────── */}
      <footer
        data-ui
        className="relative z-20 px-6 pb-[max(1.2rem,env(safe-area-inset-bottom))] md:px-10 md:pb-8"
      >
        {/* Thin progress track */}
        <div className="relative mb-5 h-px w-full overflow-hidden bg-white/10">
          <div
            data-progress-fill
            className="absolute left-0 top-0 h-full bg-white/55 transition-[width] duration-100"
            style={{ width: "0%" }}
          />
        </div>

        {/* Entry gate — space reserved so nothing jumps */}
        <div
          style={{
            minHeight: "5.5rem",
            transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1)",
            opacity:   open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(16px)",
            pointerEvents: open ? "auto" : "none",
          }}
          className="flex flex-col items-start gap-3 md:min-h-0 md:flex-row md:items-center md:gap-8"
        >
          {/* Primary — "Enter with sound" */}
          <button
            ref={primaryBtn}
            type="button"
            tabIndex={open ? 0 : -1}
            disabled={!open}
            onClick={() => choose(true)}
            className="group relative overflow-hidden rounded-full bg-[#da291c] px-9 py-3.5 font-mono text-[10px] uppercase tracking-[0.3em] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
            style={{
              minWidth: "clamp(190px,18vw,260px)",
              boxShadow: "0 0 0 1px rgba(218,41,28,0.6), 0 8px 32px -4px rgba(218,41,28,0.45)",
            }}
          >
            {/* Shimmer sweep on hover */}
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{ transition: "transform 0.65s cubic-bezier(0.16,1,0.3,1)" }}
              aria-hidden="true"
            />
            <style>{`
              button:hover > span[aria-hidden] { transform: translateX(120%); }
            `}</style>
            <span className="relative">Enter with sound</span>
          </button>

          {/* Secondary */}
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            disabled={!open}
            onClick={() => choose(false)}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 underline decoration-white/20 underline-offset-8 transition-colors hover:text-white/70"
          >
            Enter silent
          </button>

          {/* Countdown */}
          {open && (
            <div className="font-mono text-[9px] tracking-[0.3em] text-white/25 md:ml-auto">
              AUTO IN{" "}
              <span className="text-white/45">{Math.max(left, 0)}s</span>
            </div>
          )}
        </div>
      </footer>

      {/* ── Keyframe animations ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes plDataScroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  );
}

export default Preloader;
