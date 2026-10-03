import { useCallback, useEffect, useRef, useState } from "react";
import "../hero.css";
import { scrollToTarget } from "../../hooks/useLenis";

const LINKS = [
  { label: "Home", href: "#top" },
  { label: "Models", href: "#models" },
  { label: "Specs", href: "#specs" },
  { label: "Heritage", href: "#heritage" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const [hidden, setHidden] = useState(false);
  const heroHeight = useRef(Infinity); // stays Infinity (never hide) until measured below

  // Esc closes the menu, body scroll is locked while it's open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // measure the Hero's height so we know when it ends
  // flip color scheme based on whichever section is under the navbar
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("[data-nav]"));
    if (!sections.length) return;

    let ticking = false;
    const probeY = 80; // just under the fixed navbar

    const update = () => {
      const el = document.elementFromPoint(window.innerWidth / 2, probeY);
      const match = el?.closest("[data-nav]");
      setLight(match ? match.dataset.nav === "light" : false);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update(); // set correct state immediately on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // hide on scroll down, reveal on scroll up — only AFTER the Hero ends
  useEffect(() => {
    const measure = () => {
      const hero = document.getElementById("top");
      if (hero) heroHeight.current = hero.offsetHeight;
    };
    measure();
    window.addEventListener("resize", measure);

    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;

        if (y < heroHeight.current) {
          setHidden(false); // always visible through the whole Hero
        } else if (delta > 4) {
          setHidden(true);
        } else if (delta < -4) {
          setHidden(false);
        }

        lastY = y;
        ticking = false;
      });
    };

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
    open && "is-open",
    !open && light && "is-light",
    !open && hidden && "is-hidden",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={navClass}>
        <a className="ho-brand" href="#top" onClick={(e) => go(e, "#top")}>
          <span className="ho-logo">Ferrari</span>
          <span className="ho-divider" />
          <div className="ho-meta">
            <div>Est. 1947</div>
            <div>Maranello, IT</div>
          </div>
        </a>

        <div className="ho-right">
          <nav className="ho-links">
            {LINKS.slice(1).map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>
                {l.label}
              </a>
            ))}
          </nav>
          <button
            className={`ho-burger${open ? " is-open" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div
        className={`ho-menu${open ? " is-open" : ""}`}
        aria-hidden={!open}
        data-lenis-prevent
      >
        <ul>
          {LINKS.map((l, i) => (
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
