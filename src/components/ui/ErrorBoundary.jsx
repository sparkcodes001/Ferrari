import { Component } from "react";
import useStore from "../../store/useStore";
import FerrariLogo from "./FerrariLogo";

// Shown instead of a 3D canvas that could not start (no WebGL, GPU lost, a
// model that failed to load). The page behind it keeps working.
export function SceneFallback({ title = "3D view unavailable", note, dark = false }) {
  return (
    <div className={`scene-fb${dark ? " is-dark" : ""}`} role="img" aria-label={title}>
      <FerrariLogo className="scene-fb-mark" aria-hidden="true" />
      <p className="scene-fb-title">{title}</p>
      {note && <p className="scene-fb-note">{note}</p>}
    </div>
  );
}

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("[ErrorBoundary]", error);
    // never leave the preloader waiting for a scene that will not come
    const st = useStore.getState();
    st.setTextReady(true);
    st.setHeroReady(true);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <SceneFallback note="Your browser could not start the 3D scene. Everything else on the page still works." />
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
