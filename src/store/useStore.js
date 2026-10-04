import { create } from "zustand";

const readSound = () => {
  try {
    return localStorage.getItem("fera-sound") === "1";
  } catch {
    return false;
  }
};

const useStore = create((set) => ({
  // sound is opt-in: off until the visitor switches it on
  soundOn: readSound(),
  setSoundOn: (value) => set({ soundOn: value }),

  isLoading: true,
  setIsLoading: (value) => set({ isLoading: value }),

  loadProgress: 0,
  setLoadProgress: (value) => set({ loadProgress: value }),

  carColor: "#ff0000",
  setCarColor: (color) => set({ carColor: color }),

  textReady: false,
  setTextReady: (value) => set({ textReady: value }),

  heroReady: false,
  setHeroReady: (value) => set({ heroReady: value }),

  // true the moment the preloader curtain starts lifting: hero entrance cue
  revealed: false,
  setRevealed: (value) => set({ revealed: value }),
}));

export default useStore;
