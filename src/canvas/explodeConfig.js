import * as THREE from "three";

// three.js strips "." from node names on import: "Tire.001_22" -> "Tire001_22"
export const safeName = (name) => THREE.PropertyBinding.sanitizeNodeName(name);

export const EXPLODE_MAP = [
  { name: "GlassMain_14", offset: [0, 1.3, 0], range: [0.04, 0.3] },
  { name: "GlassBack_18", offset: [0, 1.0, 0.5], range: [0.04, 0.3] },
  { name: "GlassOther_3", offset: [0, 0.8, 0], range: [0.04, 0.3] },

  { name: "Body_9", offset: [0, 2.6, -1.6], range: [0.14, 0.58] },

  { name: "Tire.001_22", offset: [-1.5, -0.2, -0.7], range: [0.3, 0.66] },
  { name: "Tire.002_26", offset: [-1.5, -0.2, 0.7], range: [0.3, 0.66] },
  { name: "Tire.003_30", offset: [1.5, -0.2, -0.7], range: [0.3, 0.66] },
  { name: "Tire.004_34", offset: [1.5, -0.2, 0.7], range: [0.3, 0.66] },

  { name: "Rims_21", offset: [-0.6, 0, 0], range: [0.34, 0.7] },
  { name: "Rims.002_25", offset: [-0.6, 0, 0], range: [0.34, 0.7] },
  { name: "Rims.001_29", offset: [0.6, 0, 0], range: [0.34, 0.7] },
  { name: "Rims.003_33", offset: [0.6, 0, 0], range: [0.34, 0.7] },

  { name: "Brake_19", offset: [0.3, 0, 0], range: [0.36, 0.72] },
  { name: "Brake.001_23", offset: [0.3, 0, 0], range: [0.36, 0.72] },
  { name: "Brake.002_27", offset: [-0.3, 0, 0], range: [0.36, 0.72] },
  { name: "Brake.003_31", offset: [-0.3, 0, 0], range: [0.36, 0.72] },

  { name: "Headlights_17", offset: [0, 0.3, -1.8], range: [0.46, 0.8] },
  { name: "Mirror_16", offset: [0, 1.1, 0], range: [0.46, 0.8] },
  { name: "RearLight_7", offset: [0, 0.25, 1.6], range: [0.46, 0.8] },
  { name: "RedGlass_15", offset: [0, 0.25, 1.9], range: [0.46, 0.8] },
  { name: "Logos_5", offset: [0, 0.8, -0.4], range: [0.46, 0.8] },
  { name: "Grid_4", offset: [0, -0.3, -1.1], range: [0.46, 0.8] },

  { name: "Mechanics_6", offset: [0, -0.9, 0], range: [0.56, 0.92] },
  { name: "Springs_8", offset: [0, -0.6, 0], range: [0.56, 0.92] },
];

export const STAGES = [
  { range: [0, 0.1], title: "FULL ASSEMBLY", sub: "COMPLETE AERODYNAMIC PACKAGE" },
  { range: [0.1, 0.3], title: "CANOPY REMOVED", sub: "LAMINATED SAFETY GLASS" },
  { range: [0.3, 0.58], title: "SHELL LIFTED", sub: "ALUMINUM–CARBON MONOCOQUE" },
  { range: [0.58, 0.76], title: "WHEELS SEPARATED", sub: "PIRELLI P ZERO · BREMBO CARBON-CERAMIC" },
  { range: [0.76, 0.92], title: "TRIM REMOVED", sub: "MATRIX LED · SIGNATURE TAIL LIGHT" },
  { range: [0.92, 1.01], title: "CHASSIS EXPOSED", sub: "V12 · 6.5L · 830CV" },
];

export function getStageIndex(progress) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (progress >= STAGES[i].range[0]) return i;
  }
  return 0;
}
