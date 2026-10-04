import { useCallback, useEffect, useRef, useState } from "react";
import { COLLECTION } from "../../data/collection";
import { blip } from "../../utils/engineSound";
import "./collection.css";

const N = COLLECTION.length;
const hide = (e) => {
  e.currentTarget.style.display = "none";
};

export default function Collection() {
  const sec = useRef(null);
  const prev = useRef(null);
  const viewRef = useRef(null);
  const closeBtn = useRef(null);
  const rows = useRef([]);
  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0, r: 0 });
  const [active, setActive] = useState(-1);
  const [view, setView] = useState(null); // { i, x, y, on }
  const isOpen = view !== null;

  // preview card trails the cursor with a little swing
  useEffect(() => {
    const el = prev.current;
    if (!el) return;
    let raf = 0;
    let run = false;
    const loop = () => {
      const m = mouse.current;
      const p = pos.current;
      const dx = m.x - p.x;
      p.x += dx * 0.14;
      p.y += (m.y - p.y) * 0.14;
      p.r += (Math.max(-9, Math.min(9, dx * 0.06)) - p.r) * 0.12;
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${p.r.toFixed(2)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !run) {
        run = true;
        raf = requestAnimationFrame(loop);
      } else if (!e.isIntersecting) {
        run = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(sec.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // rows rise in as they scroll into view
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { rootMargin: "0px 0px -8% 0px" },
    );
    rows.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  const close = useCallback(() => {
    setView((v) => v && { ...v, on: false });
    setTimeout(() => setView(null), 800);
  }, []);
  const step = useCallback((d) => {
    blip(260, 0.08, 0.05);
    setView((v) => v && { ...v, i: (v.i + d + N) % N });
  }, []);

  const openView = (i, e) => {
    blip(300, 0.1, 0.06);
    setView({
      i,
      x: e.clientX || window.innerWidth / 2,
      y: e.clientY || window.innerHeight / 2,
      on: false,
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setView((v) => v && { ...v, on: true })),
    );
  };

  // full-screen viewer: keys, scroll lock, focus
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const stop = (e) => e.preventDefault();
    const el = viewRef.current;
    const prevOv = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el?.addEventListener("wheel", stop, { passive: false });
    el?.addEventListener("touchmove", stop, { passive: false });
    window.addEventListener("keydown", onKey);
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = prevOv;
      el?.removeEventListener("wheel", stop);
      el?.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close, step]);

  const cur = view ? COLLECTION[view.i] : null;

  return (
    <section
      className="coll"
      id="collection"
      ref={sec}
      data-nav="light"
      onPointerMove={(e) => {
        mouse.current.x = e.clientX;
        mouse.current.y = e.clientY;
      }}
    >
      <div className="coll-head">
        <span className="coll-label">( 05 ) — The Collection</span>
        <h2 className="coll-title">
          <span>Ten cars.</span>
          <span>One obsession.</span>
        </h2>
        <span className="coll-label coll-hint">Hover to preview · click to enter</span>
      </div>

      <ul className="coll-list" onPointerLeave={() => setActive(-1)}>
        {COLLECTION.map((c, i) => (
          <li
            key={c.no}
            className={`coll-item${active >= 0 && active !== i ? " is-dim" : ""}`}
            style={{ "--i": i % 4 }}
            ref={(el) => (rows.current[i] = el)}
          >
            <button
              className="coll-row"
              onPointerEnter={() => {
                if (active < 0) {
                  pos.current.x = mouse.current.x;
                  pos.current.y = mouse.current.y;
                }
                if (active !== i) blip(480, 0.04, 0.025);
                setActive(i);
              }}
              onClick={(e) => openView(i, e)}
            >
              <em>{c.no}</em>
              <span className="coll-name">{c.name}</span>
              <span className="coll-meta">{c.meta}</span>
              <i>↗</i>
            </button>
          </li>
        ))}
      </ul>

      <div className={`coll-prev${active >= 0 && !isOpen ? " is-show" : ""}`} ref={prev} aria-hidden="true">
        <div className="coll-prev-in">
          {COLLECTION.map((c, i) => (
            <div className={`coll-slide${i === active ? " is-on" : ""}`} key={c.no}>
              <span className="coll-fb">{c.no}</span>
              <img src={c.thumb} alt="" loading="lazy" decoding="async" onError={hide} />
            </div>
          ))}
        </div>
      </div>

      {view && (
        <div
          ref={viewRef}
          className={`coll-view${view.on ? " is-on" : ""}`}
          style={{ "--x": `${view.x}px`, "--y": `${view.y}px` }}
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-label={cur.name}
        >
          <div className="coll-vfb">{cur.no}</div>
          <img key={cur.no} className="coll-vimg" src={cur.full} alt={cur.name} onError={hide} />
          <div className="coll-vshade" />
          <button ref={closeBtn} className="coll-vclose" onClick={close}>
            Close ✕
          </button>
          <div className="coll-vinfo" key={`i${cur.no}`}>
            <p className="coll-vno">
              {cur.no} / {String(N).padStart(2, "0")}
            </p>
            <h3>{cur.name}</h3>
            <p className="coll-vmeta">{cur.meta}</p>
          </div>
          <div className="coll-vnav">
            <button onClick={() => step(-1)}>← Prev</button>
            <button onClick={() => step(1)}>Next →</button>
          </div>
        </div>
      )}
    </section>
  );
}
