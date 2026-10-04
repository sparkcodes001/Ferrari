// Tiny synthesized V12-ish engine for the CTA start button.
// No audio files: a saw + square oscillator through a low-pass filter.
// Everything starts from a user gesture (pointerdown), so browsers allow it.

let ctx = null;
let nodes = null;
let amb = null;
let enabled = false;

function ensure() {
  if (typeof window === "undefined") return false;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    const master = ctx.createGain();
    master.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    filter.Q.value = 6;

    const saw = ctx.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.value = 36;

    const sub = ctx.createOscillator();
    sub.type = "square";
    sub.frequency.value = 18;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;

    // slow wobble on the filter = cylinders pulsing
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 14;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    saw.connect(filter);
    sub.connect(subGain);
    subGain.connect(filter);
    filter.connect(master);
    let pan = null;
    if (ctx.createStereoPanner) {
      pan = ctx.createStereoPanner();
      master.connect(pan);
      pan.connect(ctx.destination);
    } else {
      master.connect(ctx.destination);
    }

    saw.start();
    sub.start();
    lfo.start();
    nodes = { master, filter, saw, sub, pan };

    // ambient bed: a quiet engine that follows how fast you scroll
    const aGain = ctx.createGain();
    aGain.gain.value = 0;
    const aFilter = ctx.createBiquadFilter();
    aFilter.type = "lowpass";
    aFilter.frequency.value = 260;
    aFilter.Q.value = 4;
    const aSaw = ctx.createOscillator();
    aSaw.type = "sawtooth";
    aSaw.frequency.value = 40;
    const aSub = ctx.createOscillator();
    aSub.type = "triangle";
    aSub.frequency.value = 20;
    aSaw.connect(aFilter);
    aSub.connect(aFilter);
    aFilter.connect(aGain);
    aGain.connect(ctx.destination);
    aSaw.start();
    aSub.start();
    amb = { gain: aGain, filter: aFilter, saw: aSaw, sub: aSub };
  }
  if (ctx.state === "suspended") ctx.resume();
  return true;
}

export function setSoundEnabled(v) {
  enabled = v;
  if (!v) {
    releaseCrank();
    setDrive(0);
  }
}

// call from a click: creates / resumes audio, then confirms with a blip
export function ensureAudio() {
  return enabled ? ensure() : false;
}
export function applySound(on) {
  setSoundEnabled(on);
  if (on && ensure()) {
    ctx.resume?.();
    setTimeout(() => blip(740, 0.09, 0.05), 60);
  }
}

// v = scroll speed 0..1 → pitch, brightness and level of the bed
export function setDrive(v) {
  if (!ctx || !amb) return;
  const t = ctx.currentTime;
  const on = enabled ? v : 0;
  amb.gain.gain.setTargetAtTime(on * 0.06, t, 0.08);
  amb.saw.frequency.setTargetAtTime(40 + on * 75, t, 0.1);
  amb.sub.frequency.setTargetAtTime(20 + on * 37, t, 0.1);
  amb.filter.frequency.setTargetAtTime(260 + on * 900, t, 0.1);
}

// short UI tick for hovers / clicks
export function blip(freq = 600, dur = 0.07, vol = 0.05) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// pointer goes down: starter motor fades in
export function startCrank() {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime;
  nodes.master.gain.cancelScheduledValues(t);
  nodes.master.gain.setTargetAtTime(0.05, t, 0.08);
}

// h = hold progress 0..1; pitch and brightness climb as you hold
export function setRev(h, holding) {
  if (!ctx || !nodes || !enabled) return;
  const t = ctx.currentTime;
  nodes.saw.frequency.setTargetAtTime(36 + h * 84, t, 0.06);
  nodes.sub.frequency.setTargetAtTime(18 + h * 42, t, 0.06);
  nodes.filter.frequency.setTargetAtTime(320 + h * 1500, t, 0.06);
  if (holding) nodes.master.gain.setTargetAtTime(0.05 + h * 0.1, t, 0.08);
}

// let go early: fade out
export function releaseCrank() {
  if (!ctx || !nodes) return;
  const t = ctx.currentTime;
  nodes.master.gain.cancelScheduledValues(t);
  nodes.master.gain.setTargetAtTime(0, t, 0.12);
}

// the engine catches: roar, settle to a rumble, fade
export function ignite() {
  if (!enabled || !ensure()) return;
  const { master, filter, saw, sub } = nodes;
  const t = ctx.currentTime;
  [master.gain, saw.frequency, sub.frequency, filter.frequency].forEach((p) =>
    p.cancelScheduledValues(t),
  );
  master.gain.setTargetAtTime(0.26, t, 0.02);
  saw.frequency.setTargetAtTime(210, t, 0.04);
  sub.frequency.setTargetAtTime(105, t, 0.04);
  filter.frequency.setTargetAtTime(2400, t, 0.04);

  saw.frequency.setTargetAtTime(44, t + 0.55, 0.35);
  sub.frequency.setTargetAtTime(22, t + 0.55, 0.35);
  filter.frequency.setTargetAtTime(360, t + 0.55, 0.35);
  master.gain.setTargetAtTime(0.07, t + 0.55, 0.4);
  master.gain.setTargetAtTime(0, t + 2.4, 0.5);
}

export function disposeSound() {
  try {
    ctx?.close();
  } catch {
    /* already closed */
  }
  ctx = null;
  nodes = null;
  amb = null;
}

// ── Enter screen: ignition while the loader fills, fly-by as the curtain lifts ──
let noiseBuf = null;
function noise() {
  if (!noiseBuf) {
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// the engine catches: a sharp cough that the rev-follow then settles
export function cough() {
  if (!ctx || !nodes || !enabled) return;
  const t = ctx.currentTime;
  nodes.master.gain.setTargetAtTime(0.2, t, 0.01);
  nodes.saw.frequency.setTargetAtTime(92, t, 0.02);
  nodes.filter.frequency.setTargetAtTime(1200, t, 0.02);
}

// starter motor, then the catch ~0.75s later; call setRev(progress, true) every frame after
export function startEngine() {
  if (!enabled || !ensure()) return;
  startCrank();
  setTimeout(cough, 750);
}

// a car passes left to right: doppler pitch, stereo sweep, wind whoosh (~2.3s)
export function flyBy() {
  if (!enabled || !ensure()) return;
  const { master, filter, saw, sub, pan } = nodes;
  const t = ctx.currentTime;
  [master.gain, saw.frequency, sub.frequency, filter.frequency].forEach((p) =>
    p.cancelScheduledValues(t),
  );

  saw.frequency.setValueAtTime(saw.frequency.value, t);
  saw.frequency.linearRampToValueAtTime(190, t + 0.75);
  saw.frequency.linearRampToValueAtTime(112, t + 1.05);
  saw.frequency.exponentialRampToValueAtTime(58, t + 2.2);
  sub.frequency.setValueAtTime(sub.frequency.value, t);
  sub.frequency.linearRampToValueAtTime(95, t + 0.75);
  sub.frequency.linearRampToValueAtTime(56, t + 1.05);
  sub.frequency.exponentialRampToValueAtTime(29, t + 2.2);
  filter.frequency.setValueAtTime(filter.frequency.value, t);
  filter.frequency.linearRampToValueAtTime(2600, t + 0.75);
  filter.frequency.linearRampToValueAtTime(700, t + 1.2);
  filter.frequency.linearRampToValueAtTime(300, t + 2.2);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0.3, t + 0.75);
  master.gain.linearRampToValueAtTime(0.12, t + 1.15);
  master.gain.linearRampToValueAtTime(0, t + 2.4);

  if (pan) {
    pan.pan.cancelScheduledValues(t);
    pan.pan.setValueAtTime(-0.95, t);
    pan.pan.linearRampToValueAtTime(0.95, t + 1.9);
    pan.pan.setValueAtTime(0, t + 2.5);
  }

  const src = ctx.createBufferSource();
  src.buffer = noise();
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(2400, t + 0.8);
  bp.frequency.exponentialRampToValueAtTime(500, t + 2.0);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.75);
  g.gain.linearRampToValueAtTime(0, t + 2.0);
  const p2 = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p2) {
    p2.pan.setValueAtTime(-0.95, t);
    p2.pan.linearRampToValueAtTime(0.95, t + 1.9);
  }
  src.connect(bp);
  bp.connect(g);
  if (p2) {
    g.connect(p2);
    p2.connect(ctx.destination);
  } else {
    g.connect(ctx.destination);
  }
  src.start(t);
  src.stop(t + 2.1);
}
