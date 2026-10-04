import useLenis from "./hooks/useLenis";
import useStore from "./store/useStore";
import Preloader from "./components/sections/Preloader";
import Engineering from "./components/sections/Engineering";
import Craft from "./components/sections/Craft";
import Navbar from "./components/ui/Navbar";
import SoundController from "./components/ui/SoundController";
import Hero from "./components/sections/Hero";
import Intro from "./components/sections/Intro";
import Specs from "./components/sections/Specs";
import Heritage from "./components/sections/Heritage";
import CTA from "./components/sections/CTA";

function App() {
  const isLoading = useStore((state) => state.isLoading);
  useLenis(isLoading);

  return (
    <>
      {isLoading && <Preloader />}
      <Navbar />
      <SoundController />
      <main>
        <Hero />
        <Intro />
        <Engineering />
        <Craft />
        <Specs />
        <Heritage />
        <CTA />
      </main>
    </>
  );
}

export default App;
