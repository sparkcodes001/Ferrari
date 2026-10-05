import { useEffect, useRef } from "react";
import "./hero.css";
import { HERO_SCROLL_VIEWPORTS } from "../config/scroll";
import { SPEC } from "../data/specs";
/* Speed at which the readout hits the car's top speed (progress per second) */
const FULL_SPEED_AT = 0.55;
const GEARS = SPEC.gears; // was hard-coded 7 while the Specs section showed 8

/* p = scroll progress 0→1 over the car's drive. Edit the copy freely. */
const CHAPTERS = [
  { from: 0.2, to: 0.5, no: "01", title: "The Heart", text: null }, // text = car spec
  {
    from: 0.46,
    to: 0.76,
    no: "02",
    title: "The Skin",
    text: "Every surface shaped by wind, not by fashion.",
  },
  {
    from: 0.72,
    to: 1.01,
    no: "03",
    title: "The Soul",
    text: "Some things can't be measured. Only felt.",
  },
];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export default function HeroTelemetry({ car }) {
  const root = useRef(null);
  const speedEl = useRef(null);
  const gearEl = useRef(null);
  const rpmEl = useRef(null);
  const chapEls = useRef([]);
  const topSpeed = useRef(SPEC.top);
  topSpeed.current = car.topSpeed ?? SPEC.top;

  useEffect(() => {
    const rootEl = root.current;
    let target = 0;
    let cur = 0;
    let prev = 0;
    let speed = 0; // smoothed 0..1
    let last = performance.now();
    let raf = 0;
    let running = false;

    // last values written to the DOM, so unchanged frames cost nothing
    const w = { vis: "", kmh: -1, gear: "", rpm: "", chap: [] };

    const onScroll = () => {
      target = clamp01(
        window.scrollY / (window.innerHeight * HERO_SCROLL_VIEWPORTS),
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cur = prev = target;

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
      last = now;

      // same damping as the car, so the HUD stays in sync with the 3D
      cur += (target - cur) * (1 - Math.exp(-4 * dt));
      const vel = Math.abs(cur - prev) / dt; // progress / sec
      prev = cur;
      speed += (clamp01(vel / FULL_SPEED_AT) - speed) * (1 - Math.exp(-6 * dt));

      // whole HUD: in after the hero copy fades, out before the stage ends
      const vis = smooth(0.18, 0.32, cur);
      const visStr = vis.toFixed(3);
      if (rootEl && w.vis !== visStr) {
        w.vis = visStr;
        rootEl.style.opacity = visStr;
        rootEl.style.visibility = vis <= 0.001 ? "hidden" : "visible";
      }

      // speed / gear / rpm
      const kmh = Math.round(speed * topSpeed.current);
      if (speedEl.current && w.kmh !== kmh) {
        w.kmh = kmh;
        speedEl.current.textContent = String(kmh).padStart(3, "0");
      }
      const g = speed * GEARS;
      const gear = kmh < 3 ? "N" : String(Math.min(GEARS, Math.floor(g) + 1));
      if (gearEl.current && w.gear !== gear) {
        w.gear = gear;
        gearEl.current.textContent = gear;
      }
      const rpm = (kmh < 3 ? 0.08 : 0.25 + 0.75 * (g % 1)).toFixed(3);
      if (rpmEl.current && w.rpm !== rpm) {
        w.rpm = rpm;
        rpmEl.current.style.transform = `scaleY(${rpm})`;
      }

      // chapters
      CHAPTERS.forEach((c, i) => {
        const el = chapEls.current[i];
        if (!el) return;
        const inn = smooth(c.from, c.from + 0.07, cur);
        const out = 1 - smooth(c.to - 0.07, c.to, cur);
        const o = Math.min(inn, out);
        const oStr = o.toFixed(3);
        const y = ((1 - inn) * 26 - (1 - out) * 26).toFixed(1);
        const key = oStr + "|" + y;
        if (w.chap[i] === key) return;
        w.chap[i] = key;
        el.style.opacity = oStr;
        el.style.transform = `translateY(${y}px)`;
        el.style.visibility = o <= 0.001 ? "hidden" : "visible";
      });

      raf = requestAnimationFrame(tick);
    };

    // only animate while the hero is (nearly) on screen
    const start = () => {
      if (running) return;
      running = true;
      cur = prev = target; // snap: we may have been asleep while the page scrolled
      speed = 0;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { rootMargin: "200px 0px 200px 0px" },
    );
    io.observe(rootEl);

    return () => {
      io.disconnect();
      stop();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const spec = car.specs[0];

  return (
    <div className="ht" ref={root} aria-hidden="true">
      <div className="ht-chapters">
        {CHAPTERS.map((c, i) => (
          <div
            className="ht-chap"
            key={c.no}
            ref={(el) => (chapEls.current[i] = el)}
          >
            <p className="ht-chap-no">
              Chapter {c.no} <span /> 03
            </p>
            <h3 className="ht-chap-title">{c.title}</h3>
            <p className="ht-chap-text">
              {c.text ?? `${spec.val} — ${spec.lines.join(" · ")}`}
            </p>
          </div>
        ))}
      </div>

      <div className="ht-speed">
        <div className="ht-speed-row">
          <span className="ht-speed-num" ref={speedEl}>
            000
          </span>
          <small>km/h</small>
        </div>
        <span className="ht-label">Live velocity</span>
      </div>

      <div className="ht-gear">
        <span className="ht-label">Gear</span>
        <b ref={gearEl}>N</b>
        <div className="ht-rpm">
          <i ref={rpmEl} />
        </div>
        <span className="ht-label">RPM</span>
      </div>
    </div>
  );
}
