// canvas/CarModel.jsx
import { useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { carTrack } from "./carTrack";
import { HOVER_EXPLODE_MAP, safeName } from "./explodeConfig";
import { HERO_SCROLL_VIEWPORTS } from "../../config/scroll";
import { IS_COARSE } from "../../utils/device";


/* ───────────── Drive / wheel settings ───────────── */
const WHEELS = {
  FL: "Tire.001_22",
  RL: "Tire.002_26",
  FR: "Tire.003_30",
  RR: "Tire.004_34",
};
const DRIVE_DISTANCE = 14;
const DIR = 1;
const KEEP_CALIPERS_STILL = true;

/* ───────────── Paint settings ───────────── */
// Check the console on load: "[Paint] materials" lists every material name.
// If the wrong part gets painted, put the exact body material name(s) here,
// e.g. ["Body"]. null = auto-detect.
const PAINT_MATERIALS = null;
const PAINT_INCLUDE = /(body|paint|carpaint|exterior|coat|lacquer)/i;
const PAINT_EXCLUDE =
  /(glass|window|tire|tyre|rubber|rim|wheel|brake|light|lamp|logo|grid|mech|spring|mirror|chrome|interior|seat|leather|carbon|plane|text|font|metal|black|disc|caliper)/i;
const PAINT_SECONDS = 1.8; // sweep duration (keep in sync with the CSS background transition)
const PAINT_GLOW = 1.4; // brightness of the glowing leading edge
const PAINT_SOFTNESS = 0.16; // edge softness as a fraction of car length

/* ───────────── Helpers ───────────── */
const easeInOutQuart = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

const _target = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _c = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function visibleDeep(n) {
  for (let o = n; o; o = o.parent) if (!o.visible) return false;
  return true;
}

function findPaintMaterials(scene) {
  const counts = new Map();
  scene.traverse((n) => {
    if (!n.isMesh || !visibleDeep(n)) return;
    const mats = Array.isArray(n.material) ? n.material : [n.material];
    const verts = n.geometry?.attributes?.position?.count ?? 0;
    mats.forEach((m) => m && counts.set(m, (counts.get(m) || 0) + verts));
  });
  const all = [...counts.keys()];

  let picked;
  if (PAINT_MATERIALS) {
    picked = all.filter((m) => PAINT_MATERIALS.includes(m.name));
  } else {
    picked = all.filter(
      (m) => PAINT_INCLUDE.test(m.name) && !/glass|window/i.test(m.name),
    );
    if (!picked.length) {
      // fallback: biggest non-excluded material is almost always the body
      picked = all
        .filter((m) => !PAINT_EXCLUDE.test(m.name))
        .sort((a, b) => counts.get(b) - counts.get(a))
        .slice(0, 1);
    }
  }

  console.info(
    "[Paint] materials:",
    all.map((m) => `${m.name || "(unnamed)"} (${counts.get(m)} verts)`),
    "→ painting:",
    picked.map((m) => m.name || "(unnamed)"),
  );
  return picked;
}

function makePaintUniforms() {
  return {
    uFrom: { value: new THREE.Color() },
    uTo: { value: new THREE.Color() },
    uProgress: { value: 1 },
    uDir: { value: new THREE.Vector3(0, 0, 1) },
    uOrigin: { value: new THREE.Vector3() },
    uMin: { value: -2 },
    uMax: { value: 2 },
    uSoft: { value: 0.5 },
    uGlow: { value: PAINT_GLOW },
  };
}

// Injects a world-space "paint wipe" into MeshStandard/Physical materials.
function patchPaint(U) {
  return (shader) => {
    Object.assign(shader.uniforms, U);

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPaintW;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvPaintW = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec3 vPaintW;
         uniform vec3 uFrom;
         uniform vec3 uTo;
         uniform float uProgress;
         uniform vec3 uDir;
         uniform vec3 uOrigin;
         uniform float uMin;
         uniform float uMax;
         uniform float uSoft;
         uniform float uGlow;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         {
           float t = dot(vPaintW - uOrigin, uDir);
           float front = mix(uMin - uSoft, uMax + uSoft, uProgress);
           float m = 1.0 - smoothstep(front - uSoft, front + uSoft, t);
           diffuseColor.rgb = mix(uFrom, uTo, m);

           float band = exp(-pow((t - front) / (uSoft * 0.55), 2.0));
           float env = sin(uProgress * 3.14159265);
           totalEmissiveRadiance += mix(uTo, vec3(1.0), 0.35) * band * env * uGlow;
         }`,
      );
  };
}

function buildWheelRig(scene) {
  const tires = {};
  for (const [key, name] of Object.entries(WHEELS)) {
    const node = scene.getObjectByName(safeName(name));
    if (!node) {
      console.warn("[Wheels] missing node:", name, "→", safeName(name));
      return null;
    }
    tires[key] = node;
  }

  scene.updateWorldMatrix(true, true);
  const wp = (n) => n.getWorldPosition(new THREE.Vector3());

  const front = wp(tires.FL).add(wp(tires.FR)).multiplyScalar(0.5);
  const rear = wp(tires.RL).add(wp(tires.RR)).multiplyScalar(0.5);
  const forward = front.sub(rear).setY(0).normalize();

  const axleWorld = wp(tires.FR).sub(wp(tires.FL)).setY(0).normalize();

  const rollDir = new THREE.Vector3().crossVectors(UP, forward);
  const sign = axleWorld.dot(rollDir) >= 0 ? 1 : -1;

  const radius =
    new THREE.Box3().setFromObject(tires.FL).getSize(new THREE.Vector3()).y / 2;

  const spinners = [];
  Object.values(tires).forEach((tire) => {
    let nodes = [tire];
    if (KEEP_CALIPERS_STILL) {
      const kids = tire.children.filter(
        (c) => !c.name.startsWith("Brake") || c.name.startsWith("BrakeDisc"),
      );
      if (kids.length) nodes = kids;
    }
    nodes.forEach((node) => {
      node.parent.getWorldQuaternion(_pq);
      const axis = axleWorld
        .clone()
        .applyQuaternion(_pq.clone().invert())
        .normalize();
      spinners.push({ node, axis, base: node.quaternion.clone() });
    });
  });

  return { forward, sign, radius, spinners };
}

/* ───────────── Component ───────────── */
function CarModel({ url = "/models/ferrari.glb", paint = null, ...props }) {
  const { scene: original } = useGLTF(url);
  const scene = useMemo(() => original.clone(true), [original]);

  const groupRef = useRef();
  const groupBase = useRef(new THREE.Vector3());
  const partsRef = useRef([]);
  const rigRef = useRef(null);
  const scrollTarget = useRef(0);
  const scrollSmooth = useRef(0);
  const [hovered, setHovered] = useState(false);

  const paintU = useRef(null);
  if (!paintU.current) paintU.current = makePaintUniforms();
  const paintState = useRef({
    ready: false,
    original: new THREE.Color(),
    t: 1,
  });

  // never leave a stuck pointer cursor behind if we unmount while hovered
  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);

  useEffect(() => {
    const onScroll = () => {
      scrollTarget.current = THREE.MathUtils.clamp(
        window.scrollY / (window.innerHeight * HERO_SCROLL_VIEWPORTS),
        0,
        1,
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Setup: hide leftovers, shadows, explode parts, wheel rig, paint
  useLayoutEffect(() => {
    scene.traverse((node) => {
      const n = node.name.toLowerCase();

      if (n.includes("plane") || n.includes("text") || n.includes("font")) {
        node.visible = false;
        node.raycast = () => null;
        return;
      }

      if (node.isMesh) {
        const matName = (node.material?.name || "").toLowerCase();
        const isGlass =
          matName.includes("glass") || matName.includes("windows");
        node.castShadow = !isGlass;
        node.receiveShadow = false;
      }
    });

    partsRef.current = HOVER_EXPLODE_MAP.map((entry) => {
      const node = scene.getObjectByName(safeName(entry.name));
      if (!node) {
        console.warn(
          "[Explode] missing node:",
          entry.name,
          "→",
          safeName(entry.name),
        );
        return null;
      }
      return {
        node,
        basePos: node.position.clone(),
        offset: new THREE.Vector3(...entry.offset),
      };
    }).filter(Boolean);

    if (groupRef.current) groupBase.current.copy(groupRef.current.position);
    rigRef.current = buildWheelRig(scene);

    /* ── car footprint, so the FERRARI letters can react ── */
    scene.updateWorldMatrix(true, true);
    {
      const fbox = new THREE.Box3();
      const ftmp = new THREE.Box3();
      scene.traverse((n) => {
        if (n.isMesh && visibleDeep(n)) fbox.union(ftmp.setFromObject(n));
      });
      const centre = fbox.getCenter(new THREE.Vector3());
      const o = new THREE.Vector3();
      groupRef.current?.getWorldPosition(o);
      carTrack.offset.copy(centre).sub(o).setY(0);
      const sz = fbox.getSize(new THREE.Vector3());
      carTrack.radius = Math.max(sz.x, sz.z) * 0.35;
      carTrack.ready = false; // switched on by useFrame after the first position is published
    }

    /* ── paint setup ── */
    const U = paintU.current;
    const ps = paintState.current;
    const clones = [];
    const found = findPaintMaterials(scene);

    if (found.length) {
      // clone so we never mutate the cached GLTF materials
      const swap = new Map();
      found.forEach((m) => {
        const c = m.clone();
        c.customProgramCacheKey = () => "ferrari-paint-sweep";
        c.onBeforeCompile = patchPaint(U);
        c.needsUpdate = true;
        swap.set(m, c);
        clones.push(c);
      });
      scene.traverse((n) => {
        if (!n.isMesh) return;
        n.material = Array.isArray(n.material)
          ? n.material.map((m) => swap.get(m) || m)
          : swap.get(n.material) || n.material;
      });

      ps.original.copy(found[0].color);
      U.uFrom.value.copy(ps.original);
      U.uTo.value.copy(ps.original);
      U.uProgress.value = 1;
      ps.t = 1;

      // sweep direction = the car's nose direction; range = car length
      const dir = rigRef.current
        ? rigRef.current.forward
        : new THREE.Vector3(0, 0, 1);
      U.uDir.value.copy(dir);

      scene.updateWorldMatrix(true, true);
      const origin = new THREE.Vector3();
      groupRef.current?.getWorldPosition(origin);
      const box = new THREE.Box3();
      const b = new THREE.Box3();
      scene.traverse((n) => {
        if (n.isMesh && visibleDeep(n)) box.union(b.setFromObject(n));
      });
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < 8; i++) {
        _c.set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z,
        );
        const t = _c.sub(origin).dot(dir);
        min = Math.min(min, t);
        max = Math.max(max, t);
      }
      U.uMin.value = min;
      U.uMax.value = max;
      U.uSoft.value = (max - min) * PAINT_SOFTNESS;
      ps.ready = true;
    } else {
      console.warn("[Paint] no paint material found. Set PAINT_MATERIALS.");
      ps.ready = false;
    }


    return () => {
      carTrack.ready = false;
      clones.forEach((c) => c.dispose());
    };
  }, [scene]);

  // Start a sweep whenever the paint prop changes
  useEffect(() => {
    const ps = paintState.current;
    if (!ps.ready) return;
    const U = paintU.current;
    const to = paint ? new THREE.Color(paint) : ps.original;
    if (U.uTo.value.equals(to)) return;

    // freeze whatever is currently dominant as the "from" color
    if (ps.t >= 1 || U.uProgress.value > 0.5) U.uFrom.value.copy(U.uTo.value);
    U.uTo.value.copy(to);
    U.uProgress.value = 0;
    ps.t = 0;
  }, [paint, scene]);

  useFrame((_, delta) => {
    // ── Paint sweep ──
    const U = paintU.current;
    const ps = paintState.current;
    if (ps.t < 1) {
      ps.t = Math.min(1, ps.t + delta / PAINT_SECONDS);
      U.uProgress.value = easeInOutQuart(ps.t);
      if (ps.t >= 1) {
        U.uProgress.value = 1;
        U.uFrom.value.copy(U.uTo.value);
      }
    }
    if (groupRef.current) groupRef.current.getWorldPosition(U.uOrigin.value);
    // ── publish car position for the letters ──
    if (groupRef.current) {
      groupRef.current.getWorldPosition(carTrack.pos);
      carTrack.pos.add(carTrack.offset);
      carTrack.ready = true;
    }

    // ── Smooth scroll ──
    scrollSmooth.current = THREE.MathUtils.damp(
      scrollSmooth.current,
      scrollTarget.current,
      4,
      delta,
    );

    // ── Drive + roll wheels ──
    const rig = rigRef.current;
    if (rig && groupRef.current) {
      const d = scrollSmooth.current * DRIVE_DISTANCE * DIR;

      groupRef.current.position
        .copy(rig.forward)
        .multiplyScalar(d)
        .add(groupBase.current);

      const angle = (rig.sign * d) / rig.radius;
      for (const s of rig.spinners) {
        _q.setFromAxisAngle(s.axis, angle);
        s.node.quaternion.copy(s.base).premultiply(_q);
      }
    }

    // ── Hover explode ──
    const amount = hovered ? 1 : 0;
    for (const { node, basePos, offset } of partsRef.current) {
      _target.copy(basePos).addScaledVector(offset, amount);
      node.position.x = THREE.MathUtils.damp(
        node.position.x,
        _target.x,
        6,
        delta,
      );
      node.position.y = THREE.MathUtils.damp(
        node.position.y,
        _target.y,
        6,
        delta,
      );
      node.position.z = THREE.MathUtils.damp(
        node.position.z,
        _target.z,
        6,
        delta,
      );
    }
  });

  return (
    <group
      ref={groupRef}
      {...props}
      onPointerEnter={(e) => {
        e.stopPropagation();
        if (IS_COARSE) return; // no hover-explode on touch
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/ferrari.glb");

export default CarModel;
