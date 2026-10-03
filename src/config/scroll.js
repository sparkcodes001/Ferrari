// Single source of truth for the hero's scroll choreography.
// The car finishes driving after this many viewport-heights of scroll.
// CarModel (3D) and HeroTelemetry (HUD) both read it, so they can't drift apart.
export const HERO_SCROLL_VIEWPORTS = 1.5;
