import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export default function useScrollProgress(ref, onProgress) {
  const cb = useRef(onProgress);
  useEffect(() => {
    cb.current = onProgress;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      cb.current(total > 0 ? clamp01(-r.top / total) : 0, r); // same p as your original
    };
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top bottom", // active from the moment it enters the viewport
      end: "bottom top",
      onUpdate: report,
      onRefresh: report,
    });
    return () => st.kill();
  }, [ref]);
}
