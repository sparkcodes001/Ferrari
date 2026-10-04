import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { carTrack } from "./carTrack";
import useStore from "../../store/useStore";

const WORD = "FERRARI";
const FONT_SIZE = 5.5;
const GAP = FONT_SIZE * 0.07;
const BLEED = 1.06;

/* ── car-pass reaction (tune these) ── */
const SINK_DEPTH = 2.2; // how far a letter drops when the car is over it
const SINK_INNER = 0.6; // full sink within this × letter half-width of the car
const SINK_REACH = 1.4; // × car radius: how far the falloff extends
const SINK_SPEED = 9; // damping: higher = snappier

const BASE_COLOR = new THREE.Color("#1e2126");
const HOVER_COLOR = new THREE.Color("#e11d48");
const _w = new THREE.Vector3();

function Letter({ char, index, x, onMeasure }) {
  const meshRef = useRef();
  const inkRef = useRef([0, 0]);
  const [hovered, setHovered] = useState(false);

  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);

  useEffect(() => {
    if (meshRef.current?.material)
      meshRef.current.material.color.copy(BASE_COLOR);
  }, []);

  useFrame((_, delta) => {
    const m = meshRef.current;
    if (!m) return;

    let near = 0;
    const [minX, maxX] = inkRef.current;
    if (carTrack.ready && maxX > minX) {
      _w.set((minX + maxX) / 2, 0, 0);
      m.localToWorld(_w);
      const halfW = ((maxX - minX) / 2) * m.matrixWorld.getMaxScaleOnAxis();
      const d = Math.hypot(_w.x - carTrack.pos.x, _w.z - carTrack.pos.z);
      const inner = halfW * SINK_INNER;
      near =
        1 -
        THREE.MathUtils.smoothstep(
          d,
          inner,
          inner + carTrack.radius * SINK_REACH,
        );
    }

    const targetZ = Math.min(hovered ? -2.2 : 0, -SINK_DEPTH * near);
    m.position.z = THREE.MathUtils.damp(
      m.position.z,
      targetZ,
      SINK_SPEED,
      delta,
    );
    m.material.color.lerp(hovered ? HOVER_COLOR : BASE_COLOR, 0.12);
  });

  return (
    <Text
      ref={meshRef}
      font="/fonts/Syncopate-Bold.ttf"
      fontSize={FONT_SIZE}
      anchorX="left"
      anchorY="middle"
      position={[x, 0, 0]}
      onSync={(troika) => {
        const info = troika.textRenderInfo;
        const b = info && (info.visibleBounds || info.blockBounds);
        if (b) {
          inkRef.current = [b[0], b[2]];
          onMeasure(index, b[0], b[2]);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {char}
    </Text>
  );
}

function HeroText({ position = [-8, 0.082, 2.6] }) {
  const camera = useThree((s) => s.camera);
  const viewport = useThree((s) => s.viewport);
  const size = useThree((s) => s.size);
  const letters = WORD.split("");

  const [bounds, setBounds] = useState({});
  const onMeasure = useCallback((i, min, max) => {
    setBounds((prev) => {
      const p = prev[i];
      if (p && Math.abs(p[0] - min) < 1e-4 && Math.abs(p[1] - max) < 1e-4)
        return prev;
      return { ...prev, [i]: [min, max] };
    });
  }, []);

  const ready = letters.every((_, i) => bounds[i]);

  useEffect(() => {
    if (ready) useStore.getState().setTextReady(true);
  }, [ready]);

  const layout = useMemo(() => {
    if (!ready) return null;
    let cursor = 0;
    const xs = letters.map((_, i) => {
      const [min, max] = bounds[i];
      const x = cursor - min;
      cursor += max - min + GAP;
      return x;
    });
    return { xs, total: cursor - GAP };
    // eslint-disable-next-line
  }, [ready, bounds]);

  const scale = useMemo(() => {
    if (!layout) return 1;
    const vp = viewport.getCurrentViewport(
      camera,
      new THREE.Vector3(position[0], position[1], position[2]),
    );
    return (vp.width * BLEED) / layout.total;
    // eslint-disable-next-line
  }, [layout, viewport, camera, size, position[0], position[1], position[2]]);

  return (
    <group
      position={position}
      rotation={[-Math.PI / 2, 0, 4.5]}
      visible={ready}
      onPointerOver={(e) => e.stopPropagation()}
      onPointerOut={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
    >
      <group scale={scale}>
        <group position={[layout ? -layout.total / 2 : 0, 0, 0]}>
          {letters.map((char, i) => (
            <Letter
              key={i}
              char={char}
              index={i}
              x={layout ? layout.xs[i] : 0}
              onMeasure={onMeasure}
            />
          ))}
        </group>
      </group>
    </group>
  );
}

export default HeroText;
