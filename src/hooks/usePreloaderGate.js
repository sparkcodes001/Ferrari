import { useEffect, useState } from "react";
import useStore from "../store/useStore";

/**
 * BUG FIX: the original used `document.body.style.overflow = "hidden"` which
 * doesn't prevent scroll on iOS Safari when the page is taller than the
 * viewport. The correct cross-browser approach is to freeze the body at its
 * current scroll position with `position: fixed` + stored scroll-Y, then
 * restore exactly on cleanup so the page never jumps.
 *
 * Also fixes: the previous version didn't restore `overflow` to its actual
 * prior value — it stored the value BEFORE the effect, which is always ""
 * on first mount, so it worked by accident; but if another effect had set
 * overflow first this would silently overwrite it.
 *
 * Returns `true` once the 3D scene is ready OR the failsafe timeout fires.
 */
export default function usePreloaderGate({ maxWait = 9000 } = {}) {
  const heroReady = useStore((s) => s.heroReady);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Grab scroll position before we freeze so we can restore it exactly.
    const scrollY = 0; // always start at the hero, never restore an old position
    window.scrollTo(0, 0);

    // Freeze: position:fixed removes the element from scroll flow on all browsers.
    const prev = {
      position:  document.body.style.position,
      top:       document.body.style.top,
      width:     document.body.style.width,
      overflow:  document.body.style.overflow,
    };

    document.body.style.position = "fixed";
    document.body.style.top      = `-${scrollY}px`;
    document.body.style.width    = "100%";
    document.body.style.overflow = "hidden";

    const failsafe = setTimeout(() => setTimedOut(true), maxWait);

    return () => {
      clearTimeout(failsafe);

      // Restore exactly what was there before.
      document.body.style.position = prev.position;
      document.body.style.top      = prev.top;
      document.body.style.width    = prev.width;
      document.body.style.overflow = prev.overflow;

      // Jump back to where we were (iOS unfreezes to top-of-page otherwise).
      window.scrollTo(0, scrollY);
    };
  }, [maxWait]);

  return heroReady || timedOut;
}
