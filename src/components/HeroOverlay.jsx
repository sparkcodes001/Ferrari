import { useEffect, useRef } from "react";
import "./hero.css";
import { scrollToTarget } from "../hooks/useLenis";

const pad = (n) => String(n).padStart(2, "0");

export default function HeroOverlay({
  car,
  index,
  total,
  pending,
  onSelect,
}) {
  const fadeRef = useRef(null);

  // copy + specs fade out as the car starts driving, and stop being clickable
  useEffect(() => {
    const onScroll = () => {
      const el = fadeRef.current;
      if (!el) return;
      const p = Math.min(window.scrollY / (window.innerHeight * 0.4), 1);
      el.style.opacity = String(1 - p);
      el.style.transform = `translateY(${-p * 24}px)`;
      el.style.visibility = p >= 1 ? "hidden" : "visible";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="ho">
      <div className="ho-fade" ref={fadeRef}>
        <div className="ho-copy">
          <p className="ho-eyebrow">The Art Of</p>
          <h2 className="ho-title">Performance.</h2>
          <p className="ho-sub">
            Where engineering becomes
            <br />
            emotion.
          </p>
          <a
            className="ho-cta"
            href="#models"
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget("#models");
            }}
          >
            <span>Explore Models</span>
            <span>↗</span>
          </a>
        </div>

        <div className="ho-specs" key={`specs-${car.id}`}>
          {car.specs.map((s, i) => (
            <div
              className="ho-spec ho-anim"
              style={{ animationDelay: `${i * 0.08}s` }}
              key={s.val}
            >
              <div className="ho-spec-val">{s.val}</div>
              <div className="ho-spec-sub">
                {s.lines.map((l, j) => (
                  <span key={j}>
                    {l}
                    <br />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="ho-dots" role="tablist" aria-label="Select car">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === index}
              aria-label={`Car ${i + 1}`}
              className={`ho-dot${i === index ? " is-active" : ""}`}
              onClick={() => onSelect(i)}
            />
          ))}
        </div>

        <div
          className={`ho-count${pending ? " is-pending" : ""}`}
          style={{ "--p": (index + 1) / total }}
        >
          <span className="ho-count-num">
            {pad(index + 1)} / {pad(total)}
          </span>
          <small key={`tag-${car.id}`} className="ho-anim">
            {pending ? "Loading…" : car.tagline}
          </small>
          <i />
        </div>

        <div className="ho-scroll">
          <span className="ho-scroll-line" />
          <span className="ho-scroll-label">Scroll to explore</span>
        </div>
      </div>
    </div>
  );
}