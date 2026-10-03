import { useRef } from "react";
import useScrollProgress from "../../hooks/useScrollProgress";
import "./cta.css";

const LINES = ["The experience", "ends where", "yours begins."];

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export default function CTA() {
  const sec = useRef(null);
  const lineEls = useRef([]);
  const btnRef = useRef(null);

  useScrollProgress(sec, (p) => {
    // headline: lines settle in first
    const START = 0.1;
    const END = 0.55;
    const f = clamp01((p - START) / (END - START)) * LINES.length;
    lineEls.current.forEach((el, i) => {
      if (!el) return;
      const o = clamp01(f - i);
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${((1 - o) * 0.4).toFixed(3)}em)`;
    });

    // button: fades in after the headline has mostly settled
    if (btnRef.current) {
      const bo = clamp01((p - 0.5) / 0.25);
      btnRef.current.style.opacity = bo.toFixed(3);
      btnRef.current.style.transform = `translateY(${((1 - bo) * 16).toFixed(3)}px)`;
    }
  });

  return (
    <section className="cta" id="dealer" ref={sec} data-nav="dark">
      <div className="cta-stage">
        <div className="cta-top">
          <span className="cta-label">( 08 ) — Epilogue</span>
          <span className="cta-label">Find a Dealer</span>
        </div>

        <div className="cta-mid">
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

          <a
            className="cta-button"
            href="#"
            ref={btnRef}
            onClick={(e) => e.preventDefault()}
          >
            <span>Find Your Dealer</span>
            <span className="cta-arrow">↗</span>
          </a>
        </div>

        <div className="cta-bottom">
          <span className="cta-label">Maranello, Italia</span>
          <span className="cta-label">44°31′N — 10°51′E</span>
        </div>
      </div>
    </section>
  );
}
