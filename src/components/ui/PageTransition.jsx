import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FerrariLogo from "./FerrariLogo";
import { registerTransition, SECTION_META } from "../../utils/pageTransition";
import { jumpTo, lockScroll, unlockScroll } from "../../hooks/useLenis";
import { blip } from "../../utils/engineSound";
import { PREFERS_REDUCED } from "../../utils/device";
import "./pageTransition.css";

gsap.registerPlugin(ScrollTrigger);

const COLS = 6;

// Ferrari-red curtain: six columns rise from the bottom and cover the page, the horse and the
// destination name appear, the page jumps while nothing is visible, then the columns lift away
// off the top to reveal the new section.
export default function PageTransition() {
  const root = useRef(null);
  const cols = useRef([]);
  const content = useRef(null);
  const mark = useRef(null);
  const noEl = useRef(null);
  const nameEl = useRef(null);
  const bar = useRef(null);
  const busy = useRef(false);

  useEffect(() => {
    const run = (target) => {
      if (busy.current) return;
      const key = target === 0 ? "#top" : target;
      const dest = key === "#top" ? 0 : key;

      // work out where we are going; a link to a section that isn't on the page does nothing
      let y = 0;
      if (dest !== 0) {
        const el = document.querySelector(dest);
        if (!el) return;
        y = el.getBoundingClientRect().top + window.scrollY;
      }
      if (Math.abs(window.scrollY - y) < 8) return; // already there

      if (PREFERS_REDUCED) {
        jumpTo(dest);
        return;
      }

      const meta = SECTION_META[key] || { no: "", name: "" };
      if (noEl.current) noEl.current.textContent = meta.no;
      if (nameEl.current) nameEl.current.textContent = meta.name;

      busy.current = true;
      lockScroll();
      blip(300, 0.12, 0.05);

      const r = root.current;
      const stagger = { each: 0.06, from: "edges" };

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(r, { autoAlpha: 0 });
          gsap.set(cols.current, { scaleY: 0 });
          gsap.set(content.current, { opacity: 0 });
          gsap.set(bar.current, { scaleX: 0 });
          busy.current = false;
          unlockScroll();
          ScrollTrigger.update();
        },
      });

      tl.set(r, { autoAlpha: 1 })
        .set(cols.current, { scaleY: 0, transformOrigin: "50% 100%" })
        .set(bar.current, { scaleX: 0 })
        // 1. curtain rises
        .to(cols.current, { scaleY: 1, duration: 0.8, ease: "expo.inOut", stagger })
        // 2. horse + destination name
        .to(content.current, { opacity: 1, duration: 0.25, ease: "power1.out" }, "-=0.4")
        .fromTo(
          mark.current,
          { scale: 0.82, rotate: -4 },
          { scale: 1, rotate: 0, duration: 0.9, ease: "expo.out" },
          "<",
        )
        .fromTo(
          [noEl.current, nameEl.current],
          { yPercent: 110 },
          { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.08 },
          "<0.05",
        )
        // 3. while the screen is fully covered, jump
        .call(() => {
          jumpTo(dest);
          ScrollTrigger.update();
        })
        .to(bar.current, { scaleX: 1, duration: 0.55, ease: "power2.inOut" }, "<")
        // 4. content leaves, curtain lifts off the top
        .to(
          [noEl.current, nameEl.current],
          { yPercent: -110, duration: 0.5, ease: "power3.in", stagger: 0.05 },
          "+=0.12",
        )
        .to(mark.current, { scale: 1.12, opacity: 0, duration: 0.5, ease: "power2.in" }, "<")
        .set(cols.current, { transformOrigin: "50% 0%" })
        .to(cols.current, { scaleY: 0, duration: 0.85, ease: "expo.inOut", stagger }, "-=0.1");

      // put the mark back for next time (after the lift)
      tl.set(mark.current, { opacity: 1 });
    };

    return registerTransition(run);
  }, []);

  return (
    <div className="pt" ref={root} aria-hidden="true">
      <div className="pt-cols">
        {Array.from({ length: COLS }).map((_, i) => (
          <i key={i} ref={(el) => (cols.current[i] = el)} />
        ))}
      </div>
      <div className="pt-content" ref={content}>
        <span className="pt-mark-wrap" ref={mark}>
          <FerrariLogo className="pt-mark" />
        </span>
        <div className="pt-mask">
          <span className="pt-no" ref={noEl} />
        </div>
        <div className="pt-mask">
          <h2 className="pt-name" ref={nameEl} />
        </div>
        <div className="pt-bar">
          <i ref={bar} />
        </div>
      </div>
    </div>
  );
}
