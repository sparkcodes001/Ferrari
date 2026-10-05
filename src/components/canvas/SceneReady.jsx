import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import useStore from "../../store/useStore";

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/**
 * BUG FIXES
 * 1. compileAsync had NO timeout — if the environment map never loaded (e.g.
 *    slow connection, blocked asset), the preloader would hang forever.
 *    Now we bail after 6 s and resolve anyway.
 * 2. The environment-map wait loop also had no hard cap on iterations; combined
 *    with a missing env map this could spin for hundreds of frames.
 *    Capped at 180 frames (~3 s at 60 fps).
 * 3. The `cancelled` flag is checked after `compileAsync` completes, but if
 *    the component unmounts during the compile the flag is set too late and
 *    `setHeroReady(true)` fires on an unmounted store update.
 *    Now we check `cancelled` immediately after the await.
 */
export default function SceneReady() {
  const gl      = useThree((s) => s.gl);
  const scene   = useThree((s) => s.scene);
  const camera  = useThree((s) => s.camera);
  const textReady = useStore((s) => s.textReady);

  useEffect(() => {
    if (!textReady) return;

    let cancelled = false;

    const COMPILE_TIMEOUT_MS = 6_000;
    const ENV_MAX_FRAMES     = 180;

    (async () => {
      // Wait for the env map (up to ~3 s @ 60 fps)
      for (let i = 0; i < ENV_MAX_FRAMES; i++) {
        if (cancelled) return;
        if (scene.environment) break;
        await nextFrame();
      }

      if (cancelled) return;

      // Compile shaders — race against a hard timeout so we never hang
      try {
        await Promise.race([
          gl.compileAsync(scene, camera),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("compile timeout")), COMPILE_TIMEOUT_MS)
          ),
        ]);
      } catch {
        // compileAsync is an optimisation; carry on regardless
      }

      if (cancelled) return;

      // A couple of frames to let texture uploads flush to the GPU
      for (let i = 0; i < 3; i++) {
        if (cancelled) return;
        await nextFrame();
      }

      if (!cancelled) useStore.getState().setHeroReady(true);
    })();

    return () => { cancelled = true; };
  }, [textReady, gl, scene, camera]);

  return null;
}
