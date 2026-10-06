import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import "../hero.css";
import FerrariLogo from "./FerrariLogo";
import useStore from "../../store/useStore";
import { scrollToTarget, lockScroll, unlockScroll } from "../../hooks/useLenis";
import { applySound, blip } from "../../utils/engineSound";

const LINKS = [
  { label: "Home", href: "#top" },
  { label: "Models", href: "#models" },
  { label: "Craft", href: "#craft" },
  { label: "Aero", href: "#aero" },
  { label: "Specs", href: "#specs" },
  { label: "Collection", href: "#collection" },
  { label: "Circuit", href: "#circuit" },
  { label: "Heritage", href: "#heritage" },
];
const MENU_LINKS = [...LINKS, { label: "Dealer", href: "#dealer" }];
// sections the "active link" logic watches (order-independent)
const TRACK = ["#models", "#craft", "#aero", "#dealer", "#specs", "#collection", "#circuit", "#heritage"];
const RING = 2 * Math.PI * 24; // scroll-progress ring circumference

// Pull `target` toward the pointer while it hovers `trigger`.
function useMagnetic(trigger, target, strength = 0.3) {
  useEffect(() => {
    const t = trigger.current;
    const el = target.current;
    if (!t || !el || !window.matchMedia("(hover: hover)").matches) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
    const move = (e) => {
      const r = t.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    t.addEventListener("pointermove", move);
    t.addEventListener("pointerleave", leave);
    return () => {
      t.removeEventListener("pointermove", move);
      t.removeEventListener("pointerleave", leave);
      gsap.set(el, { clearProps: "x,y" });
    };
  }, [trigger, target, strength]);
}

function RollLink({ href, active, onClick, children }) {
  return (
    <a
      href={href}
      onClick={onClick}
      onPointerEnter={() => blip(520, 0.05, 0.03)}
      className={`ho-link${active ? " is-active" : ""}`}
    >
      <span data-text={children}>{children}</span>
    </a>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState(null);
  const revealed = useStore((s) => s.revealed);
  const soundOn = useStore((s) => s.soundOn);
  const setSoundOn = useStore((s) => s.setSoundOn);
  const heroHeight = useRef(Infinity); // stays Infinity (never hide) until measured
  const ringRef = useRef(null);
  const brandRef = useRef(null);
  const markRef = useRef(null);
  const burgerRef = useRef(null);

  useMagnetic(brandRef, markRef, 0.25);
  useMagnetic(burgerRef, burgerRef, 0.35);

  // Esc closes the menu, body scroll is locked while it's open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [open]);

  // flip color scheme based on whichever [data-nav] section is under the navbar
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("[data-nav]"));
    if (!sections.length) return;

    const probeY = 80; // just under the fixed navbar
    const hit = new Set();
    const pick = () => {
      let top = null;
      for (const s of sections) if (hit.has(s)) top = s; // later sections paint over earlier ones
      setLight(top ? top.dataset.nav === "light" : false);
    };

    let io;
    const build = () => {
      io?.disconnect();
      hit.clear();
      const bottom = Math.max(0, window.innerHeight - probeY - 2);
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (e.isIntersecting ? hit.add(e.target) : hit.delete(e.target)));
          pick();
        },
        { rootMargin: "-" + probeY + "px 0px -" + bottom + "px 0px", threshold: 0 },
      );
      sections.forEach((s) => io.observe(s));
    };
    build();

    const mo = new MutationObserver(pick);
    mo.observe(document.body, { attributes: true, attributeFilter: ["data-nav"], subtree: true });
    window.addEventListener("resize", build);
    return () => {
      io?.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", build);
    };
  }, []);

  // scroll ring + active link + hide-on-scroll (after the Hero ends)
  useEffect(() => {
    const measure = () => {
      const hero = document.getElementById("top");
      if (hero) heroHeight.current = hero.offsetHeight;
    };
    measure();
    window.addEventListener("resize", measure);

    let lastY = window.scrollY;
    let ticking = false;

    const frame = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      // page progress ring around the burger
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      if (ringRef.current)
        ringRef.current.style.strokeDashoffset = String(RING * (1 - p));

      // which section owns the screen right now
      const line = window.innerHeight * 0.35;
      let best = null;
      let bestTop = -Infinity;
      for (const h of TRACK) {
        const el = document.querySelector(h);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= line && top > bestTop) {
          best = h;
          bestTop = top;
        }
      }
      setActive(best);

      if (y < heroHeight.current) {
        setHidden(false); // always visible through the whole Hero
      } else if (delta > 4) {
        setHidden(true);
      } else if (delta < -4) {
        setHidden(false);
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(frame);
    };

    frame();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const go = useCallback(
    (e, href) => {
      e.preventDefault();
      const wasOpen = open;
      setOpen(false);
      setTimeout(
        () => {
          scrollToTarget(href === "#top" ? 0 : href);
        },
        wasOpen ? 500 : 0,
      );
    },
    [open],
  );

  const navClass = [
    "ho-nav",
    !revealed && "is-pre",
    open && "is-open",
    !open && light && "is-light",
    !open && hidden && "is-hidden",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={navClass}>
        <a
          ref={brandRef}
          className="ho-brand"
          href="#top"
          aria-label="Ferrari, back to top"
          onClick={(e) => go(e, "#top")}
        >
          <span ref={markRef} className="ho-mark-wrap">
            <FerrariLogo className="ho-mark" aria-hidden="true" />
          </span>
          <span className="ho-divider" />
          <div className="ho-meta">
            <div>Est. 1947</div>
            <div>Maranello, IT</div>
          </div>
        </a>

        <div className="ho-right">
          <nav className="ho-links">
            {LINKS.slice(1).map((l) => (
              <RollLink
                key={l.href}
                href={l.href}
                active={active === l.href}
                onClick={(e) => go(e, l.href)}
              >
                {l.label}
              </RollLink>
            ))}
          </nav>

          <a
            className="ho-dealer"
            onPointerEnter={() => blip(520, 0.05, 0.03)}
            href="#dealer"
            onClick={(e) => go(e, "#dealer")}
          >
            <span>Find a dealer</span>
            <i>↗</i>
          </a>

          <button
            className="ho-sound"
            aria-pressed={soundOn}
            aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
            onClick={() => {
              applySound(!soundOn);
              setSoundOn(!soundOn);
            }}
          >
            <span className="ho-eq" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <em>Sound</em>
          </button>

          <div className="ho-burger-wrap" ref={burgerRef}>
            <svg className="ho-ring" viewBox="0 0 52 52" aria-hidden="true">
              <circle
                ref={ringRef}
                cx="26"
                cy="26"
                r="24"
                strokeDasharray={RING}
                strokeDashoffset={RING}
              />
            </svg>
            <button
              className={`ho-burger${open ? " is-open" : ""}`}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => {
                blip(380, 0.08, 0.05);
                setOpen((o) => !o);
              }}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`ho-menu${open ? " is-open" : ""}`}
        aria-hidden={!open}
        data-lenis-prevent
      >
        <FerrariLogo className="ho-menu-mark" aria-hidden="true" />
        <ul>
          {MENU_LINKS.map((l, i) => (
            <li key={l.href} style={{ "--i": i }}>
              <a
                href={l.href}
                tabIndex={open ? 0 : -1}
                onClick={(e) => go(e, l.href)}
              >
                <em>{String(i + 1).padStart(2, "0")}</em>
                <span>{l.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="ho-menu-foot">Maranello, Italia — Est. 1947</p>
      </div>
    </>
  );
}
