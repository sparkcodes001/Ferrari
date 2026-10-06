// The Circuit section. This is a CONCEPT layout drawn for the site, not a real track:
// the speed, gear, g-force and lap time are computed from the shape of the line, so they are
// illustrative. Edit the points to reshape the circuit; everything else recalculates.
import { SPEC } from "./specs";

export const CIRCUIT = {
  name: "Concept circuit",
  lengthM: 3400, // what the drawn line is treated as, in metres
  // control points of a closed smooth loop (viewBox 0 0 1000 650); the start line is the first point
  points: [
    [250, 560], [450, 560], [640, 560], [760, 550], [830, 500], [840, 430], [780, 385],
    [700, 370], [650, 335], [690, 295], [780, 270], [865, 235], [885, 170], [830, 105],
    [740, 95], [620, 110], [520, 125], [440, 160], [400, 215], [330, 225], [250, 195],
    [165, 200], [105, 260], [105, 340], [150, 400], [165, 455], [150, 510], [190, 550],
  ],
  samples: 900,
  maxKmh: SPEC.top, // the car's top speed caps the profile
  gears: SPEC.gears,
  lateralG: 1.5, // how hard the car is assumed to corner
  accel: 6, // m/s², simple constant
  brake: 14, // m/s²
  view: { w: 1000, h: 650 },
};
