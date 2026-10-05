// Evaluated once. Touch-first devices get a lighter renderer (smaller shadow map, no soft-shadow pass, lower DPR).
export const IS_COARSE =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(pointer: coarse)").matches;

export const PREFERS_REDUCED =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
