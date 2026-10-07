import { useEffect, useRef, useState } from "react";
import FerrariLogo from "../ui/FerrariLogo";
import { FOOTER } from "../../data/footer";
import { transitionTo } from "../../utils/pageTransition";
import { blip } from "../../utils/engineSound";
import "./footer.css";

const WORD = "FERRARI".split("");
const YEAR = new Date().getFullYear();

function FLink({ href, children }) {
  const internal = href.startsWith("#") && href.length > 1;
  return (
    <a
      className="ft-link"
      href={href}
      onPointerEnter={() => blip(520, 0.05, 0.03)}
      onClick={(e) => {
        e.preventDefault();
        if (internal) transitionTo(href); // "#" placeholders do nothing yet
      }}
    >
      <span data-text={children}>{children}</span>
    </a>
  );
}

export default function Footer() {
  const sec = useRef(null);
  const [inView, setInView] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  // everything rises in once the footer is on screen
  useEffect(() => {
    const el = sec.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), {
      threshold: 0.12,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    // TODO: send `email` to your newsletter provider here
    blip(740, 0.09, 0.05);
    setSent(true);
  };

  return (
    <footer
      className={`ft${inView ? " is-in" : ""}`}
      id="footer"
      ref={sec}
      data-nav="light"
    >
      <div className="ft-glow" aria-hidden="true" />

      <div className="ft-top ft-rise" style={{ "--d": 0 }}>
        <span className="ft-label">( 10 ) — Maranello</span>
        <button
          className="ft-label ft-up"
          onClick={() => transitionTo("#top")}
          onPointerEnter={() => blip(520, 0.05, 0.03)}
        >
          Back to top ↑
        </button>
      </div>

      <div className="ft-main">
        <h2 className="ft-headline">
          {FOOTER.headline.map((l, i) => (
            <span className="ft-rise" style={{ "--d": 1 + i }} key={l}>
              {l}
            </span>
          ))}
        </h2>

        <div className="ft-cols">
          <nav className="ft-col ft-rise" style={{ "--d": 2 }} aria-label="Explore">
            <p className="ft-label">Explore</p>
            <ul>
              {FOOTER.explore.map((l) => (
                <li key={l.label}><FLink href={l.href}>{l.label}</FLink></li>
              ))}
            </ul>
          </nav>

          <nav className="ft-col ft-rise" style={{ "--d": 3 }} aria-label="Visit">
            <p className="ft-label">Visit</p>
            <ul>
              {FOOTER.visit.map((l) => (
                <li key={l.label}><FLink href={l.href}>{l.label}</FLink></li>
              ))}
            </ul>
          </nav>

          <nav className="ft-col ft-rise" style={{ "--d": 4 }} aria-label="Follow">
            <p className="ft-label">Follow</p>
            <ul>
              {FOOTER.social.map((l) => (
                <li key={l.label}><FLink href={l.href}>{l.label} ↗</FLink></li>
              ))}
            </ul>
          </nav>

          <div className="ft-col ft-news ft-rise" style={{ "--d": 5 }}>
            <p className="ft-label">The paddock letter</p>
            {sent ? (
              <p className="ft-thanks" role="status">Grazie. You're on the list.</p>
            ) : (
              <form onSubmit={submit} noValidate>
                <label className="sr-only" htmlFor="ft-email">Email address</label>
                <input
                  id="ft-email"
                  type="email"
                  placeholder="Your email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" aria-label="Subscribe">→</button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* giant wordmark: letters rise one by one */}
      <div className="ft-word" aria-hidden="true">
        {WORD.map((c, i) => (
          <span key={i} style={{ "--i": i }}>{c}</span>
        ))}
        <FerrariLogo className="ft-horse" />
      </div>

      <div className="ft-bottom ft-rise" style={{ "--d": 6 }}>
        <span className="ft-label">© {YEAR} · {FOOTER.note}</span>
        <span className="ft-label ft-coords">44°31′N — 10°51′E</span>
        <ul className="ft-legal">
          {FOOTER.legal.map((l) => (
            <li key={l.label}><FLink href={l.href}>{l.label}</FLink></li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
