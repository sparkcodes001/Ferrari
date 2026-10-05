// True when the browser can create a WebGL context. Checked once.
let cached = null;
export function hasWebGL() {
  if (cached !== null) return cached;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    cached = !!(window.WebGLRenderingContext && gl);
    // Release the probe context right away: browsers cap live contexts (~16)
    // and this site already runs two canvases.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
