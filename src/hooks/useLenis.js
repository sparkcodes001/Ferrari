import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const REDUCED =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// BUG FIX: the original exported `scrollToTarget` as a closure that captured
// a module-level `instance` variable.  On Vite HMR hot-reloads the module
// re-executes and `instance` is reset to null, so any component that had
// already imported the helper would call it against null.  Exporting the
// getter lazily via a stable function reference avoids the stale-closure.
let _lenis = null;
export const scrollToTarget = (target, opts = {}) =>
  _lenis?.scrollTo(target, { duration: REDUCED ? 0 : 1.6, immediate: REDUCED, ...opts });

export default function useLenis(isLoading) {
  const lenisRef = useRef(null);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      duration:     1.2,
      easing:       (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel:  !REDUCED,
    });
    lenisRef.current = _lenis = lenis;
    lenis.stop();
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      _lenis = null;
    };
  }, []);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (isLoading) {
      lenis.stop();
    } else {
      lenis.start();
      // BUG FIX: calling ScrollTrigger.refresh() immediately after lenis.start()
      // can fire before the browser has finished a paint, causing ScrollTrigger
      // to measure stale scroll positions.  Deferring one rAF fixes jank on
      // first scroll, especially on mobile.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }, [isLoading]);
}
