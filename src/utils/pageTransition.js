// Tiny bridge so any component (Navbar, hero CTA...) can start a page transition
// without importing the overlay component.
import { scrollToTarget } from "../hooks/useLenis";

let handler = null;

export function registerTransition(fn) {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

// target: "#section" | "#top" | 0
export function transitionTo(target) {
  if (handler) handler(target);
  else scrollToTarget(target === "#top" ? 0 : target);
}

// Label shown on the curtain for each destination. Edit freely.
export const SECTION_META = {
  "#top": { no: "( 00 )", name: "Home" },
  "#models": { no: "( 02 )", name: "Engineering" },
  "#craft": { no: "( 03 )", name: "The Craft" },
  "#aero": { no: "( 04 )", name: "Aerodynamics" },
  "#specs": { no: "( 05 )", name: "The Numbers" },
  "#collection": { no: "( 06 )", name: "The Collection" },
  "#circuit": { no: "( 07 )", name: "The Circuit" },
  "#heritage": { no: "( 08 )", name: "The Heritage" },
  "#dealer": { no: "( 09 )", name: "Ignition" },
};
