import useLenis from "./hooks/useLenis";
import useStore from "./store/useStore";
import Preloader from "./components/sections/Preloader";
import Engineering from "./components/sections/Engineering";
import Navbar from "./components/ui/Navbar";
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
      <main>
        <Hero />
        <Intro />
        <Engineering />
        <CTA />
        <Specs />
        <Heritage />
      </main>
    </>
  );
}

export default App;
