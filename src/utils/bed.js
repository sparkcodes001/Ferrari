// Optional music bed. Put a loopable track at  public/media/audio/bed.mp3
// If the file is missing nothing happens (no errors, no silence glitches).
let el = null;
let fade = 0;
let wanted = false; // true once the bed is meant to be audible

function fadeTo(target, secs, done) {
  clearInterval(fade);
  if (!el) return;
  const a = el;
  const from = a.volume;
  const t0 = performance.now();
  fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / (secs * 1000));
    a.volume = from + (target - from) * k;
    if (k >= 1) {
      clearInterval(fade);
      done?.();
    }
  }, 30);
}

// Call from a click: lets iOS/Safari allow the bed to start later, outside a gesture.
export function primeBed() {
  if (!el) {
    el = new Audio("/media/audio/bed.mp3");
    el.loop = true;
    el.volume = 0;
    el.preload = "auto";
    el.addEventListener("error", () => {
      el = null;
    });
  }
  const a = el;
  a.play()
    .then(() => {
      if (!wanted) a.pause();
    })
    .catch(() => {});
}

export function startBed(volume = 0.32) {
  wanted = true;
  if (!el) {
    el = new Audio("/media/audio/bed.mp3");
    el.loop = true;
    el.volume = 0;
    el.preload = "auto";
    el.addEventListener("error", () => {
      el = null;
    });
  }
  const a = el;
  a.play()
    .then(() => fadeTo(volume, 2.5))
    .catch(() => {});
}

export function stopBed() {
  wanted = false;
  if (!el) return;
  const a = el;
  fadeTo(0, 0.8, () => a.pause());
}
