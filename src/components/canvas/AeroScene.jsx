import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGLTF, Environment, Lightformer, Grid } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cloneScene } from "../../utils/cloneScene";
import { IS_COARSE } from "../../utils/device";
import { makeFlow, seedStream, flowPoint, smooth01 } from "../../utils/aeroFlow";
import { AERO_STAGES, AERO_CAMERA, windAt } from "../../data/aero";

const COOL = new THREE.Color("#7fb6ff");
const HOT = new THREE.Color("#ff3a2c");

/* ───────────── the car, repainted as a dark "wind-tunnel model" ───────────── */
function AeroCar({ onReady }) {
  const { scene } = useGLTF("/models/ferrari.glb");
  // own copy: Hero's CarModel and Engineering's car use the same GLB
  const cloned = useMemo(() => cloneScene(scene), [scene]);

  const mats = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({
        color: "#15171b", metalness: 0.75, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.25,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#090b0e", roughness: 0.05, transparent: true, opacity: 0.6,
      }),
      dark: new THREE.MeshStandardMaterial({ color: "#08090a", roughness: 0.85, metalness: 0.2 }),
    }),
    [],
  );
  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  useLayoutEffect(() => {
    const pick = (m) => {
      const n = (m?.name || "").toLowerCase();
      if (/glass|window/.test(n)) return mats.glass;
      if (/tire|tyre|rubber/.test(n)) return mats.dark;
      return mats.body;
    };
    cloned.traverse((node) => {
      const n = node.name.toLowerCase();
      if (n.includes("plane") || n.includes("text") || n.includes("font")) {
        node.visible = false;
        node.raycast = () => null;
        return;
      }
      if (node.isMesh) {
        node.material = Array.isArray(node.material) ? node.material.map(pick) : pick(node.material);
        node.castShadow = false;
        node.receiveShadow = false;
      }
    });

    // bounds from VISIBLE meshes only (the glb carries a hidden ground plane)
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3();
    cloned.traverse((node) => {
      if (!node.visible || !node.isMesh || !node.geometry) return;
      if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
      box.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
    });
    if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(2, 1.3, 5));
    const center = box.getCenter(new THREE.Vector3());
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    onReady({ box, center, half, groundY: box.min.y });
  }, [cloned, mats, onReady]);

  return <primitive object={cloned} />;
}

/* ───────────── streamlines ─────────────
   N particles, each drawn as a K-point trail. A trail is just the same streamline sampled at
   K positions behind the head, so nothing needs a history buffer. */
function Streamlines({ info, progressRef, zoneRef }) {
  const N = IS_COARSE ? 380 : 800;
  const K = 12;
  const F = useMemo(() => makeFlow(info), [info]);

  const data = useMemo(() => {
    const rnd = Math.random;
    const seeds = Array.from({ length: N }, () => seedStream(F, rnd));
    const head = new Float32Array(N);
    const mul = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      head[i] = F.zStart + rnd() * (F.zEnd - F.zStart);
      mul[i] = 0.8 + rnd() * 0.45;
    }
    const pos = new Float32Array(N * K * 3);
    const col = new Float32Array(N * K * 3);
    const index = new Uint32Array(N * (K - 1) * 2);
    let w = 0;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < K - 1; j++) {
        index[w++] = i * K + j;
        index[w++] = i * K + j + 1;
      }
    const geo = new THREE.BufferGeometry();
    const pa = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
    const ca = new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", pa);
    geo.setAttribute("color", ca);
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    return { seeds, head, mul, pos, col, pa, ca, geo };
  }, [N, F]);

  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  useLayoutEffect(
    () => () => {
      data.geo.dispose();
      mat.dispose();
    },
    [data, mat],
  );

  const smoothU = useRef(windAt(0));
  const tmp = useMemo(() => [0, 0], []);
  const c = useMemo(() => new THREE.Color(), []);
  const spacing = F.L * 0.035;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    smoothU.current = THREE.MathUtils.damp(smoothU.current, windAt(progressRef.current), 3, dt);
    const adv = smoothU.current * F.L * 0.9 * dt;
    const zone = zoneRef.current;
    const { seeds, head, mul, pos, col } = data;

    for (let i = 0; i < N; i++) {
      let zh = head[i] + adv * mul[i];
      if (zh - (K - 1) * spacing > F.zEnd) zh = F.zStart + (zh - F.zEnd);
      head[i] = zh;
      const s = seeds[i];
      for (let j = 0; j < K; j++) {
        const zz = zh - j * spacing;
        const heat = flowPoint(F, s, zz, t, tmp);
        const o = (i * K + j) * 3;
        pos[o] = tmp[0];
        pos[o + 1] = tmp[1];
        pos[o + 2] = zz;

        // brightness: fades along the trail, brighter near the body, focused on the active zone
        let boost = 0.75;
        if (zone) {
          const tz = (zz - F.cz) / F.L + 0.5; // 0 nose → 1 tail
          const band = smooth01((tz - zone[0] + 0.06) / 0.1) * (1 - smooth01((tz - zone[1] - 0.04) / 0.1));
          boost = 0.18 + 1.0 * band;
        }
        const fade = Math.pow(1 - j / (K - 1), 1.3);
        const k = fade * boost * (0.45 + 0.75 * heat);
        c.copy(COOL).lerp(HOT, heat * heat);
        col[o] = c.r * k;
        col[o + 1] = c.g * k;
        col[o + 2] = c.b * k;
      }
    }
    data.pa.needsUpdate = true;
    data.ca.needsUpdate = true;
  });

  return <lineSegments geometry={data.geo} material={mat} frustumCulled={false} />;
}

/* ───────────── camera + on-screen labels ───────────── */
function sampleCamera(p) {
  const K = AERO_CAMERA;
  if (p <= K[0].p) return K[0];
  for (let i = 0; i < K.length - 1; i++) {
    if (p <= K[i + 1].p) {
      const t = smooth01((p - K[i].p) / (K[i + 1].p - K[i].p));
      return {
        az: THREE.MathUtils.lerp(K[i].az, K[i + 1].az, t),
        el: THREE.MathUtils.lerp(K[i].el, K[i + 1].el, t),
        d: THREE.MathUtils.lerp(K[i].d, K[i + 1].d, t),
      };
    }
  }
  return K[K.length - 1];
}

function Director({ info, progressRef, hotRefs }) {
  const { camera, size } = useThree();
  const cur = useRef(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => info.center.clone(), [info]);

  // distance that fits the car in either orientation of screen
  const R0 = useMemo(() => {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const aspect = size.width / Math.max(size.height, 1);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const need = Math.max(
      (info.half.z * 1.15) / Math.tan(hFov / 2),
      (info.half.y * 2.4) / Math.tan(vFov / 2),
    );
    return need * 1.3;
  }, [camera, size.width, size.height, info]);

  const anchors = useMemo(
    () =>
      AERO_STAGES.map((s) => {
        if (!s.anchor) return null;
        const { min, max } = info.box;
        return new THREE.Vector3(
          min.x + (max.x - min.x) * s.anchor[0],
          min.y + (max.y - min.y) * s.anchor[1],
          min.z + (max.z - min.z) * s.anchor[2],
        );
      }),
    [info],
  );

  useFrame((_, delta) => {
    const p = progressRef.current;
    const k = sampleCamera(p);
    if (!cur.current) cur.current = { ...k };
    const s = cur.current;
    s.az = THREE.MathUtils.damp(s.az, k.az, 3, delta);
    s.el = THREE.MathUtils.damp(s.el, k.el, 3, delta);
    s.d = THREE.MathUtils.damp(s.d, k.d, 3, delta);

    const r = R0 * s.d;
    camera.position.set(
      target.x + Math.sin(s.az) * Math.cos(s.el) * r,
      target.y + Math.sin(s.el) * r,
      target.z - Math.cos(s.az) * Math.cos(s.el) * r,
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();

    // labels follow their part of the car
    AERO_STAGES.forEach((stage, i) => {
      const el = hotRefs.current[i];
      const a = anchors[i];
      if (!el || !a) return;
      const [r0, r1] = stage.range;
      let vis = smooth01((p - r0) / 0.05) * (1 - smooth01((p - (r1 - 0.05)) / 0.05));
      if (vis > 0.002) {
        v.copy(a).project(camera);
        if (v.z > 1) vis = 0;
        const x = (v.x * 0.5 + 0.5) * size.width;
        const y = (-v.y * 0.5 + 0.5) * size.height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
      el.style.opacity = vis.toFixed(3);
      el.style.visibility = vis <= 0.002 ? "hidden" : "visible";
    });
  });
  return null;
}

/* ───────────── scene ───────────── */
export default function AeroScene({ progressRef, zoneRef, hotRefs }) {
  const [info, setInfo] = useState(null);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 9, 4]} intensity={1.1} />
      <directionalLight position={[-6, 3, -5]} intensity={0.5} color="#ff4a3a" />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 18, 1]} />
        <Lightformer intensity={1.2} position={[-9, 4, 5]} rotation={[0, Math.PI / 2.6, 0]} scale={[14, 6, 1]} />
        <Lightformer intensity={1.2} position={[9, 4, 5]} rotation={[0, -Math.PI / 2.6, 0]} scale={[14, 6, 1]} />
      </Environment>

      <AeroCar onReady={setInfo} />

      {info && (
        <>
          <Grid
            position={[0, info.groundY - 0.005, 0]}
            args={[40, 40]}
            cellSize={0.5}
            cellThickness={0.5}
            sectionSize={2.5}
            sectionThickness={1}
            cellColor="#23262b"
            sectionColor="#3a4a66"
            fadeDistance={18}
            fadeStrength={1.6}
            infiniteGrid
          />
          <Streamlines info={info} progressRef={progressRef} zoneRef={zoneRef} />
          <Director info={info} progressRef={progressRef} hotRefs={hotRefs} />
        </>
      )}
    </>
  );
}

useGLTF.preload("/models/ferrari.glb");
