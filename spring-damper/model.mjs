// Pure damped spring-mass model — single source of truth for the figure.
// Used by build.mjs (Node) and inlined into the page (exports stripped).
// x'' = -(k·x + c·x')/m : a mass hanging on a spring (k) with a dashpot (c)
// in parallel. x is displacement from equilibrium, positive DOWNWARD, metres.
export const M_MIN = 0.2;
export const M_MAX = 1.0;
export const M_STEP = 0.1;
export const M_DEFAULT = 0.5;
export const K_MIN = 20;
export const K_MAX = 100;
export const K_STEP = 10;
export const K_DEFAULT = 40;
export const C_MIN = 0;
export const C_MAX = 4;
export const C_STEP = 0.25;
export const C_DEFAULT = 0.5;
export const PULL = 0.06; // RELEASE always pulls the mass this far down, metres

export function createMass() {
  return { m: M_DEFAULT, k: K_DEFAULT, c: C_DEFAULT, x: PULL, v: 0, time: 0 };
}

export function step(p, dt) {
  const a = -(p.k * p.x + p.c * p.v) / p.m;
  p.v += a * dt;
  p.x += p.v * dt;
  p.time += dt;
  return p;
}

export function setMass(p, m) {
  p.m = clamp(m, M_MIN, M_MAX);
}

export function setStiffness(p, k) {
  p.k = clamp(k, K_MIN, K_MAX);
}

export function setDamping(p, c) {
  p.c = clamp(c, C_MIN, C_MAX);
}

export function release(p) {
  p.x = PULL;
  p.v = 0;
  p.time = 0;
}

// Damping ratio zeta = c / (2 sqrt(k m)). 0 = undamped, 1 = critical.
export function zeta(p) {
  return p.c / (2 * Math.sqrt(p.k * p.m));
}

// Damped angular frequency; 0 once damping reaches critical.
export function omegaD(p) {
  const half = p.c / (2 * p.m);
  const w2 = p.k / p.m - half * half;
  return w2 > 0 ? Math.sqrt(w2) : 0;
}

// Damped period of oscillation; 0 means "no longer oscillates".
export function periodD(p) {
  const w = omegaD(p);
  return w > 0 ? (2 * Math.PI) / w : 0;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
