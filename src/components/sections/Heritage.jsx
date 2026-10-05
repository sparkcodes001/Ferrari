import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HERITAGE } from "../../data/heritage";
import "./heritage.css";

gsap.registerPlugin(ScrollTrigger);

const N = HERITAGE.length;

// Parse years — "NOW" maps to the current calendar year
const YEARS = HERITAGE.map((h) =>
  h.year === "NOW" ? new Date().getFullYear() : parseInt(h.year, 10),
);

// Per-era accent colours
const ACCENTS = ["#ffcd00", "#da291c", "#c9a84c", "#f0f0f0", "#4ecdc4", "#da291c"];

// Per-era fact chips
const FACTS = [
  ["12 cylinders", "First race · 1947", "Born in Maranello"],
  ["Every F1 season", "14 Constructor titles", "Chassis 125 S"],
  ["39 built", "$70 M+ at auction", "GT class legend"],
  ["200 km/h in 5 s", "No radio, no AC", "Enzo\'s last gift"],
  ["963 CV total", "HY-KERS hybrid", "499 made"],
  ["Next-gen V12", "Hybrid future", "Still Maranello"],
];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export default function Heritage() {
  const sectionRef    = useRef(null);
  const yearRef       = useRef(null);
  const tagRef        = useRef(null);
  const titleRef      = useRef(null);
  const textRef       = useRef(null);
  const factsRef      = useRef([]);   // array of 3 li refs
  const noRef         = useRef(null);
  const barRef        = useRef(null);
  const dotsRef       = useRef([]);
  const counterRef    = useRef(null);
  const accentLineRef = useRef(null);
  const bgLayersRef   = useRef([]);
  const glowRef       = useRef(null);
  const activeEraRef  = useRef(-1);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: `+=${(N - 1) * 100}vh`,
        pin: true,
        scrub: 1,
        anticipatePin: 0,
        invalidateOnRefresh: true,
        onUpdate(self) {
          const p = self.progress;                       // 0 → 1
          const raw = p * (N - 1);                       // 0 → N-1 (float)
          const idx  = Math.min(N - 1, Math.floor(raw)); // era index
          const frac = raw - idx;                        // 0-1 within era
          const nxt  = Math.min(N - 1, idx + 1);

          // ── Kinetic year counter (interpolated between eras) ──
          if (yearRef.current)
            yearRef.current.textContent = Math.round(lerp(YEARS[idx], YEARS[nxt], frac));

          // ── Progress bar ──
          if (barRef.current)
            barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;

          // ── Era counter ──
          if (counterRef.current)
            counterRef.current.textContent =
              `${String(idx + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`;

          // ── Dots ──
          dotsRef.current.forEach((d, i) => {
            if (!d) return;
            const active = i === idx;
            d.style.width   = active ? "2rem" : "0.45rem";
            d.style.opacity = active ? "1" : i < idx ? "0.5" : "0.18";
            d.style.background = active ? ACCENTS[idx] : "rgba(239,234,224,0.3)";
          });

          // ── Accent progress line (resets per era) ──
          if (accentLineRef.current)
            accentLineRef.current.style.transform = `scaleX(${frac.toFixed(4)})`;

          // ── Per-era background glow ──
          if (glowRef.current)
            glowRef.current.style.background =
              `radial-gradient(ellipse 70% 55% at 28% 52%, ${ACCENTS[idx]}18 0%, transparent 68%)`;

          // ── Background era layer crossfade ──
          bgLayersRef.current.forEach((el, i) => {
            if (!el) return;
            const dist = Math.abs(i - raw);
            el.style.opacity = Math.max(0, 1 - dist * 1.6).toFixed(3);
          });

          // ── Era change: swap copy ──
          if (idx !== activeEraRef.current) {
            activeEraRef.current = idx;
            const era    = HERITAGE[idx];
            const accent = ACCENTS[idx];
            const facts  = FACTS[idx];

            sectionRef.current?.style.setProperty("--era-accent", accent);

            const swapEls = [noRef.current, tagRef.current, titleRef.current, textRef.current];
            gsap.killTweensOf([...swapEls, ...factsRef.current]);

            gsap.to([...swapEls, ...factsRef.current], {
              opacity: 0, y: -14,
              duration: 0.16, ease: "power2.in", overwrite: "auto",
              onComplete() {
                if (noRef.current) {
                  noRef.current.textContent = String(idx + 1).padStart(2, "0");
                  noRef.current.style.color = accent;
                }
                if (tagRef.current)   tagRef.current.textContent   = era.tag;
                if (titleRef.current) titleRef.current.textContent = era.title;
                if (textRef.current)  textRef.current.textContent  = era.text;
                factsRef.current.forEach((el, i) => { if (el) el.textContent = facts[i] ?? ""; });

                gsap.fromTo(
                  [...swapEls, ...factsRef.current],
                  { opacity: 0, y: 16 },
                  {
                    opacity: 1, y: 0,
                    duration: 0.38, ease: "power2.out",
                    stagger: 0.045, overwrite: "auto",
                  },
                );
              },
            });
          }
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="herv2"
      id="heritage"
      data-nav="light"
      style={{ "--era-accent": ACCENTS[0] }}
    >
      {/* ── Per-era background gradients (GSAP controls opacity) ── */}
      <div className="herv2-bgs" aria-hidden="true">
        {HERITAGE.map((_, i) => (
          <div
            key={i}
            ref={(el) => (bgLayersRef.current[i] = el)}
            className="herv2-bg"
            style={{
              background: `radial-gradient(ellipse 75% 60% at 22% 50%, ${ACCENTS[i]}0f 0%, transparent 68%)`,
              opacity: i === 0 ? 1 : 0,
            }}
          />
        ))}
      </div>

      {/* ── Floating ambient glow ── */}
      <div
        ref={glowRef}
        className="herv2-glow"
        aria-hidden="true"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 28% 52%, ${ACCENTS[0]}18 0%, transparent 68%)`,
        }}
      />

      {/* ── Top metadata strip ── */}
      <header className="herv2-top">
        <span className="herv2-label">( 06 ) — The Heritage</span>
        <span className="herv2-label">1947 — Today</span>
      </header>

      {/* ── Main content grid ── */}
      <div className="herv2-grid">

        {/* Left — kinetic year */}
        <div className="herv2-left">
          <div className="herv2-year-clip">
            <span className="herv2-year" ref={yearRef}>{YEARS[0]}</span>
          </div>

          <div className="herv2-accent-rail" aria-hidden="true">
            <i ref={accentLineRef} className="herv2-accent-fill" />
          </div>

          <p className="herv2-era-large" aria-hidden="true">0{1}</p>
        </div>

        {/* Right — copy */}
        <div className="herv2-right">
          <p className="herv2-no"  ref={noRef}>01</p>
          <p className="herv2-tag" ref={tagRef}>{HERITAGE[0].tag}</p>

          <h3 className="herv2-title" ref={titleRef}>{HERITAGE[0].title}</h3>

          <p className="herv2-text" ref={textRef}>{HERITAGE[0].text}</p>

          <ul className="herv2-facts">
            {FACTS[0].map((f, i) => (
              <li key={i} ref={(el) => (factsRef.current[i] = el)}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Bottom control bar ── */}
      <footer className="herv2-foot">
        <div className="herv2-dots" aria-hidden="true">
          {HERITAGE.map((_, i) => (
            <span
              key={i}
              ref={(el) => (dotsRef.current[i] = el)}
              className="herv2-dot"
              style={{
                width:   i === 0 ? "2rem" : "0.45rem",
                opacity: i === 0 ? 1 : 0.18,
                background: i === 0 ? ACCENTS[0] : "rgba(239,234,224,0.3)",
              }}
            />
          ))}
        </div>

        <span className="herv2-counter" ref={counterRef}>
          01 / {String(N).padStart(2, "0")}
        </span>

        <div className="herv2-bar-wrap" aria-hidden="true">
          <i ref={barRef} className="herv2-bar" />
        </div>
      </footer>
    </section>
  );
}
