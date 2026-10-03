import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, ContactShadows } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeader from "../ui/SectionHeader";
import EngineeringCar from "../canvas/EngineeringCar";
import { STAGES, HOTSPOTS, getStageIndex } from "../canvas/explodeConfig";
import "./engineering.css";
import useInView from "../../hooks/useInView";

gsap.registerPlugin(ScrollTrigger);

function Engineering() {
  const sectionRef = useRef(null);
  const progressRef = useRef(0);
  const barRef = useRef(null);
  const titleRef = useRef(null);
  const subRef = useRef(null);
  const dotsRef = useRef([]);
  const hotspotsRef = useRef([]);
  const activeStage = useRef(-1);
  const [canvasRef, inView] = useInView();

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=280%",
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          if (barRef.current) {
            barRef.current.style.transform = `scaleX(${self.progress})`;
          }

          const idx = getStageIndex(self.progress);
          if (idx !== activeStage.current) {
            activeStage.current = idx;
            const stage = STAGES[idx];

            gsap.to([titleRef.current, subRef.current], {
              opacity: 0,
              y: -8,
              duration: 0.2,
              ease: "power2.in",
              onComplete: () => {
                titleRef.current.textContent = stage.title;
                subRef.current.textContent = stage.sub;
                gsap.fromTo(
                  [titleRef.current, subRef.current],
                  { opacity: 0, y: 8 },
                  { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
                );
              },
            });

            dotsRef.current.forEach((d, i) => {
              if (!d) return;
              d.style.opacity = i === idx ? "1" : "0.25";
              d.style.width = i === idx ? "1.5rem" : "0.375rem";
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
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      <span className="pointer-events-none absolute -right-[2vw] bottom-[-6vw] z-0 select-none font-[Syncopate] text-[32vw] font-bold leading-none text-white/[0.025]">
        02
      </span>

      <Canvas
        ref={canvasRef}
        frameloop={inView ? "always" : "never"}
        shadows
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 30, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        className="!absolute inset-0 z-10"
      >
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[6, 10, 4]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight
          position={[-6, 4, -4]}
          intensity={0.35}
          color="#8fd3ff"
        />
        <Environment resolution={256} preset="studio" />

        <Grid
          position={[0, -0.75, 0]}
          args={[40, 40]}
          cellSize={0.5}
          cellThickness={0.5}
          sectionSize={2.5}
          sectionThickness={1}
          cellColor="#2a2a2a"
          sectionColor="#e11d48"
          fadeDistance={22}
          fadeStrength={1.5}
          infiniteGrid
        />
        <ContactShadows
          position={[0, -0.74, 0]}
          opacity={0.5}
          scale={16}
          blur={2}
          far={4}
        />

        <EngineeringCar
          progressRef={progressRef}
          hotspotsRef={hotspotsRef}
          position={[0, -0.3, 0]}
        />
      </Canvas>

      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.65) 100%)",
        }}
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

      <SectionHeader
        index={2}
        label="ENGINEERING"
        coords="V12 · 6.5L · 830CV"
        className="!top-24 md:!top-28"
      />

      {[
        "left-6 top-24 border-l border-t md:left-10 md:top-28",
        "right-6 top-24 border-r border-t md:right-10 md:top-28",
        "left-6 bottom-20 border-l border-b md:left-10",
        "right-6 bottom-20 border-r border-b md:right-10",
      ].map((pos, i) => (
        <span
          key={i}
          className={`pointer-events-none absolute z-30 h-6 w-6 border-white/20 ${pos}`}
        />
      ))}

      <div className="pointer-events-none absolute bottom-24 left-6 z-30 max-w-[20rem] md:left-10 md:bottom-28">
        <p
          ref={titleRef}
          className="font-[Syncopate] text-2xl font-bold tracking-wide text-white md:text-3xl"
        >
          FULL ASSEMBLY
        </p>
        <p
          ref={subRef}
          className="mt-2 font-mono text-[11px] tracking-[0.25em] text-white/50"
        >
          COMPLETE AERODYNAMIC PACKAGE
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-24 right-6 z-30 flex items-center gap-1.5 md:right-10 md:bottom-28">
        {STAGES.map((_, i) => (
          <span
            key={i}
            ref={(el) => (dotsRef.current[i] = el)}
            className="h-1.5 w-1.5 rounded-full bg-red-500 transition-all duration-300"
            style={{
              opacity: i === 0 ? 1 : 0.25,
              width: i === 0 ? "1.5rem" : "0.375rem",
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-10 left-1/2 z-30 -translate-x-1/2 font-mono text-[10px] tracking-[0.35em] text-white/40">
        SCROLL TO DISASSEMBLE
      </div>

      <div className="pointer-events-none absolute inset-x-6 bottom-8 z-30 h-px bg-white/10 md:inset-x-10">
        <div ref={barRef} className="h-full origin-left scale-x-0 bg-red-600" />
      </div>
    </section>
  );
}

export default Engineering;
