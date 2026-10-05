import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  ContactShadows,
  SoftShadows,
} from "@react-three/drei";
import * as THREE from "three";
import { IS_COARSE } from "../../utils/device";

import { CAR_TARGET, CAM_POSITION, DESKTOP_FOV, heroFov } from "../../config/camera";

// A spotlight's target must be IN the scene for its matrix to update,
// otherwise it silently keeps pointing at the origin.
function Headlight({ position, aim }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...aim);
    return o;
  }, [aim]);
  return (
    <>
      <spotLight
        position={position}
        target={target}
        intensity={12}
        angle={Math.PI / 4}
        penumbra={0.6}
        color="#fff6e0"
      />
      <primitive object={target} />
    </>
  );
}
const HEADLIGHTS = [
  { position: [-2.6, 1.7, 5.4], aim: [-2.6, 0.2, 12] },
  { position: [-1.2, 1.7, 5.4], aim: [-1.2, 0.2, 12] },
];

function Scene({ children, headlightsOn = false, active = true }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      shadows="soft"
      camera={{ position: CAM_POSITION, fov: DESKTOP_FOV }}
      // The canvas lives in a sticky stage: re-measuring it on every scroll
      // can resize it by a pixel and wipe the drawing buffer (visible blink).
      resize={{ scroll: false }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        powerPreference: "high-performance",
      }}
      dpr={IS_COARSE ? [1, 1.25] : [1, 1.5]}
      onCreated={({ camera, gl, size }) => {
        camera.fov = heroFov(size.width / size.height);
        camera.updateProjectionMatrix();
        camera.lookAt(CAR_TARGET);
        gl.setClearColor(0x000000, 0);
        // preventDefault is what lets the browser restore a lost context
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
      }}
    >
      {/* soft, diffused shadow edge. If you ever see artifacts, delete this one line. */}
      {!IS_COARSE && <SoftShadows size={18} samples={12} focus={0.4} />}

      <ambientLight intensity={0.4} />

      <directionalLight
        position={[6, 14, 5]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={IS_COARSE ? 1024 : 2048}
        shadow-mapSize-height={IS_COARSE ? 1024 : 2048}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />

      {headlightsOn &&
        HEADLIGHTS.map((h, i) => <Headlight key={i} position={h.position} aim={h.aim} />)}

      {/* second scene render per frame: kept cheap (256 + heavy blur hides the resolution) */}
      <ContactShadows
        position={[-1.921, 0.085, 3.727]}
        opacity={0.35}
        scale={22}
        blur={3}
        far={5}
        resolution={256}
        color="#5a3d00"
      />

      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 10, -5]} scale={[20, 20, 1]} />
        <Lightformer intensity={1.5} position={[-10, 5, 5]} scale={[15, 8, 1]} />
        <Lightformer intensity={1.5} position={[10, 5, 5]} scale={[15, 8, 1]} />
      </Environment>

      {children}
    </Canvas>
  );
}

export default Scene;
