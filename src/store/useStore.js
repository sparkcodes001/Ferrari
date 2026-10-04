import { create } from "zustand";

const useStore = create((set) => ({
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
