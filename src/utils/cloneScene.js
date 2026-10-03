/**
 * useGLTF() caches and returns the SAME scene object to every component
 * that loads the same URL. If two components (e.g. Hero's CarModel and
 * Engineering's EngineeringCar) both load ferrari.glb, they'd otherwise
 * mutate the identical Object3D nodes — same positions, same visibility
 * flags — fighting each other every frame.
 *
 * Object3D.clone(true) deep-clones the hierarchy (new Mesh/Group instances
 * with their own transforms) but geometries and materials are shared by
 * reference — so each instance gets independent animation state without
 * duplicating GPU buffers or textures.
 */
export function cloneScene(scene) {
  return scene.clone(true);
}
