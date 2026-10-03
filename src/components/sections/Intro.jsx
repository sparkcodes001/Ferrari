import { useRef } from "react";
import useScrollProgress from "../../hooks/useScrollProgress";
import "./story.css";

const WORDS = [
  "We",
  "don't",
  "build",
  "cars.",
  "We",
  "build",
  "the",
  "feeling",
  "before",
  "you",
  "arrive.",
];
const ACCENT = new Set(["feeling"]);
const MARQUEE = "FERRARI · MARANELLO · SINCE 1947 · ".repeat(4);

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export default function Intro() {
  const sec = useRef(null);
  const curve = useRef(null);
  const rail = useRef(null);
  const glow = useRef(null);
  const marquee = useRef(null);
  const year = useRef(null);
  const words = useRef([]);

  useScrollProgress(sec, (p, r) => {
    // the curtain pulls taut as it rises to the top of the screen
    if (curve.current) {
      const t = clamp01(r.top / (window.innerHeight * 0.9));
      curve.current.style.transform = `scaleY(${t.toFixed(3)})`;
    }

    // word-by-word reveal: fade + rise + focus pull
    const START = 0.08;
    const END = 0.82;
    const f = clamp01((p - START) / (END - START)) * WORDS.length;
    words.current.forEach((el, i) => {
      if (!el) return;
      const o = clamp01(f - i);
      el.style.opacity = (0.14 + 0.86 * o).toFixed(3);
      el.style.transform = `translateY(${((1 - o) * 0.3).toFixed(3)}em)`;
      el.style.filter = o >= 1 ? "none" : `blur(${((1 - o) * 7).toFixed(2)}px)`;
      if (ACCENT.has(WORDS[i])) el.style.setProperty("--u", o.toFixed(3));
    });

    if (rail.current) rail.current.style.transform = `scaleY(${p.toFixed(3)})`;

    // light that sweeps across the section
    if (glow.current)
      glow.current.style.transform = `translate3d(${(p * 100).toFixed(2)}vw,0,0)`;

    // outline marquee drifts with scroll
    if (marquee.current)
      marquee.current.style.transform = `translate3d(${(8 - p * 140).toFixed(2)}vw,0,0)`;

    // founding year counts up
    if (year.current)
      year.current.textContent = String(Math.round(1900 + 47 * clamp01(p / 0.85)));
  });

  return (
    <section className="story intro" id="intro" ref={sec} data-nav="light">
      <div className="intro-curve" ref={curve} />

      <div className="intro-stage">
        <div className="intro-glow" ref={glow} />
        <div className="intro-marquee" ref={marquee} aria-hidden="true">
          {MARQUEE}
        </div>

        <div className="intro-top">
          <span className="story-label">( 01 ) — The Philosophy</span>
          <span className="story-label">Scroll</span>
        </div>

        <p className="intro-text">
          {WORDS.map((w, i) => (
            <span
              key={i}
              className={`intro-word${ACCENT.has(w) ? " is-accent" : ""}`}
              ref={(el) => (words.current[i] = el)}
            >
              {w}
            </span>
          ))}
        </p>

        <div className="intro-rail">
          <i ref={rail} />
        </div>

        <div className="intro-bottom">
          <span className="story-label">Maranello, Italia</span>
          <span className="story-label">
            Est. <span ref={year}>1900</span>
          </span>
          <span className="story-label">44°31′N — 10°51′E</span>
        </div>
      </div>
    </section>
  );
}
