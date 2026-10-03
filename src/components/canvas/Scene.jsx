import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
  SoftShadows,
} from "@react-three/drei";
import * as THREE from "three";

const CAR_TARGET = new THREE.Vector3(-1.921, 1.44, 3.727);
const CAM_POSITION = [-23.545, 35.709, -0.932];

function Scene({ children, debug = false, headlightsOn, active = true }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      shadows="soft"
      camera={{ position: CAM_POSITION, fov: 23 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        powerPreference: "high-performance",
      }}
      dpr={[1, 1.5]}
      onCreated={({ camera, gl }) => {
        camera.lookAt(CAR_TARGET);
        gl.setClearColor(0x000000, 0);
      }}
    >
      {/* soft, diffused shadow edge. If you ever see artifacts, delete this one line. */}
      <SoftShadows size={18} samples={12} focus={0.4} />

      <ambientLight intensity={0.4} />

      <directionalLight
        position={[6, 14, 5]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />

      {headlightsOn && (
        <>
          <spotLight
            position={[-2.6, 1.7, 5.4]}
            target-position={[-2.6, 0.2, 12]}
            intensity={12}
            angle={Math.PI / 4}
            penumbra={0.6}
            color="#fff6e0"
          />
          <spotLight
            position={[-1.2, 1.7, 5.4]}
            target-position={[-1.2, 0.2, 12]}
            intensity={12}
            angle={Math.PI / 4}
            penumbra={0.6}
            color="#fff6e0"
          />
        </>
      )}

      <ContactShadows
        position={[-1.921, 0.085, 3.727]}
        opacity={0.35}
        scale={22}
        blur={3}
        far={5}
        color="#5a3d00"
      />

      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 10, -5]} scale={[20, 20, 1]} />
        <Lightformer
          intensity={1.5}
          position={[-10, 5, 5]}
          scale={[15, 8, 1]}
        />
        <Lightformer intensity={1.5} position={[10, 5, 5]} scale={[15, 8, 1]} />
      </Environment>

      {children}
      {debug && <OrbitControls target={CAR_TARGET} makeDefault />}
    </Canvas>
  );
}

export default Scene;