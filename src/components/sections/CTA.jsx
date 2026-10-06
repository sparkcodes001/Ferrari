import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import useScrollProgress from "../../hooks/useScrollProgress";
import useStore from "../../store/useStore";
import {
  startCrank,
  setRev,
  releaseCrank,
  ignite,
  applySound,
  disposeSound,
} from "../../utils/engineSound";
import "./cta.css";

const LINES = ["The experience", "ends where", "yours begins."];
// Wire these hrefs to your real pages / forms.
const ACTIONS = [
  { no: "01", label: "Book a test drive", href: "#" },
  { no: "02", label: "Find a dealer", href: "#" },
  { no: "03", label: "Request a brochure", href: "#" },
];
const HOLD_MS = 1400; // how long you hold to ignite
const RELEASE_MS = 450; // how fast the ring drains if you let go
const RING = 2 * Math.PI * 46; // progress circle (r = 46 in a 100 viewBox)
const RING_TEXT = "HOLD TO START ENGINE · HOLD TO START ENGINE · ";
const RING_TEXT_ON = "ENGINE RUNNING · ENGINE RUNNING · ENGINE RUNNING · ";

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export default function CTA() {
  const sec = useRef(null);
  const lineEls = useRef([]);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const progRef = useRef(null);
  const flashRef = useRef(null);
  const hold = useRef({ active: false, h: 0, last: 0, raf: 0 });
  const ignitedRef = useRef(false);
  const [ignited, setIgnited] = useState(false);
  const sound = useStore((s) => s.soundOn);
  const setSoundOn = useStore((s) => s.setSoundOn);

  // scroll-driven entrance: headline lines, then the start button
  useScrollProgress(sec, (p) => {
    const START = 0.04;
    const END = 0.4;
    const f = clamp01((p - START) / (END - START)) * LINES.length;
    lineEls.current.forEach((el, i) => {
      if (!el) return;
      const o = clamp01(f - i);
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${((1 - o) * 0.4).toFixed(3)}em)`;
    });
    if (wrapRef.current) {
      const bo = clamp01((p - 0.28) / 0.28);
      wrapRef.current.style.opacity = bo.toFixed(3);
      wrapRef.current.style.transform = `translateY(${((1 - bo) * 40).toFixed(1)}px) scale(${(0.86 + 0.14 * bo).toFixed(3)})`;
    }
  });

  const paint = useCallback((h, shake) => {
    const b = btnRef.current;
    const c = progRef.current;
    if (!b || !c) return;
    c.style.strokeDashoffset = String(RING * (1 - h));
    b.style.setProperty("--h", h.toFixed(3));
    const a = shake ? h * 3 : 0;
    b.style.transform = `translate3d(${((Math.random() - 0.5) * a).toFixed(2)}px, ${((Math.random() - 0.5) * a).toFixed(2)}px, 0) scale(${(1 - h * 0.035).toFixed(3)})`;
  }, []);

  const trigger = useCallback(() => {
    ignitedRef.current = true;
    setIgnited(true);
    ignite();
    navigator.vibrate?.([40, 30, 90]);
    if (flashRef.current)
      gsap.fromTo(
        flashRef.current,
        { opacity: 0.95 },
        { opacity: 0, duration: 1.6, ease: "power3.out" },
      );
    paint(1, false);
  }, [paint]);

  // the hold loop lives in a ref so it can schedule itself without
  // referencing a const that is still being defined
  const tickRef = useRef(() => {});
  const loop = useCallback((now) => tickRef.current(now), []);

  useEffect(() => {
    tickRef.current = (now) => {
      const s = hold.current;
      const dt = Math.min(now - s.last, 50);
      s.last = now;
      s.h = s.active
        ? Math.min(1, s.h + dt / HOLD_MS)
        : Math.max(0, s.h - dt / RELEASE_MS);
      paint(s.h, s.active);
      setRev(s.h, s.active);

      if (s.active && s.h >= 1) {
        s.active = false;
        trigger();
      }
      s.raf =
        s.active || (s.h > 0 && !ignitedRef.current)
          ? requestAnimationFrame(loop)
          : 0;
    };
  }, [paint, trigger, loop]);

  const begin = useCallback(() => {
    const s = hold.current;
    if (ignitedRef.current || s.active) return;
    s.active = true;
    s.last = performance.now();
    startCrank();
    if (!s.raf) s.raf = requestAnimationFrame(loop);
  }, [loop]);

  const end = useCallback(() => {
    const s = hold.current;
    if (!s.active) return;
    s.active = false;
    if (!ignitedRef.current) {
      releaseCrank();
      if (!s.raf) s.raf = requestAnimationFrame(loop);
    }
  }, [loop]);

  const reset = useCallback(() => {
    const s = hold.current;
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    s.active = false;
    s.h = 0;
    ignitedRef.current = false;
    releaseCrank();
    setIgnited(false);
    paint(0, false);
  }, [paint]);

  useEffect(() => {
    const s = hold.current;
    return () => {
      cancelAnimationFrame(s.raf);
      disposeSound();
    };
  }, []);

  const toggleSound = () => {
    const next = !sound;
    applySound(next);
    setSoundOn(next);
  };

  return (
    <section
      className={`cta${ignited ? " is-ignited" : ""}`}
      id="dealer"
      ref={sec}
      data-nav="dark"
    >
      <div className="cta-stage">
        <div className="cta-red" />
        <div className="cta-flash" ref={flashRef} />

        <div className="cta-top">
          <span className="cta-label">( 09 ) — Ignition</span>
          {ignited ? (
            <button className="cta-text-btn" onClick={reset}>
              Switch off ↺
            </button>
          ) : (
            <span className="cta-label">Find a Dealer</span>
          )}
        </div>

        <div className="cta-grid">
          <div className="cta-copy">
            <h2 className="cta-headline">
              {LINES.map((line, i) => (
                <span
                  className="cta-line"
                  key={line}
                  ref={(el) => (lineEls.current[i] = el)}
                >
                  {line}
                </span>
              ))}
            </h2>

            <div className="cta-sub">
              <p className="cta-hint-copy">
                Press and hold the button. Your test drive is one ignition away.
              </p>
              <ul className="cta-actions">
                {ACTIONS.map((a, i) => (
                  <li key={a.no} style={{ "--i": i }}>
                    <a
                      className="cta-action"
                      href={a.href}
                      tabIndex={ignited ? 0 : -1}
                      onClick={(e) => a.href === "#" && e.preventDefault()}
                    >
                      <em>{a.no}</em>
                      <span>{a.label}</span>
                      <i>↗</i>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="cta-start-wrap" ref={wrapRef}>
            <button
              ref={btnRef}
              className="cta-start"
              aria-label="Hold to start the engine"
              aria-pressed={ignited}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                begin();
              }}
              onPointerUp={end}
              onPointerCancel={end}
              onBlur={end}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
                  e.preventDefault();
                  begin();
                }
              }}
              onKeyUp={(e) => {
                if (e.code === "Space" || e.code === "Enter") end();
              }}
            >
              <svg className="cta-text-ring" viewBox="0 0 200 200" aria-hidden="true">
                <defs>
                  <path
                    id="cta-ring-path"
                    d="M100,100 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0"
                  />
                </defs>
                <text>
                  <textPath
                    href="#cta-ring-path"
                    textLength="578"
                    lengthAdjust="spacing"
                  >
                    {ignited ? RING_TEXT_ON : RING_TEXT}
                  </textPath>
                </text>
              </svg>

              <svg className="cta-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle className="cta-ring-track" cx="50" cy="50" r="46" />
                <circle
                  ref={progRef}
                  className="cta-ring-prog"
                  cx="50"
                  cy="50"
                  r="46"
                  strokeDasharray={RING}
                  strokeDashoffset={RING}
                />
              </svg>

              <span className="cta-bezel" />
              <span className="cta-core">
                <b>START</b>
                <small>{ignited ? "RUNNING" : "ENGINE"}</small>
              </span>
            </button>
          </div>
        </div>

        <div className="cta-bottom">
          <span className="cta-label">Maranello, Italia</span>
          <button
            className="cta-text-btn"
            onClick={toggleSound}
            aria-pressed={sound}
          >
            Sound — {sound ? "On" : "Off"}
          </button>
          <span className="cta-label">44°31′N — 10°51′E</span>
        </div>

        <p className="sr-only" aria-live="polite">
          {ignited ? "Engine started. Dealer options unlocked." : ""}
        </p>
      </div>
    </section>
  );
}
