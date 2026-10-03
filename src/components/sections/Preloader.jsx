// components/sections/Preloader.jsx
import { useEffect, useRef } from "react";
import gsap from "gsap";
import useStore from "../../store/useStore";
import usePreloaderGate from "../../hooks/usePreloaderGate";
import FerrariLogo from "../ui/FerrariLogo";
import { strokeUnits, pad3 } from "../../utils/logoDraw";

const MIN_TIME = 2.2;

function Preloader() {
  const root = useRef(null);
  const outro = useRef(null);
  const markReady = useRef(() => {});
  const setIsLoading = useStore((s) => s.setIsLoading);
  const ready = usePreloaderGate();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const base = root.current.querySelector("[data-base]");
      const lit = root.current.querySelector("[data-lit]");
      const count = root.current.querySelector("[data-count]");

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
        lit.style.clipPath = `inset(${100 - state.v}% 0% 0% 0%)`;
      };
      render();

      outro.current = gsap
        .timeline({ paused: true, onComplete: () => setIsLoading(false) })
        .to(lit, {
          filter: "drop-shadow(0 0 28px rgba(255,26,26,.85))",
          duration: 0.35,
        })
        .to("[data-ui]", { opacity: 0, duration: 0.3 }, "+=0.15")
        .to(
          root.current,
          {
            clipPath: "inset(100% 0% 0% 0%)",
            duration: 0.9,
            ease: "expo.inOut",
          },
          "<0.1",
        );

      // 0 → 90 over the minimum time, then wait for the hero, then 90 → 100
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
  }, [setIsLoading]);

  useEffect(() => {
    if (ready) markReady.current();
  }, [ready]);

  return (
    <div
      ref={root}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-black"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
    >
      <div className="relative h-48 w-48 md:h-72 md:w-72">
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
