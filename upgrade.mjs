import fs from "node:fs";
import path from "node:path";

const rd = (p) => fs.readFileSync(p, "utf-8");
const wr = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf-8");
};
const sub1 = (s, oldStr, newStr, label) => {
  const count = s.split(oldStr).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, got ${count}`);
  return s.replace(oldStr, newStr);
};
const add = (p, text) =>
  wr(
    p,
    rd(p).replace(/\n+$/, "") + "\n\n" + text.replace(/^\n+|\n+$/g, "") + "\n",
  );

process.chdir("src");

// ───────────────────────── store: reveal flag ─────────────────────────
{
  const p = "store/useStore.js";
  let s = rd(p);
  s = sub1(
    s,
    "  setHeroReady: (value) => set({ heroReady: value }),\n",
    "  setHeroReady: (value) => set({ heroReady: value }),\n\n  // true the moment the preloader curtain starts lifting: hero entrance cue\n  revealed: false,\n  setRevealed: (value) => set({ revealed: value }),\n",
    "store",
  );
  wr(p, s);
}

// ───────────────────────── 1. LOADER ─────────────────────────
wr(
  "components/sections/Preloader.jsx",
  `// components/sections/Preloader.jsx
import { useEffect, useRef } from "react";
import gsap from "gsap";
import useStore from "../../store/useStore";
import usePreloaderGate from "../../hooks/usePreloaderGate";
import FerrariLogo from "../ui/FerrariLogo";
import { strokeUnits, pad3 } from "../../utils/logoDraw";

const MIN_TIME = 2.2;
const TICKS = 48; // rev-counter segments
const RED_ZONE = 10; // last segments glow red
const STATUS = [
  [0, "Initialising chassis"],
  [30, "Warming tyres"],
  [60, "Calibrating aero"],
  [90, "Ignition"],
];

function Preloader() {
  const root = useRef(null);
  const outro = useRef(null);
  const markReady = useRef(() => {});
  const setIsLoading = useStore((s) => s.setIsLoading);
  const setRevealed = useStore((s) => s.setRevealed);
  const ready = usePreloaderGate();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const base = root.current.querySelector("[data-base]");
      const lit = root.current.querySelector("[data-lit]");
      const count = root.current.querySelector("[data-count]");
      const status = root.current.querySelector("[data-status]");
      const logo = root.current.querySelector("[data-logo]");
      const ticks = gsap.utils.toArray("[data-tick]", root.current);

      gsap.utils.toArray(".ferrari-main, .ferrari-detail", base).forEach((p) =>
        gsap.set(p, {
          fill: "rgba(255,255,255,0.04)",
          stroke: "rgba(255,255,255,0.35)",
          strokeWidth: strokeUnits(p, 1.2),
        }),
      );
      gsap.set(gsap.utils.toArray(".ferrari-highlight", base), { opacity: 0 });

      gsap.set(gsap.utils.toArray(".ferrari-main", lit), {
        fill: "#e10600",
        stroke: "none",
      });
      gsap.utils.toArray(".ferrari-detail", lit).forEach((p) =>
        gsap.set(p, {
          fill: "none",
          stroke: "#ff6a5a",
          strokeWidth: strokeUnits(p, 1.2),
        }),
      );
      gsap.set(gsap.utils.toArray(".ferrari-highlight", lit), {
        fill: "#fff",
        opacity: 1,
      });

      const state = { v: 0 };
      const render = () => {
        count.textContent = pad3(state.v);
        lit.style.clipPath = \`inset(\${100 - state.v}% 0% 0% 0%)\`;

        const n = Math.round((state.v / 100) * TICKS);
        ticks.forEach((t, i) => {
          t.style.opacity = i < n ? "1" : "0.15";
        });

        let label = STATUS[0][1];
        for (const [at, txt] of STATUS) if (state.v >= at) label = txt;
        if (status.textContent !== label) status.textContent = label;
      };
      render();

      outro.current = gsap
        .timeline({ paused: true, onComplete: () => setIsLoading(false) })
        .to(lit, {
          filter: "drop-shadow(0 0 28px rgba(255,26,26,.85))",
          duration: 0.35,
        })
        .to("[data-ui]", { opacity: 0, duration: 0.3 }, "+=0.15")
        .to(logo, { scale: 1.14, duration: 1.1, ease: "expo.inOut" }, "<")
        .call(() => setRevealed(true), null, "<0.1")
        .to(
          root.current,
          {
            clipPath: "inset(100% 0% 0% 0%)",
            duration: 0.9,
            ease: "expo.inOut",
          },
          "<",
        );

      let minDone = false;
      let readyFlag = false;
      const finish = gsap
        .timeline({ paused: true, onComplete: () => outro.current?.play() })
        .to(state, {
          v: 100,
          duration: 0.5,
          ease: "power2.out",
          onUpdate: render,
        });
      const tryFinish = () => minDone && readyFlag && finish.play();

      gsap.to(state, {
        v: 90,
        duration: MIN_TIME,
        ease: "power2.out",
        onUpdate: render,
        onComplete: () => {
          minDone = true;
          tryFinish();
        },
      });
      markReady.current = () => {
        readyFlag = true;
        tryFinish();
      };
    }, root);

    return () => ctx.revert();
  }, [setIsLoading, setRevealed]);

  useEffect(() => {
    if (ready) markReady.current();
  }, [ready]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-black"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
    >
      <div data-logo className="relative h-48 w-48 md:h-72 md:w-72">
        <div data-base className="absolute inset-0">
          <FerrariLogo className="h-full w-full" />
        </div>
        <div data-lit className="absolute inset-0">
          <FerrariLogo className="h-full w-full" />
        </div>
      </div>

      <div
        data-ui
        className="flex items-end gap-1 leading-none text-white"
        style={{ fontFamily: "Syncopate, sans-serif", fontWeight: 700 }}
      >
        <span data-count className="text-5xl md:text-7xl">
          000
        </span>
        <span className="mb-1 text-lg text-red-500 md:text-2xl">%</span>
      </div>

      <div data-ui className="flex flex-col items-center gap-3">
        <div className="flex items-end gap-[3px]">
          {Array.from({ length: TICKS }, (_, i) => (
            <span
              key={i}
              data-tick
              className={i >= TICKS - RED_ZONE ? "bg-red-500" : "bg-white"}
              style={{ width: 2, height: 8 + (i / TICKS) * 16, opacity: 0.15 }}
            />
          ))}
        </div>
        <span
          data-status
          className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/50"
        >
          Initialising chassis
        </span>
      </div>

      <div
        data-ui
        className="absolute left-6 right-6 top-6 flex justify-between font-mono text-[10px] tracking-[0.35em] text-white/40 md:left-10 md:right-10 md:top-10"
      >
        <span>SCUDERIA FERRARI</span>
        <span>LOADING EXPERIENCE</span>
      </div>
    </div>
  );
}

export default Preloader;
`,
);

// ───────────────────────── 2. HERO ─────────────────────────
wr(
  "config/camera.js",
  `import * as THREE from "three";

export const CAR_TARGET = new THREE.Vector3(-1.921, 1.44, 3.727);
export const CAM_POSITION = [-23.545, 35.709, -0.932];
`,
);

{
  const p = "components/canvas/Scene.jsx";
  let s = rd(p);
  s = sub1(
    s,
    "const CAR_TARGET = new THREE.Vector3(-1.921, 1.44, 3.727);\nconst CAM_POSITION = [-23.545, 35.709, -0.932];\n",
    'import { CAR_TARGET, CAM_POSITION } from "../../config/camera";\n',
    "scene consts",
  );
  wr(p, s);
}

wr(
  "components/canvas/HeroCamera.jsx",
  `import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import useStore from "../../store/useStore";
import { CAR_TARGET, CAM_POSITION } from "../../config/camera";

const FOV_END = 23;
const FOV_START = 36;
const SWING = 0.55;
const PULL = 0.32;
const PARALLAX_X = 0.9;
const PARALLAX_Y = 0.6;
const FOV_KICK = 3;

const UP = new THREE.Vector3(0, 1, 0);
const OFFSET = new THREE.Vector3(...CAM_POSITION).sub(CAR_TARGET);
const _p = new THREE.Vector3();
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function HeroCamera({ duration = 2.8 }) {
  const camera = useThree((s) => s.camera);
  const revealed = useStore((s) => s.revealed);
  const t = useRef(REDUCED ? 1 : 0);
  const mouse = useRef({ x: 0, y: 0 });
  const soft = useRef({ x: 0, y: 0 });
  const kick = useRef(0);
  const lastY = useRef(0);

  useEffect(() => {
    if (REDUCED) return;
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    if (!revealed) return;

    if (t.current < 1) t.current = Math.min(1, t.current + delta / duration);
    const k = easeOutQuart(t.current);

    _p.copy(OFFSET)
      .applyAxisAngle(UP, (1 - k) * SWING)
      .multiplyScalar(1 - (1 - k) * PULL)
      .add(CAR_TARGET);

    soft.current.x = THREE.MathUtils.damp(soft.current.x, mouse.current.x, 2.5, delta);
    soft.current.y = THREE.MathUtils.damp(soft.current.y, mouse.current.y, 2.5, delta);
    _p.z += soft.current.x * PARALLAX_X * k;
    _p.y -= soft.current.y * PARALLAX_Y * k;

    const y = window.scrollY;
    const v = Math.abs(y - lastY.current) / Math.max(delta, 1e-3) / window.innerHeight;
    lastY.current = y;
    kick.current = THREE.MathUtils.damp(kick.current, Math.min(v / 3, 1), 4, delta);

    camera.position.copy(_p);
    camera.fov = FOV_END + (1 - k) * (FOV_START - FOV_END) + kick.current * FOV_KICK;
    camera.updateProjectionMatrix();
    camera.lookAt(CAR_TARGET);
  });

  return null;
}
`,
);

{
  const p = "components/sections/Hero.jsx";
  let s = rd(p);
  s = sub1(
    s,
    'import HeroText from "../canvas/HeroText";\n',
    'import HeroText from "../canvas/HeroText";\nimport HeroCamera from "../canvas/HeroCamera";\n',
    "hero import",
  );
  s = sub1(
    s,
    "                <HeroText position={[-8, 0.082, 2.6]} />\n",
    "                <HeroText position={[-8, 0.082, 2.6]} />\n                <HeroCamera />\n",
    "hero cam",
  );
  wr(p, s);
}

{
  const p = "components/HeroOverlay.jsx";
  let s = rd(p);
  s = sub1(
    s,
    'import { useEffect, useRef } from "react";\n',
    'import { useEffect, useRef } from "react";\nimport gsap from "gsap";\nimport SplitType from "split-type";\nimport useStore from "../store/useStore";\n',
    "ho imports",
  );
  s = sub1(
    s,
    "  const fadeRef = useRef(null);\n",
    `  const fadeRef = useRef(null);
  const copyRef = useRef(null);
  const splitRef = useRef(null);
  const revealed = useStore((s) => s.revealed);

  useEffect(() => {
    const el = copyRef.current;
    if (!el) return;
    const eyebrow = el.querySelector(".ho-eyebrow");
    const title = el.querySelector(".ho-title");
    const rest = el.querySelectorAll(".ho-sub, .ho-cta");
    const split = new SplitType([eyebrow, title], {
      types: "lines,words,chars",
      tagName: "span",
    });
    gsap.set(split.chars, { yPercent: 115 });
    gsap.set(rest, { opacity: 0, y: 18 });
    splitRef.current = { split, eyebrow, title, rest };
    return () => {
      split.revert();
      gsap.set(rest, { clearProps: "opacity,transform" });
      splitRef.current = null;
    };
  }, []);

  useEffect(() => {
    const h = splitRef.current;
    if (!revealed || !h) return;
    const eyebrowChars = h.split.chars.filter((c) => h.eyebrow.contains(c));
    const titleChars = h.split.chars.filter((c) => h.title.contains(c));
    const tl = gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .to(eyebrowChars, { yPercent: 0, duration: 1.1, stagger: 0.02 }, 0.2)
      .to(titleChars, { yPercent: 0, duration: 1.3, stagger: 0.035 }, 0.3)
      .to(h.rest, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power3.out" }, 0.8);
    return () => tl.kill();
  }, [revealed]);
`,
    "ho hooks",
  );
  s = sub1(
    s,
    '<div className="ho-copy">',
    '<div className="ho-copy" ref={copyRef}>',
    "ho copy ref",
  );
  wr(p, s);
}

add(
  "components/hero.css",
  `
/* ───────── hero headline reveal (SplitType) ───────── */
.ho-title .line,
.ho-eyebrow .line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.12em;
  margin-bottom: -0.12em;
}
.ho-title .word,
.ho-eyebrow .word,
.ho-title .char,
.ho-eyebrow .char {
  display: inline-block;
}
.ho-title .char,
.ho-eyebrow .char {
  will-change: transform;
}
`,
);

add(
  "index.css",
  `
/* ───────── film grain ───────── */
body::after {
  content: "";
  position: fixed;
  inset: -50%;
  z-index: 60;
  pointer-events: none;
  opacity: 0.07;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  animation: grain 0.9s steps(6) infinite;
}
@keyframes grain {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-4%, 3%); }
  40% { transform: translate(3%, -5%); }
  60% { transform: translate(-6%, -2%); }
  80% { transform: translate(5%, 4%); }
  100% { transform: translate(0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  body::after { animation: none; }
}
`,
);

// ───────────────────────── 3. INTRO ─────────────────────────
wr(
  "components/sections/Intro.jsx",
  `import { useRef } from "react";
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
    if (curve.current) {
      const t = clamp01(r.top / (window.innerHeight * 0.9));
      curve.current.style.transform = \`scaleY(\${t.toFixed(3)})\`;
    }

    const START = 0.08;
    const END = 0.82;
    const f = clamp01((p - START) / (END - START)) * WORDS.length;
    words.current.forEach((el, i) => {
      if (!el) return;
      const o = clamp01(f - i);
      el.style.opacity = (0.14 + 0.86 * o).toFixed(3);
      el.style.transform = \`translateY(\${((1 - o) * 0.3).toFixed(3)}em)\`;
      el.style.filter = o >= 1 ? "none" : \`blur(\${((1 - o) * 7).toFixed(2)}px)\`;
      if (ACCENT.has(WORDS[i])) el.style.setProperty("--u", o.toFixed(3));
    });

    if (rail.current) rail.current.style.transform = \`scaleY(\${p.toFixed(3)})\`;

    if (glow.current)
      glow.current.style.transform = \`translate3d(\${(p * 100).toFixed(2)}vw,0,0)\`;

    if (marquee.current)
      marquee.current.style.transform = \`translate3d(\${(8 - p * 140).toFixed(2)}vw,0,0)\`;

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
              className={\`intro-word\${ACCENT.has(w) ? " is-accent" : ""}\`}
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
`,
);

add(
  "components/sections/story.css",
  `
/* ───────── intro upgrades ───────── */
.intro-text { position: relative; z-index: 2; }
.intro-word { position: relative; }
.intro-word.is-accent::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -0.04em;
  height: 0.06em;
  background: var(--yellow);
  transform-origin: left;
  transform: scaleX(var(--u, 0));
}
.intro-glow {
  position: absolute;
  top: 50%;
  left: 0;
  width: 60vw;
  height: 60vw;
  margin: -30vw 0 0 -30vw;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(247, 214, 78, 0.13), transparent 62%);
  pointer-events: none;
  will-change: transform;
}
.intro-marquee {
  position: absolute;
  left: 0;
  bottom: 15vh;
  z-index: 1;
  white-space: nowrap;
  pointer-events: none;
  will-change: transform;
  font-weight: 700;
  font-size: clamp(70px, 11vw, 220px);
  line-height: 1;
  letter-spacing: -0.02em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(239, 234, 224, 0.1);
}
`,
);

// ───────────────────────── 4. ENGINEERING ─────────────────────────
add(
  "components/canvas/explodeConfig.js",
  `
/* Engineering: labels that track a part as it separates.
   range = scroll progress window in which the label is visible. */
export const HOTSPOTS = [
  { node: "GlassMain_14", title: "Canopy glass", sub: "Laminated safety glass", range: [0.16, 0.32], side: "r" },
  { node: "Body_9", title: "Monocoque shell", sub: "Aluminium–carbon", range: [0.4, 0.6], side: "l" },
  { node: "Tire.003_30", title: "Pirelli P Zero", sub: "Tyre", range: [0.6, 0.76], side: "r" },
  { node: "Brake_19", title: "Brembo", sub: "Carbon-ceramic", range: [0.62, 0.78], side: "l" },
  { node: "Headlights_17", title: "Matrix LED", sub: "Signature lighting", range: [0.78, 0.94], side: "r" },
  { node: "Mechanics_6", title: "V12 · 6.5 L", sub: "830 CV", range: [0.93, 1.1], side: "l" },
];
`,
);

{
  const p = "components/canvas/EngineeringCar.jsx";
  let s = rd(p);
  s = sub1(
    s,
    'import { EXPLODE_MAP, safeName } from "./explodeConfig";',
    'import { EXPLODE_MAP, HOTSPOTS, safeName } from "./explodeConfig";',
    "ec import",
  );
  s = sub1(
    s,
    "function EngineeringCar({ progressRef, ...props }) {",
    "const _box = new THREE.Box3();\nconst _c = new THREE.Vector3();\n\nfunction EngineeringCar({ progressRef, hotspotsRef, ...props }) {",
    "ec sig",
  );
  s = sub1(
    s,
    "  const frame = useRef(null);\n",
    "  const frame = useRef(null);\n  const hotNodes = useRef([]);\n",
    "ec ref",
  );
  s = sub1(
    s,
    "    partsRef.current = resolved;\n",
    `    partsRef.current = resolved;

    hotNodes.current = HOTSPOTS.map((h, i) => {
      const node = cloned.getObjectByName(safeName(h.node));
      if (!node) {
        console.warn("[Engineering] missing hotspot node:", h.node);
        return null;
      }
      return { i, node, range: h.range };
    }).filter(Boolean);
`,
    "ec hot resolve",
  );
  s = sub1(
    s,
    `      groupRef.current.rotation.y = THREE.MathUtils.degToRad(-18) + amount * 0.55;
    }
  });`,
    `      groupRef.current.rotation.y = THREE.MathUtils.degToRad(-18) + amount * 0.55;
    }

    const els = hotspotsRef?.current;
    if (els && groupRef.current && hotNodes.current.length) {
      groupRef.current.updateMatrixWorld(true);
      for (const h of hotNodes.current) {
        const el = els[h.i];
        if (!el) continue;
        const a = smoothstep(h.range[0], h.range[0] + 0.05, amount);
        const b = 1 - smoothstep(h.range[1] - 0.05, h.range[1], amount);
        let vis = Math.min(a, b);
        if (vis > 0.002) {
          _box.setFromObject(h.node).getCenter(_c).project(camera);
          if (_c.z > 1) vis = 0;
          const x = (_c.x * 0.5 + 0.5) * size.width;
          const y = (-_c.y * 0.5 + 0.5) * size.height;
          el.style.transform = \`translate3d(\${x.toFixed(1)}px, \${y.toFixed(1)}px, 0)\`;
        }
        el.style.opacity = vis.toFixed(3);
        el.style.visibility = vis <= 0.002 ? "hidden" : "visible";
      }
    }
  });`,
    "ec frame",
  );
  wr(p, s);
}

{
  const p = "components/sections/Engineering.jsx";
  let s = rd(p);
  s = sub1(
    s,
    'import { STAGES, getStageIndex } from "../canvas/explodeConfig";',
    'import { STAGES, HOTSPOTS, getStageIndex } from "../canvas/explodeConfig";\nimport "./engineering.css";',
    "eng import",
  );
  s = sub1(
    s,
    "  const dotsRef = useRef([]);\n",
    "  const dotsRef = useRef([]);\n  const hotspotsRef = useRef([]);\n",
    "eng ref",
  );
  s = sub1(
    s,
    "<EngineeringCar progressRef={progressRef} position={[0, -0.3, 0]} />",
    "<EngineeringCar\n          progressRef={progressRef}\n          hotspotsRef={hotspotsRef}\n          position={[0, -0.3, 0]}\n        />",
    "eng car",
  );
  s = sub1(
    s,
    "      <SectionHeader\n        index={2}",
    `      {HOTSPOTS.map((h, i) => (
        <div
          key={h.node}
          className="hs"
          data-side={h.side}
          ref={(el) => (hotspotsRef.current[i] = el)}
          aria-hidden="true"
        >
          <i className="hs-dot" />
          <span className="hs-line" />
          <p className="hs-text">
            <b>{h.title}</b>
            <small>{h.sub}</small>
          </p>
        </div>
      ))}

      <SectionHeader
        index={2}`,
    "eng hotspots",
  );
  wr(p, s);
}

wr(
  "components/sections/engineering.css",
  `/* part-tracking labels in the Engineering section */
.hs {
  --dir: 1;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 25;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  will-change: transform, opacity;
}
.hs[data-side="l"] { --dir: -1; }

.hs-dot {
  position: absolute;
  left: -5px;
  top: -5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e11d48;
  box-shadow: 0 0 0 6px rgba(225, 29, 72, 0.22), 0 0 18px rgba(225, 29, 72, 0.8);
}
.hs-line {
  position: absolute;
  left: 0;
  top: 0;
  width: 72px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.2));
  transform-origin: 0 50%;
  transform: scaleX(var(--dir)) rotate(-35deg);
}
.hs-text {
  position: absolute;
  top: -70px;
  left: calc(var(--dir) * 62px);
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  white-space: nowrap;
  font-family: "Syncopate", "Segoe UI", sans-serif;
  text-transform: uppercase;
  color: #efeae0;
}
.hs[data-side="l"] .hs-text {
  transform: translateX(-100%);
  align-items: flex-end;
  text-align: right;
}
.hs-text b { font-size: 11px; letter-spacing: 0.14em; }
.hs-text small {
  font-family: "Space Mono", monospace;
  font-size: 9px;
  letter-spacing: 0.2em;
  color: rgba(239, 234, 224, 0.55);
}
@media (max-width: 768px) {
  .hs-text { display: none; }
  .hs-line { width: 40px; }
}
`,
);

console.log("upgrade applied");
