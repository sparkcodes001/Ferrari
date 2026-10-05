import * as THREE from "three";

// Hero camera framing: used by Scene (initial pose), HeroCamera (entrance)
// and HeroText (so the headline fits the screen it is actually drawn on).
export const CAR_TARGET = new THREE.Vector3(-1.921, 1.44, 3.727);
export const CAM_POSITION = [-23.545, 35.709, -0.932];

// Desktop framing: 23° vertical fov. On a portrait screen that same vertical
// fov only shows ~15° of width, so the car overflows the frame. Below a ~1:1
// aspect we keep a minimum horizontal field of view instead.
export const DESKTOP_FOV = 23;
const MIN_HFOV = 28; // degrees of horizontal view we always want to see
const rad = THREE.MathUtils.degToRad;
const deg = THREE.MathUtils.radToDeg;

export function heroFov(aspect) {
  if (!aspect || !Number.isFinite(aspect)) return DESKTOP_FOV;
  const vForMinH = 2 * deg(Math.atan(Math.tan(rad(MIN_HFOV) / 2) / aspect));
  return Math.max(DESKTOP_FOV, vForMinH);
}

// phones / portrait tablets get the compact layout
export const isPortrait = (w, h) => w / h < 0.9;
