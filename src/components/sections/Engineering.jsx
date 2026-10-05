import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, Grid, ContactShadows } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeader from "../ui/SectionHeader";
import ErrorBoundary, { SceneFallback } from "../ui/ErrorBoundary";
import EngineeringCar from "../canvas/EngineeringCar";
import { STAGES, HOTSPOTS, getStageIndex } from "../canvas/explodeConfig";
import { hasWebGL } from "../../utils/webgl";
import { SPEC_LABEL } from "../../data/specs";
import "./engineering.css";
import useInView from "../../hooks/useInView";

gsap.registerPlugin(ScrollTrigger);

const isSmall = () => typeof window !== "undefined" && window.innerWidth < 900;

function Engineering() {
  const sectionRef   = useRef(null);
  const progressRef  = useRef(0);
  const barRef       = useRef(null);
  const hintRef      = useRef(null);
  const titleRef     = useRef(null);
  const subRef       = useRef(null);
  const dotsRef      = useRef([]);
  const hotspotsRef  = useRef([]);
  const activeStage  = useRef(-1);

  // ── PERFORMANCE FIX ──────────────────────────────────────────────────────
  // The Canvas is NOT rendered until the Engineering section is within 600 px
  // of the viewport. This prevents the WebGL context from being created and
  // burning GPU budget while the user is still on Hero / Intro.
  // ─────────────────────────────────────────────────────────────────────────
  const [canMount, setCanMount] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCanMount(true); },
      { rootMargin: "600px 0px 600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // frameloop pause/resume based on viewport visibility (only matters once mounted)
  const [canvasRef, inView] = useInView({ rootMargin: "20% 0px 20% 0px" });

  const [gl] = useState(() => hasWebGL());

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: () => `+=${isSmall() ? 230 : 280}%`,
        invalidateOnRefresh: true,
        // BUG FIX: removed `anticipatePin: 1` — it causes redundant layout
        // recalculations that stutter the moment you enter the section.
        pin: true,
        scrub: 0.8,           // smooth scrub instead of instant (was `true`)
        onUpdate: (self) => {
          progressRef.current = self.progress;

          if (barRef.current)
            barRef.current.style.transform = `scaleX(${self.progress})`;
          if (hintRef.current)
            hintRef.current.style.opacity = self.progress > 0.03 ? "0" : "1";

          const idx = getStageIndex(self.progress);
          if (idx !== activeStage.current) {
            activeStage.current = idx;
            const stage = STAGES[idx];
            const els   = [titleRef.current, subRef.current];

            gsap.killTweensOf(els);
            gsap.to(els, {
              opacity: 0, y: -8,
              duration: 0.2, ease: "power2.in", overwrite: "auto",
              onComplete() {
                titleRef.current.textContent = stage.title;
                subRef.current.textContent   = stage.sub;
                gsap.fromTo(
                  els,
                  { opacity: 0, y: 8 },
                  { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" },
                );
              },
            });

            dotsRef.current.forEach((d, i) => {
              if (!d) return;
              d.style.opacity = i === idx ? "1" : "0.25";
              d.style.width   = i === idx ? "1.5rem" : "0.375rem";
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
      id="models"
      data-nav="light"
      aria-label="Engineering: the car taken apart"
      className="relative h-screen w-full overflow-hidden bg-black"
      style={{ height: "var(--sh, 100vh)" }}
    >
      <span className="pointer-events-none absolute -right-[2vw] bottom-[-6vw] z-0 select-none font-[Syncopate] text-[32vw] font-bold leading-none text-white/[0.025]">
        02
      </span>

      {/* Canvas is lazy-mounted: zero GPU cost until you scroll near this section */}
      {gl && canMount ? (
        <ErrorBoundary
          fallback={
            <SceneFallback
              dark
              title="Engineering view unavailable"
              note="The exploded 3D model could not start on this device."
            />
          }
        >
          <Canvas
            ref={canvasRef}
            frameloop={inView ? "always" : "never"}
            shadows
            gl={{
              antialias: true,
              alpha: true,
              // Tell the GPU driver to prefer performance over power-saving.
              // Avoids the iGPU being used on dual-GPU machines.
              powerPreference: "high-performance",
            }}
            camera={{ fov: 30, near: 0.1, far: 100 }}
            // PERF FIX: cap pixel ratio at 1.5 (was 2.0 on desktop).
            // At 1.5× the engine renders 2.25× as many pixels as 1.0×,
            // vs 4× at 2.0×. Barely visible quality difference, major perf win.
            dpr={[1, 1.5]}
            className="!absolute inset-0 z-10"
          >
            <ambientLight intensity={0.45} />
            <directionalLight
              position={[6, 10, 4]}
              intensity={1.4}
              castShadow
              // PERF FIX: 1024² shadow maps instead of 2048².
              // Contact shadows are heavily blurred anyway; the quality
              // difference is invisible but the VRAM cost drops 4×.
              shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#8fd3ff" />

            {/* Inline softbox — no HDR download at runtime */}
            <Environment resolution={128}>
              <Lightformer intensity={2.2} position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 18, 1]} />
              <Lightformer intensity={1.4} position={[-9, 4, 5]}  rotation={[0,  Math.PI / 2.6, 0]} scale={[14, 7, 1]} />
              <Lightformer intensity={1.4} position={[9, 4, 5]}   rotation={[0, -Math.PI / 2.6, 0]} scale={[14, 7, 1]} />
              <Lightformer intensity={0.9} color="#8fd3ff" position={[0, 3, -9]} scale={[18, 6, 1]} />
            </Environment>

            <Grid
              position={[0, -0.75, 0]}
              args={[40, 40]}
              cellSize={0.5}
              cellThickness={0.5}
              sectionSize={2.5}
              sectionThickness={1}
              cellColor="#2a2a2a"
              sectionColor="#e11d48"
              // PERF FIX: tighter fade so the GPU fills fewer pixels per frame
              fadeDistance={16}
              fadeStrength={1.8}
              infiniteGrid
            />

            {/* PERF FIX: lower resolution contact shadow (smaller blur sample budget) */}
            <ContactShadows
              position={[0, -0.74, 0]}
              opacity={0.45}
              scale={14}
              blur={1.5}
              far={3}
              resolution={512}
            />

            <EngineeringCar
              progressRef={progressRef}
              hotspotsRef={hotspotsRef}
              position={[0, -0.3, 0]}
            />
          </Canvas>
        </ErrorBoundary>
      ) : gl && !canMount ? (
        // Placeholder shown before the Canvas mounts — keeps layout stable
        <div className="!absolute inset-0 z-10 bg-black" />
      ) : (
        <SceneFallback
          dark
          title="Engineering view unavailable"
          note="This browser can't run the 3D model."
        />
      )}

      {/* Vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.65) 100%)" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-black/80 to-transparent" />

      {HOTSPOTS.map((h, i) => (
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

      <SectionHeader index={2} label="ENGINEERING" coords={SPEC_LABEL} className="!top-24 md:!top-28" />

      {[
        "left-6 top-24 border-l border-t md:left-10 md:top-28",
        "right-6 top-24 border-r border-t md:right-10 md:top-28",
        "left-6 bottom-20 border-l border-b md:left-10",
        "right-6 bottom-20 border-r border-b md:right-10",
      ].map((pos, i) => (
        <span key={i} className={`pointer-events-none absolute z-30 h-6 w-6 border-white/20 ${pos}`} />
      ))}

      <div
        className="pointer-events-none absolute bottom-[8.6rem] left-6 right-6 z-30 md:bottom-28 md:left-10 md:right-auto md:max-w-[20rem]"
        aria-live="polite"
      >
        <p ref={titleRef} className="font-[Syncopate] text-xl font-bold tracking-wide text-white md:text-3xl">
          FULL ASSEMBLY
        </p>
        <p ref={subRef} className="mt-2 font-mono text-[10px] tracking-[0.22em] text-white/50 md:text-[11px] md:tracking-[0.25em]">
          COMPLETE AERODYNAMIC PACKAGE
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-[5.6rem] left-6 z-30 flex items-center gap-1.5 md:bottom-28 md:left-auto md:right-10">
        {STAGES.map((_, i) => (
          <span
            key={i}
            ref={(el) => (dotsRef.current[i] = el)}
            className="h-1.5 w-1.5 rounded-full bg-red-500 transition-all duration-300"
            style={{ opacity: i === 0 ? 1 : 0.25, width: i === 0 ? "1.5rem" : "0.375rem" }}
          />
        ))}
      </div>

      <div
        ref={hintRef}
        className="pointer-events-none absolute bottom-12 left-6 z-30 font-mono text-[10px] tracking-[0.35em] text-white/40 transition-opacity duration-500 md:bottom-10 md:left-1/2 md:-translate-x-1/2"
      >
        SCROLL TO DISASSEMBLE
      </div>

      <div className="pointer-events-none absolute inset-x-6 bottom-8 z-30 h-px bg-white/10 md:inset-x-10">
        <div ref={barRef} className="h-full origin-left scale-x-0 bg-red-600" />
      </div>
    </section>
  );
}

export default Engineering;
