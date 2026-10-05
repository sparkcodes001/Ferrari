import { useRef, useState } from "react";
import useScrollProgress from "../../hooks/useScrollProgress";
import { CRAFT } from "../../data/craft";
import "./craft.css";

const OPEN_END = 0.2; // scroll progress at which the window is full-screen
const N = CRAFT.chapters.length;
const SPAN = (1 - OPEN_END) / N;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// A designed fallback sits underneath; the real image / video fades in over
// it once it has actually loaded. A missing file never shows a broken icon.
function Media({ kind, image, video, vref }) {
  const [imgOk, setImgOk] = useState(false);
  const [vidOk, setVidOk] = useState(false);
  return (
    <div className="craft-media">
      <div className={`craft-fb craft-fb-${kind}`}>
      </div>
      {image && (
        <img
          src={image}
          alt=""
          decoding="async"
          className={imgOk ? "is-on" : ""}
          onLoad={() => setImgOk(true)}
        />
      )}
      {video && (
        <video
          ref={vref}
          src={video}
          poster={image}
          muted
          loop
          playsInline
          preload="metadata"
          className={vidOk ? "is-on" : ""}
          onLoadedData={() => setVidOk(true)}
        />
      )}
    </div>
  );
}

export default function Craft() {
  const sec = useRef(null);
  const stage = useRef(null);
  const intro = useRef(null);
  const win = useRef(null);
  const rail = useRef(null);
  const count = useRef(null);
  const layers = useRef([]);
  const zooms = useRef([]);
  const copies = useRef([]);
  const nums = useRef([]);
  const dots = useRef([]);
  const vids = useRef([]); // 0 = film, 1.. = chapters
  const playing = useRef([]);
  const lastIdx = useRef(-2);

  const setPlaying = (i, on) => {
    if (playing.current[i] === on) return;
    playing.current[i] = on;
    const v = vids.current[i];
    if (!v) return;
    if (on) v.play().catch(() => {});
    else v.pause();
  };

  useScrollProgress(sec, (p) => {
    // A: the small window opens to full screen, the headline gets out of the way
    const e = easeOut(clamp01(p / OPEN_END));
    if (win.current) {
      win.current.style.transform = `scale(${(0.3 + 0.7 * e).toFixed(4)})`;
      win.current.style.borderRadius = `${((1 - e) * 90).toFixed(1)}px`;
    }
    if (intro.current) {
      intro.current.style.opacity = (1 - smooth(0.01, 0.14, p)).toFixed(3);
      intro.current.style.transform = `translateY(${(-smooth(0, 0.16, p) * 7).toFixed(2)}vh)`;
    }
    const full = p > 0.12;
    stage.current?.classList.toggle("is-full", full);
    // the navbar reads this to pick light or dark text
    if (sec.current) sec.current.dataset.nav = full ? "light" : "dark";

    // B: three chapters wipe in over the reel
    CRAFT.chapters.forEach((_, i) => {
      const s = OPEN_END + i * SPAN;
      const en = s + SPAN;
      const layer = layers.current[i];
      if (!layer) return;

      const r = smooth(s - 0.045, s + 0.015, p);
      layer.style.clipPath = `inset(${((1 - r) * 100).toFixed(2)}% 0 0 0)`;
      layer.style.visibility = r <= 0.001 ? "hidden" : "visible";

      const local = clamp01((p - s) / SPAN);
      if (zooms.current[i])
        zooms.current[i].style.transform = `scale(${(1.14 - 0.14 * easeOut(local)).toFixed(4)})`;

      const inn = smooth(s + 0.01, s + 0.06, p);
      const out = i < N - 1 ? 1 - smooth(en - 0.05, en, p) : 1;
      const o = Math.min(inn, out);
      const c = copies.current[i];
      if (c) {
        c.style.opacity = o.toFixed(3);
        c.style.transform = `translateY(${((1 - inn) * 26 - (1 - out) * 26).toFixed(1)}px)`;
        c.style.visibility = o <= 0.001 ? "hidden" : "visible";
      }
      if (nums.current[i])
        nums.current[i].style.transform = `translate3d(0, ${(-(local - 0.5) * 12).toFixed(2)}vh, 0)`;

      setPlaying(i + 1, p > s - 0.07 && p < en + 0.03);
    });
    setPlaying(0, p < OPEN_END + SPAN * 0.5);

    // progress rail + chapter labels
    if (rail.current)
      rail.current.style.transform = `scaleX(${clamp01((p - OPEN_END) / (1 - OPEN_END)).toFixed(4)})`;
    const idx = p < OPEN_END ? -1 : Math.min(N - 1, Math.floor((p - OPEN_END) / SPAN));
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      dots.current.forEach((d, i) => d && d.classList.toggle("is-active", i === idx));
      if (count.current)
        count.current.textContent = `${String(Math.max(idx, 0) + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`;
    }
  });

  return (
    <section className="craft" id="craft" ref={sec} data-nav="dark">
      <div className="craft-stage" ref={stage}>
        <div className="craft-top">
          <span className="craft-label">( 03 ) — The Craft</span>
          <span className="craft-label">Scroll</span>
        </div>

        <div className="craft-intro" ref={intro}>
          <h2 className="craft-headline">
            <span>Made by hand.</span>
            <span>Finished by obsession.</span>
          </h2>
        </div>

        <div className="craft-window" ref={win}>
          {/* base layer: the atelier reel */}
          <div className="craft-layer">
            <Media
              kind={CRAFT.film.kind}
              image={CRAFT.film.image}
              video={CRAFT.film.video}
              vref={(el) => (vids.current[0] = el)}
            />
            <div className="craft-shade" />
            <span className="craft-cap">{CRAFT.film.caption}</span>
          </div>

          {CRAFT.chapters.map((c, i) => (
            <div
              className="craft-layer craft-chapter"
              key={c.no}
              ref={(el) => (layers.current[i] = el)}
            >
              <div className="craft-zoom" ref={(el) => (zooms.current[i] = el)}>
                <Media
                  kind={c.kind}
                  image={c.image}
                  video={c.video}
                  vref={(el) => (vids.current[i + 1] = el)}
                />
              </div>
              <div className="craft-shade" />
              <span
                className="craft-bignum"
                aria-hidden="true"
                ref={(el) => (nums.current[i] = el)}
              >
                {c.no}
              </span>
              <div className="craft-copy" ref={(el) => (copies.current[i] = el)}>
                <p className="craft-no">
                  Chapter {c.no} <span /> {String(N).padStart(2, "0")}
                </p>
                <h3 className="craft-title">{c.title}</h3>
                <p className="craft-line">{c.line}</p>
                <p className="craft-meta">{c.meta}</p>
              </div>
            </div>
          ))}

          <div className="craft-foot">
            <div className="craft-dots">
              {CRAFT.chapters.map((c, i) => (
                <span key={c.no} ref={(el) => (dots.current[i] = el)}>
                  {c.title}
                </span>
              ))}
              <b ref={count}>01 / {String(N).padStart(2, "0")}</b>
            </div>
            <div className="craft-rail">
              <i ref={rail} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
