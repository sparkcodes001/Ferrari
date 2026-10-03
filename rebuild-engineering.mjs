import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  console.log("✓ wrote", path);
}

/* ── 1. explodeConfig.js ───────────────────────────────── */
write(
  "src/canvas/explodeConfig.js",
  `import * as THREE from "three";

export const safeName = (name) => THREE.PropertyBinding.sanitizeNodeName(name);

export const EXPLODE_MAP = [
  { name: "GlassMain_14", label: "CANOPY GLASS", offset: [0, 1.3, 0], range: [0.04, 0.3] },
  { name: "GlassBack_18", label: null, offset: [0, 1.0, 0.5], range: [0.04, 0.3] },
  { name: "GlassOther_3", label: null, offset: [0, 0.8, 0], range: [0.04, 0.3] },

  { name: "Body_9", label: "MONOCOQUE SHELL · ALUMINUM-CARBON", offset: [0, 2.6, -1.6], range: [0.14, 0.58] },

  { name: "Tire.001_22", label: "FRONT-LEFT · PIRELLI P ZERO", offset: [-1.5, -0.2, -0.7], range: [0.3, 0.66] },
  { name: "Tire.002_26", label: null, offset: [-1.5, -0.2, 0.7], range: [0.3, 0.66] },
  { name: "Tire.003_30", label: null, offset: [1.5, -0.2, -0.7], range: [0.3, 0.66] },
  { name: "Tire.004_34", label: null, offset: [1.5, -0.2, 0.7], range: [0.3, 0.66] },

  { name: "Rims_21", label: "FORGED ALLOY WHEEL", offset: [-0.6, 0, 0], range: [0.34, 0.7] },
  { name: "Rims.002_25", label: null, offset: [-0.6, 0, 0], range: [0.34, 0.7] },
  { name: "Rims.001_29", label: null, offset: [0.6, 0, 0], range: [0.34, 0.7] },
  { name: "Rims.003_33", label: null, offset: [0.6, 0, 0], range: [0.34, 0.7] },

  { name: "Brake_19", label: "BREMBO CARBON-CERAMIC", offset: [0.3, 0, 0], range: [0.36, 0.72] },
  { name: "Brake.001_23", label: null, offset: [0.3, 0, 0], range: [0.36, 0.72] },
  { name: "Brake.002_27", label: null, offset: [-0.3, 0, 0], range: [0.36, 0.72] },
  { name: "Brake.003_31", label: null, offset: [-0.3, 0, 0], range: [0.36, 0.72] },

  { name: "Headlights_17", label: "MATRIX LED HEADLIGHT", offset: [0, 0.3, -1.8], range: [0.46, 0.8] },
  { name: "Mirror_16", label: "AERO-TUNED MIRROR", offset: [0, 1.1, 0], range: [0.46, 0.8] },
  { name: "RearLight_7", label: "SIGNATURE TAIL LIGHT", offset: [0, 0.25, 1.6], range: [0.46, 0.8] },
  { name: "RedGlass_15", label: null, offset: [0, 0.25, 1.9], range: [0.46, 0.8] },
  { name: "Logos_5", label: null, offset: [0, 0.8, -0.4], range: [0.46, 0.8] },
  { name: "Grid_4", label: null, offset: [0, -0.3, -1.1], range: [0.46, 0.8] },

  { name: "Mechanics_6", label: "V12 · 6.5L · 830CV", offset: [0, -0.9, 0], range: [0.56, 0.92] },
  { name: "Springs_8", label: "SUSPENSION ASSEMBLY", offset: [0, -0.6, 0], range: [0.56, 0.92] },
];
`,
);

/* ── 2. EngineeringCar.jsx ─────────────────────────────── */
write(
  "src/canvas/EngineeringCar.jsx",
  `import { useGLTF, Html } from "@react-three/drei";
import { useLayoutEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EXPLODE_MAP, safeName } from "./explodeConfig";

const smoothstep = (e0, e1, x) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function EngineeringCar({ progressRef, ...props }) {
  const { scene } = useGLTF("/models/ferrari.glb");
  const { camera, size } = useThree();

  const groupRef = useRef();
  const partsRef = useRef([]);
  const labelRefs = useRef([]);
  const smoothed = useRef(0);
  const frame = useRef(null);
  const [labelParts, setLabelParts] = useState([]);

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
        const isGlass = matName.includes("glass") || matName.includes("windows");
        node.castShadow = !isGlass;
        node.receiveShadow = true;
      }
    });

    const resolved = EXPLODE_MAP.map((entry) => {
      const node = scene.getObjectByName(safeName(entry.name));
      if (!node) {
        console.warn("[Engineering] missing node:", entry.name, "→", safeName(entry.name));
        return null;
      }
      const offset = new THREE.Vector3(...entry.offset);
      return {
        node,
        label: entry.label,
        basePos: node.position.clone(),
        offset,
        range: entry.range || [0, 1],
        labelPos: node.position.clone().addScaledVector(offset, 1.08),
      };
    }).filter(Boolean);

    partsRef.current = resolved;
    setLabelParts(resolved.filter((p) => p.label));
    labelRefs.current = [];

    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    resolved.forEach(({ basePos, offset }) => {
      box.expandByPoint(basePos.clone().add(offset));
    });
    frame.current = box.getBoundingSphere(new THREE.Sphere());
  }, [scene]);

  useLayoutEffect(() => {
    if (!frame.current || !camera.isPerspectiveCamera) return;
    const margin = 1.45;
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const fov = Math.min(vFov, hFov);
    const distance = (frame.current.radius / Math.sin(fov / 2)) * margin;

    const dir = new THREE.Vector3(0.55, 0.32, 1).normalize();
    camera.position.copy(frame.current.center).addScaledVector(dir, distance);
    camera.lookAt(frame.current.center);
    camera.near = Math.max(0.1, distance - frame.current.radius * 3);
    camera.far = distance + frame.current.radius * 4;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, labelParts.length]);

  useFrame((_, delta) => {
    smoothed.current = THREE.MathUtils.damp(smoothed.current, progressRef.current, 4, delta);
    const amount = smoothed.current;

    for (const { node, basePos, offset, range } of partsRef.current) {
      const local = smoothstep(range[0], range[1], amount);
      node.position.set(
        basePos.x + offset.x * local,
        basePos.y + offset.y * local,
        basePos.z + offset.z * local
      );
    }

    labelParts.forEach((p, i) => {
      const el = labelRefs.current[i];
      if (!el) return;
      const [start, end] = p.range;
      const fadeStart = start + (end - start) * 0.45;
      const fade = smoothstep(fadeStart, end, amount);
      el.style.opacity = fade;
      el.style.transform = \`translateX(\${(1 - fade) * -10}px)\`;
    });

    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.degToRad(-18) + amount * 0.55;
    }
  });

  return (
    <group ref={groupRef} {...props}>
      <primitive object={scene} />
      {labelParts.map(({ label, labelPos }, i) => (
        <Html key={label} position={labelPos} center zIndexRange={[20, 0]} occlude="blending">
          <div
            ref={(el) => (labelRefs.current[i] = el)}
            className="flex items-center gap-2 whitespace-nowrap"
            style={{ opacity: 0, transition: "transform .3s ease" }}
          >
            <span className="font-mono text-[9px] text-red-500/80">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="h-px w-4 bg-red-500/70" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/90">
              {label}
            </span>
          </div>
        </Html>
      ))}
    </group>
  );
}

useGLTF.preload("/models/ferrari.glb");
export default EngineeringCar;
`,
);

/* ── 3. SectionHeader.jsx ──────────────────────────────── */
write(
  "src/components/ui/SectionHeader.jsx",
  `function SectionHeader({ index, label, coords, dark = true, className = "" }) {
  const tone = dark ? "text-white/40" : "text-black/40";
  return (
    <div
      className={\`pointer-events-none absolute left-6 right-6 top-6 z-30 flex justify-between font-mono text-[10px] tracking-[0.35em] md:left-10 md:right-10 md:top-10 \${tone} \${className}\`}
    >
      <span>({String(index).padStart(2, "0")}) — {label}</span>
      {coords && <span>{coords}</span>}
    </div>
  );
}

export default SectionHeader;
`,
);

/* ── 4. Engineering.jsx ────────────────────────────────── */
write(
  "src/components/sections/Engineering.jsx",
  `import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, ContactShadows } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionHeader from "../ui/SectionHeader";
import EngineeringCar from "../../canvas/EngineeringCar";

gsap.registerPlugin(ScrollTrigger);

function Engineering() {
  const sectionRef = useRef(null);
  const progressRef = useRef(0);
  const barRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=280%",
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          if (barRef.current) {
            barRef.current.style.transform = \`scaleX(\${self.progress})\`;
          }
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-black">
      <span className="pointer-events-none absolute -right-[2vw] bottom-[-6vw] z-0 select-none font-[Syncopate] text-[32vw] font-bold leading-none text-white/[0.025]">
        02
      </span>

      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 30, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        className="!absolute inset-0 z-10"
      >
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[6, 10, 4]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#8fd3ff" />
        <Environment resolution={256} preset="studio" />

        <Grid
          position={[0, -0.75, 0]}
          args={[40, 40]}
          cellSize={0.5}
          cellThickness={0.5}
          sectionSize={2.5}
          sectionThickness={1}
          cellColor="#2a2a2a"
          sectionColor="#e11d48"
          fadeDistance={22}
          fadeStrength={1.5}
          infiniteGrid
        />
        <ContactShadows position={[0, -0.74, 0]} opacity={0.5} scale={16} blur={2} far={4} />

        <EngineeringCar progressRef={progressRef} position={[0, -0.3, 0]} />
      </Canvas>

      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.65) 100%)" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-black/80 to-transparent" />

      <SectionHeader index={2} label="ENGINEERING" coords="V12 · 6.5L · 830CV" className="!top-24 md:!top-28" />

      {["left-6 top-24 border-l border-t md:left-10 md:top-28",
        "right-6 top-24 border-r border-t md:right-10 md:top-28",
        "left-6 bottom-20 border-l border-b md:left-10",
        "right-6 bottom-20 border-r border-b md:right-10"].map((pos, i) => (
        <span key={i} className={\`pointer-events-none absolute z-30 h-6 w-6 border-white/20 \${pos}\`} />
      ))}

      <div className="pointer-events-none absolute bottom-10 left-1/2 z-30 -translate-x-1/2 font-mono text-[10px] tracking-[0.35em] text-white/40">
        SCROLL TO DISASSEMBLE
      </div>

      <div className="pointer-events-none absolute inset-x-6 bottom-8 z-30 h-px bg-white/10 md:inset-x-10">
        <div ref={barRef} className="h-full origin-left scale-x-0 bg-red-600" />
      </div>
    </section>
  );
}

export default Engineering;
`,
);

console.log(
  "\\n✅ Engineering section rebuilt via Node (no bash/heredoc issues).",
);
