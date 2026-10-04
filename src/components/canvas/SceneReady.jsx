import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import useStore from "../../store/useStore";

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// Flips heroReady once: text is measured, the environment map is applied,
// shaders are compiled and a few real frames have uploaded textures and
// shadow maps. After that, lifting the preloader reveals a finished scene.
export default function SceneReady() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const textReady = useStore((s) => s.textReady);

  useEffect(() => {
    if (!textReady) return;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 120 && !scene.environment && !cancelled; i++)
        await nextFrame();
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        /* compile is an optimisation: carry on */
      }
      for (let i = 0; i < 3 && !cancelled; i++) await nextFrame();
      if (!cancelled) useStore.getState().setHeroReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [textReady, gl, scene, camera]);

  return null;
}
