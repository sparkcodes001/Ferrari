import useLenis from "./hooks/useLenis";
import useStore from "./store/useStore";
import Preloader from "./components/sections/Preloader";
import Engineering from "./components/sections/Engineering";
import Craft from "./components/sections/Craft";
import Aero from "./components/sections/Aero";
import Navbar from "./components/ui/Navbar";
import SoundController from "./components/ui/SoundController";
import Hero from "./components/sections/Hero";
import Intro from "./components/sections/Intro";
import Specs from "./components/sections/Specs";
import Collection from "./components/sections/Collection";
import Circuit from "./components/sections/Circuit";
import Heritage from "./components/sections/Heritage";
import CTA from "./components/sections/CTA";

function App() {
  const isLoading = useStore((state) => state.isLoading);
  useLenis(isLoading);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {isLoading && <Preloader />}
      <Navbar />
      <SoundController />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Intro />
        <Aero />
        {/* <Engineering /> */}
        <Craft />
        <Specs />
        <Collection />
        <Circuit />
        <Heritage />
        <CTA />
      </main>
    </>
  );
}

export default App;
