import { useEffect, useState } from "react";
import useStore from "../store/useStore";

/**
 * Locks page scroll while the preloader is up, and returns `true` once
 * either the Hero's 3D scene reports itself ready (heroReady in the store),
 * or `maxWait` ms have passed (failsafe, so users are never trapped).
 */
export default function usePreloaderGate({ maxWait = 9000 } = {}) {
  const heroReady = useStore((s) => s.heroReady);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const failsafe = setTimeout(() => setTimedOut(true), maxWait);

    return () => {
      clearTimeout(failsafe);
      document.body.style.overflow = prevOverflow;
    };
  }, [maxWait]);

  return heroReady || timedOut;
}
