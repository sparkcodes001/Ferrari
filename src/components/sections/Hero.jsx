import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Scene from "../canvas/Scene";
import CarModel from "../canvas/CarModel";
import GroundPlane from "../canvas/GroundPlane";
import HeroText from "../canvas/HeroText";
import HeroOverlay from "../HeroOverlay";
import HeroTelemetry from "../HeroTelemetry";
import ErrorBoundary from "../ui/ErrorBoundary";
import { CARS, CAR_MODEL } from "../../data/cars";
import "../hero.css";

function Hero() {
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(true);
  const rootRef = useRef(null);

  const select = useCallback(
    (i) => setIndex((i + CARS.length) % CARS.length),
    [],
  );

  // render the 3D scene only while the hero is (nearly) on screen
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

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") select(index + 1);
      if (e.key === "ArrowLeft") select(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, index, select]);

  const car = CARS[index];
  const theme = {
    "--c1": car.theme[0],
    "--c2": car.theme[1],
    "--c3": car.theme[2],
  };

  return (
    <div className="hero-root" id="top" data-nav="dark" ref={rootRef}>
      <section className="hero-stage" style={theme}>
        <div className="hero-canvas">
          <ErrorBoundary>
            <Suspense fallback={null}>
              <Scene active={active}>
                <CarModel url={CAR_MODEL} paint={car.paint} />
                <GroundPlane position={[-0.171, 0.079, 1.775]} />
                <HeroText position={[-8, 0.082, 2.6]} />
              </Scene>
            </Suspense>
          </ErrorBoundary>
        </div>

        <HeroOverlay
          car={car}
          index={index}
          total={CARS.length}
          pending={false}
          onSelect={select}
        />
        <HeroTelemetry car={car} />
      </section>
    </div>
  );
}

export default Hero;
