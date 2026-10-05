// True when the browser can create a WebGL context. Checked once.
let cached = null;
export function hasWebGL() {
  if (cached !== null) return cached;
  try {
    const c = document.createElement("canvas");
    cached = !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    cached = false;
  }
  return cached;
}
