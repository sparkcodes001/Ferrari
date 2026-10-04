import { useEffect } from "react";
import useStore from "../../store/useStore";
import { setSoundEnabled, ensureAudio, setDrive } from "../../utils/engineSound";
import { startBed, stopBed } from "../../utils/bed";

// Owns the site-wide sound: persistence, first-gesture unlock, the "M" key,
// and the ambient engine that follows scroll speed. Renders nothing.
export default function SoundController() {
  const soundOn = useStore((s) => s.soundOn);
  const revealed = useStore((s) => s.revealed);

  // music bed joins once the curtain has lifted
  useEffect(() => {
    if (soundOn && revealed) startBed();
    else stopBed();
  }, [soundOn, revealed]);

  useEffect(() => {
    setSoundEnabled(soundOn);
    try {
      localStorage.setItem("fera-sound", soundOn ? "1" : "0");
    } catch {
      /* storage blocked: fine */
    }
  }, [soundOn]);

  // browsers only start audio after a gesture
  useEffect(() => {
    if (!soundOn) return;
    const unlock = () => ensureAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [soundOn]);

  // "M" mutes / unmutes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "m" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      const st = useStore.getState();
      setSoundEnabled(!st.soundOn);
      if (!st.soundOn) ensureAudio();
      st.setSoundOn(!st.soundOn);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // scroll speed (viewport-heights / s) → engine revs, with a slow fall-off
  useEffect(() => {
    if (!soundOn) {
      setDrive(0);
      return;
    }
    let raf;
    let lastY = window.scrollY;
    let last = performance.now();
    let v = 0;
    const tick = (now) => {
      const dt = Math.max((now - last) / 1000, 1e-3);
      last = now;
      const y = window.scrollY;
      const speed = Math.abs(y - lastY) / dt / window.innerHeight;
      lastY = y;
      const target = Math.min(speed / 2.5, 1);
      v += (target - v) * (1 - Math.exp(-(target > v ? 6 : 2.2) * dt));
      setDrive(v);
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => {
      if (document.hidden) {
        v = 0;
        setDrive(0);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      setDrive(0);
    };
  }, [soundOn]);

  return null;
}
