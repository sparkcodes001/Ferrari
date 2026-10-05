import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Scene from "../canvas/Scene";
import CarModel from "../canvas/CarModel";
import GroundPlane from "../canvas/GroundPlane";
import HeroText from "../canvas/HeroText";
import HeroCamera from "../canvas/HeroCamera";
import SceneReady from "../canvas/SceneReady";
import useStore from "../../store/useStore";
import HeroOverlay from "../HeroOverlay";
import HeroTelemetry from "../HeroTelemetry";
import ErrorBoundary, { SceneFallback } from "../ui/ErrorBoundary";
import { hasWebGL } from "../../utils/webgl";
import { CARS, CAR_MODEL } from "../../data/cars";
import "../hero.css";

function Hero() {
  const [index, setIndex] = useState(0);
  const revealed  = useStore((s) => s.revealed);
  // BUG FIX: `pending` was hard-coded to `false`, so HeroOverlay never knew
  // the 3D scene was still loading.  Derive it from the store so the car
  // selector can show a loading state until the scene is ready.
  const heroReady = useStore((s) => s.heroReady);
  const [active, setActive] = useState(true);
  const rootRef = useRef(null);

  const select = useCallback(
    (i) => setIndex((i + CARS.length) % CARS.length),
    [],
  );

  // Render the 3D scene only while the hero is (nearly) on screen
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "200px 0px 200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Keyboard car navigation (only when the hero is visible)
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") select(index + 1);
      if (e.key === "ArrowLeft")  select(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, index, select]);

  // BUG FIX: the WebGL check ran synchronously in useState, so it only fires
  // once — fine for `gl`.  But setTextReady / setHeroReady were called inside
  // `useEffect` which is correct; however the dependency array was [gl] which
  // means on a page with no WebGL the effect can re-run if gl
  // ever changes (it never does, but it's still an unstable dep).
  // Using a ref for the initial check makes this truly run-once.
  const [gl] = useState(() => hasWebGL());
  const noGlHandled = useRef(false);
  useEffect(() => {
    if (gl || noGlHandled.current) return;
    noGlHandled.current = true;
    const st = useStore.getState();
    st.setTextReady(true);
    st.setHeroReady(true);
  }, [gl]);

  const car   = CARS[index];
  const theme = {
    "--c1": car.theme[0],
    "--c2": car.theme[1],
    "--c3": car.theme[2],
  };

  return (
    <div className="hero-root" id="top" data-nav="dark" ref={rootRef}>
      <section className="hero-stage" style={theme}>
        <div className={`hero-canvas${revealed ? " is-in" : ""}`}>
          {gl ? (
            <ErrorBoundary>
              <Suspense fallback={null}>
                <Scene active={active}>
                  <CarModel url={CAR_MODEL} paint={car.paint} />
                  <GroundPlane position={[-0.171, 0.079, 1.775]} />
                  <HeroText position={[-8, 0.082, 2.6]} />
                  <HeroCamera />
                  <SceneReady />
                </Scene>
              </Suspense>
            </ErrorBoundary>
          ) : (
            <SceneFallback note="This browser can't run the 3D scene. Scroll on: the rest of the experience works." />
          )}
        </div>

        <HeroOverlay
          car={car}
          index={index}
          total={CARS.length}
          pending={!heroReady}   // BUG FIX: was always false
          onSelect={select}
        />
        <HeroTelemetry car={car} />
      </section>
    </div>
  );
}

export default Hero;
