// Pure DC circuit model — single source of truth for the figure.
// Used by build.mjs (Node) and inlined into the page (exports stripped).
// Series loop: battery EMF V, lamp (fixed R_LAMP) and rheostat R.
// I = V / (R_LAMP + R) when the knife switch is closed, else 0.
export const V_MIN = 1.5;
export const V_MAX = 9;
export const V_STEP = 0.5;
export const V_DEFAULT = 6;
export const R_MIN = 0;
export const R_MAX = 90;
export const R_STEP = 5;
export const R_DEFAULT = 20;
export const R_LAMP = 10; // lamp filament resistance, ohms
export const I_MAX = V_MAX / R_LAMP; // 0.9 A — full dial scale, r = 0

export function createCircuit() {
  return { v: V_DEFAULT, r: R_DEFAULT, closed: true, time: 0 }; // starts live, tour varies it
}

export function setVoltage(p, v) {
  p.v = clamp(v, V_MIN, V_MAX);
}

export function setResistance(p, r) {
  p.r = clamp(r, R_MIN, R_MAX);
}

export function toggle(p) {
  p.closed = !p.closed;
}

export function current(p) {
  return p.closed ? p.v / (R_LAMP + p.r) : 0;
}

// Voltmeter reads across the lamp: V_L = I · R_LAMP.
export function lampVolts(p) {
  return current(p) * R_LAMP;
}

// Lamp power P = I² · R_LAMP (the readout number).
export function lampPower(p) {
  const i = current(p);
  return i * i * R_LAMP;
}

// Brightness of the glow: linear in I (the physics number is lampPower).
export function brightness(p) {
  return current(p) / I_MAX;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
