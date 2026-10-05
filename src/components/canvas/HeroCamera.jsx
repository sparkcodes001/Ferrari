import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import useStore from "../../store/useStore";
import { CAR_TARGET, CAM_POSITION, heroFov, isPortrait } from "../../config/camera";

const FOV_INTRO = 13; // entrance starts this many degrees wider...
const SWING = 0.55; // ...orbits this many radians...
const PULL = 0.32; // ...and starts this much closer
const PARALLAX_X = 0.9; // world units of camera drift with the mouse
const PARALLAX_Y = 0.6;
const FOV_KICK = 3; // extra degrees at full scroll speed
const PORTRAIT_SHIFT = 0.07; // portrait: push the car down 7% so the copy has room above

const UP = new THREE.Vector3(0, 1, 0);
const OFFSET = new THREE.Vector3(...CAM_POSITION).sub(CAR_TARGET);
const _p = new THREE.Vector3();
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function HeroCamera({ duration = 2.8 }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const revealed = useStore((s) => s.revealed);
  const t = useRef(REDUCED ? 1 : 0);
  const mouse = useRef({ x: 0, y: 0 });
  const soft = useRef({ x: 0, y: 0 });
  const kick = useRef(0);
  const lastY = useRef(0);
  const fovEnd = useRef(heroFov(size.width / size.height));

  // framing that depends on the screen shape (fov + vertical shift)
  useEffect(() => {
    const { width: w, height: h } = size;
    if (!w || !h) return;
    fovEnd.current = heroFov(w / h);
    if (isPortrait(w, h)) camera.setViewOffset(w, h, 0, -h * PORTRAIT_SHIFT, w, h);
    else camera.clearViewOffset();
    camera.fov = fovEnd.current;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useEffect(() => {
    if (REDUCED) return;
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    // until the curtain lifts the camera stays on its default pose,
    // so HeroText measures the viewport against the final framing
    if (!revealed) return;

    if (t.current < 1) t.current = Math.min(1, t.current + delta / duration);
    const k = easeOutQuart(t.current);

    // entrance: wide + close + swung round → settles on the hero pose
    _p.copy(OFFSET)
      .applyAxisAngle(UP, (1 - k) * SWING)
      .multiplyScalar(1 - (1 - k) * PULL)
      .add(CAR_TARGET);

    // mouse parallax (screen-right is world +z for this camera)
    soft.current.x = THREE.MathUtils.damp(soft.current.x, mouse.current.x, 2.5, delta);
    soft.current.y = THREE.MathUtils.damp(soft.current.y, mouse.current.y, 2.5, delta);
    _p.z += soft.current.x * PARALLAX_X * k;
    _p.y -= soft.current.y * PARALLAX_Y * k;

    // scroll speed (viewport-heights / second) → small FOV kick
    const y = window.scrollY;
    const v = Math.abs(y - lastY.current) / Math.max(delta, 1e-3) / window.innerHeight;
    lastY.current = y;
    kick.current = THREE.MathUtils.damp(kick.current, Math.min(v / 3, 1), 4, delta);

    camera.position.copy(_p);
    camera.fov = fovEnd.current + (1 - k) * FOV_INTRO + kick.current * FOV_KICK;
    camera.updateProjectionMatrix();
    camera.lookAt(CAR_TARGET);
  });

  return null;
}
