import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether a DOM element (here, the <canvas> itself) is near/in the
 * viewport. Used to pause a Canvas's render loop (frameloop="never") when
 * it's off-screen, instead of burning GPU/CPU on something nobody can see.
 */
export default function useInView({ rootMargin = "20% 0px 20% 0px" } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(true); // assume visible until measured

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin, threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  return [ref, inView];
}
