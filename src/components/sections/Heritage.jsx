import { useEffect, useRef, useState } from "react";
import { HERITAGE } from "../../data/heritage";
import "./heritage.css";

export default function Heritage() {
  const [active, setActive] = useState(0);
  const items = useRef([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.i));
        }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="her" id="heritage" data-nav="light">
      <div className="her-top">
        <span className="her-label">( 06 ) — The Heritage</span>
        <span className="her-label">1947 — Today</span>
      </div>

      <div className="her-grid">
        <div className="her-years">
          <div className="her-sticky">
            {HERITAGE.map((h, i) => (
              <span
                key={h.year}
                className={`her-year${i === active ? " is-on" : i < active ? " is-past" : ""}`}
                aria-hidden={i !== active}
              >
                {h.year}
              </span>
            ))}
          </div>
        </div>

        <ol className="her-list">
          {HERITAGE.map((h, i) => (
            <li
              key={h.year}
              data-i={i}
              ref={(el) => (items.current[i] = el)}
              className={i === active ? "is-on" : ""}
            >
              <p className="her-no">{String(i + 1).padStart(2, "0")}</p>
              <h3>{h.title}</h3>
              <p className="her-text">{h.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
