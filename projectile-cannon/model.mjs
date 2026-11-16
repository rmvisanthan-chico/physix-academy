// Pure projectile model — single source of truth for the figure.
// x = v0·cos(θ)·t,  z = v0·sin(θ)·t − ½·g·t²,  g = 9.81 m/s². No drag.
export const G = 9.81;
export const ANGLE_MIN = 10;
export const ANGLE_MAX = 80;
export const ANGLE_STEP = 1;
export const ANGLE_DEFAULT = 45;
export const V_MIN = 8;
export const V_MAX = 28;
export const V_STEP = 1;
export const V_DEFAULT = 18;

export function createCannon(angleDeg = ANGLE_DEFAULT, v0 = V_DEFAULT) {
  return { angleDeg: clamp(angleDeg, ANGLE_MIN, ANGLE_MAX), v0: clamp(v0, V_MIN, V_MAX), flight: null };
}

export function setAngle(c, deg) { c.angleDeg = clamp(deg, ANGLE_MIN, ANGLE_MAX); }
export function setPower(c, v) { c.v0 = clamp(v, V_MIN, V_MAX); }

export function fire(c) {
  const th = (c.angleDeg * Math.PI) / 180;
  const shot = { vx: c.v0 * Math.cos(th), vz: c.v0 * Math.sin(th), t: 0, g: G };
  c.flight = shot;
  return shot;
}

export function stepFlight(c, dt) {
  const f = c.flight;
  if (!f) return null;
  f.t += dt;
  const x = f.vx * f.t;
  const z = f.vz * f.t - 0.5 * f.g * f.t * f.t;
  if (z < 0 && f.t > 0.01) return { x, z: 0, landed: true, t: f.t };
  return { x, z, landed: false, t: f.t };
}

export function range(c) {
  const th = (c.angleDeg * Math.PI) / 180;
  return (c.v0 * c.v0 * Math.sin(2 * th)) / G;
}
export function apex(c) {
  const th = (c.angleDeg * Math.PI) / 180;
  return (c.v0 * c.v0 * Math.sin(th) * Math.sin(th)) / (2 * G);
}
export function timeOfFlight(c) {
  const th = (c.angleDeg * Math.PI) / 180;
  return (2 * c.v0 * Math.sin(th)) / G;
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
