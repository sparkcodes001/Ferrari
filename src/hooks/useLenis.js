import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const REDUCED =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let _lenis = null;
let _locks = 0; // how many overlays (menu, viewer…) currently want scrolling frozen
let _loading = true; // preloader still up

const sync = () => {
  if (!_lenis) return;
  if (_loading || _locks > 0) _lenis.stop();
  else _lenis.start();
};

// One scroll lock for everything. Use these instead of touching body.style.overflow.
export const lockScroll = () => {
  _locks += 1;
  sync();
};
export const unlockScroll = () => {
  _locks = Math.max(0, _locks - 1);
  sync();
};

export const scrollToTarget = (target, opts = {}) =>
  _lenis?.scrollTo(target, { duration: REDUCED ? 0 : 1.6, immediate: REDUCED, ...opts });

// instant, works even while Lenis is stopped (locks / preloader)
export const jumpTo = (target) => {
  if (_lenis) _lenis.scrollTo(target, { immediate: true, force: true });
  else window.scrollTo(0, typeof target === "number" ? target : document.querySelector(target)?.offsetTop ?? 0);
};

export default function useLenis(isLoading) {
  const lenisRef = useRef(null);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !REDUCED,
    });
    lenisRef.current = _lenis = lenis;
    _locks = 0;
    _loading = true;
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
    if (!lenisRef.current) return;
    _loading = isLoading;
    sync();
    if (!isLoading) {
      // let one paint happen first so ScrollTrigger measures settled positions
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }, [isLoading]);
}
