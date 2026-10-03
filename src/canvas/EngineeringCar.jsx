import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EXPLODE_MAP, safeName } from "./explodeConfig";
import { cloneScene } from "../utils/cloneScene";

const smoothstep = (e0, e1, x) => {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

function EngineeringCar({ progressRef, ...props }) {
  const { scene } = useGLTF("/models/ferrari.glb");

  // Own, independent copy — this file and Hero's CarModel both load the
  // same .glb. Without cloning, they'd mutate the same nodes every frame.
  const cloned = useMemo(() => cloneScene(scene), [scene]);

  const { camera, size } = useThree();

  const groupRef = useRef();
  const partsRef = useRef([]);
  const smoothed = useRef(0);
  const frame = useRef(null);

  useLayoutEffect(() => {
    cloned.traverse((node) => {
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
      const node = cloned.getObjectByName(safeName(entry.name));
      if (!node) {
        console.warn("[Engineering] missing node:", entry.name, "→", safeName(entry.name));
        return null;
      }
      return {
        node,
        basePos: node.position.clone(),
        offset: new THREE.Vector3(...entry.offset),
        range: entry.range || [0, 1],
      };
    }).filter(Boolean);

    partsRef.current = resolved;

    // Bounding box from VISIBLE meshes only — ferrari.glb contains a hidden
    // ground plane + text mesh as top-level siblings of the car (leftover
    // from the Blender export). Box3().setFromObject() ignores `.visible`,
    // so without this manual pass the box was including that huge hidden
    // plane and inflating the camera distance.
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3();
    cloned.traverse((node) => {
      if (!node.visible || !node.isMesh || !node.geometry) return;
      if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
      box.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
    });
    resolved.forEach(({ basePos, offset }) => box.expandByPoint(basePos.clone().add(offset)));
    if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(4, 2, 5));

    frame.current = { box, center: box.getCenter(new THREE.Vector3()) };
  }, [cloned]);

  useLayoutEffect(() => {
    if (!frame.current || !camera.isPerspectiveCamera || size.width === 0) return;

    const { box, center } = frame.current;
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);

    const dir = new THREE.Vector3(0.55, 0.32, 1).normalize();
    const forward = dir.clone().negate();
    const worldUp = new THREE.Vector3(0, 1, 0);
    let right = new THREE.Vector3().crossVectors(forward, worldUp);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const camUp = new THREE.Vector3().crossVectors(right, forward).normalize();

    const projHalfWidth = Math.abs(right.x) * half.x + Math.abs(right.y) * half.y + Math.abs(right.z) * half.z;
    const projHalfHeight = Math.abs(camUp.x) * half.x + Math.abs(camUp.y) * half.y + Math.abs(camUp.z) * half.z;

    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);

    const margin = 1.35;
    let distance = Math.max(projHalfHeight / Math.tan(vFov / 2), projHalfWidth / Math.tan(hFov / 2)) * margin;
    if (!Number.isFinite(distance) || distance <= 0.01) distance = 6;

    camera.position.copy(center).addScaledVector(dir, distance);
    camera.lookAt(center);
    camera.near = Math.max(0.05, distance * 0.05);
    camera.far = distance * 8 + 10;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

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

    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.degToRad(-18) + amount * 0.55;
    }
  });

  return (
    <group ref={groupRef} {...props}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload("/models/ferrari.glb");
export default EngineeringCar;
