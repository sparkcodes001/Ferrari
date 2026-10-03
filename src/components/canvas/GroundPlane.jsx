// Invisible except where a shadow lands, so the CSS gradient behind the canvas shows through.
function GroundPlane(props) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow {...props}>
      <planeGeometry args={[300, 300]} />
      <shadowMaterial
        transparent
        opacity={0.34}
        color="#5a3d00"
        depthWrite={false}
      />
    </mesh>
  );
}

export default GroundPlane;