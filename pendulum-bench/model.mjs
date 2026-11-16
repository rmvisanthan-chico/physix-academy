// Pure pendulum model — single source of truth for the figure.
// Used by build.mjs (Node) and inlined into the page (exports stripped).
// theta'' = -(g / L)·sin(theta), L in metres, g = 9.81 m/s^2.
export const G = 9.81;
export const L_MIN = 0.3;
export const L_MAX = 1.2;
export const L_STEP = 0.05;
export const L_DEFAULT = 0.7;
export const A_MIN = 10; // degrees
export const A_MAX = 80;
export const A_STEP = 5;
export const A_DEFAULT = 45;

export function createPendulum(L = L_DEFAULT, angleDeg = A_DEFAULT) {
  return {
    L: clamp(L, L_MIN, L_MAX),
    theta: (clamp(angleDeg, A_MIN, A_MAX) * Math.PI) / 180,
    omega: 0,
    angleDeg: clamp(angleDeg, A_MIN, A_MAX),
    time: 0,
  };
}

export function step(p, dt) {
  const a = -(G / p.L) * Math.sin(p.theta);
  p.omega += a * dt;
  p.theta += p.omega * dt;
  p.time += dt;
  return p;
}

export function setLength(p, L) {
  p.L = clamp(L, L_MIN, L_MAX);
}

export function release(p, angleDeg) {
  p.angleDeg = clamp(angleDeg, A_MIN, A_MAX);
  p.theta = (p.angleDeg * Math.PI) / 180;
  p.omega = 0;
}

export function period(p) {
  return 2 * Math.PI * Math.sqrt(p.L / G);
}

export function energyFraction(p) {
  const E0 = 1 - Math.cos((p.angleDeg * Math.PI) / 180);
  if (E0 <= 0.0001) return 1;
  const E = 1 - Math.cos(p.theta) + (p.L * p.omega * p.omega) / (2 * G);
  return Math.min(1, Math.max(0, E / E0));
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
