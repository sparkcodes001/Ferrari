import * as THREE from "three";

// Written by CarModel every frame, read by HeroText letters.
export const carTrack = {
  ready: false,
  pos: new THREE.Vector3(), // car body centre (world)
  offset: new THREE.Vector3(), // body centre relative to the car group origin
  radius: 2, // rough footprint radius (world units)
};
