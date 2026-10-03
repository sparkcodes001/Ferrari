import gsap from "gsap";

// px → SVG user units, so a stroke is the same thickness on screen at any logo size
export function strokeUnits(el, px = 1.5) {
  const svg = el.ownerSVGElement;
  const vb = svg?.viewBox?.baseVal;
  const w = svg?.getBoundingClientRect().width || 1;
  return vb && vb.width ? (px * vb.width) / w : px;
}

// Sets up the "draw" state on every logo inside `scope`
export function prepLogo(scope, { stroke = "#ff1a1a", px = 1.5 } = {}) {
  const main = gsap.utils.toArray(".ferrari-main", scope);
  const detail = gsap.utils.toArray(".ferrari-detail", scope);
  const highlight = gsap.utils.toArray(".ferrari-highlight", scope);
  const draw = [...main, ...detail];

  draw.forEach((p) => {
    const len = p.getTotalLength();
    gsap.set(p, {
      strokeDasharray: len,
      strokeDashoffset: len,
      stroke,
      strokeWidth: strokeUnits(p, px),
      fill: "rgba(225,6,0,0)",
    });
  });
  gsap.set(highlight, { opacity: 0, fill: "#ffffff" });

  return { main, detail, highlight, draw };
}

export const pad3 = (v) => String(Math.round(v)).padStart(3, "0");
