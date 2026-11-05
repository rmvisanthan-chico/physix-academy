/* PhysiX Academy — shared physics kernel.
 *
 * Pure numerics only: no DOM, no canvas, no globals. Simulations import these
 * helpers so that every integrator in the catalogue agrees on signs, units and
 * conservation behaviour instead of each one re-deriving Euler by hand.
 *
 * Conventions
 *   - SI units throughout (metres, seconds, kilograms, newtons).
 *   - `state` objects are mutated in place and also returned, so a caller can
 *     write `step(state, ...)` without rebinding.
 *   - 1D position is `x`, velocity `v`; 2D adds `y`, `vy`.
 *   - Restitution `e` is 1 for elastic, 0 for perfectly inelastic.
 */

/** Standard gravity (m/s²). */
export const G = 9.80665;

/* ------------------------------------------------------------------ */
/* Integration                                                         */
/* ------------------------------------------------------------------ */

/**
 * Semi-implicit (symplectic) Euler — one step.
 * Stable for oscillators, unlike explicit Euler, and the default for sims that
 * only need a position-dependent force.
 *
 * @param {{x:number,v:number,t?:number}} state
 * @param {number|((x:number,v:number,t:number)=>number)} accel
 * @param {number} h seconds
 */
export function stepSemiImplicit(state, accel, h) {
  const t = state.t || 0;
  const a = typeof accel === 'function' ? accel(state.x, state.v, t) : accel;
  state.v += a * h;
  state.x += state.v * h;
  if (state.t !== undefined) state.t = t + h;
  return state;
}

/**
 * Velocity Verlet for a position-only acceleration (gravity, springs without
 * damping). Second-order accurate and time-reversible; the right choice for
 * orbits, where semi-implicit Euler spirals outward.
 *
 * @param {{x:number,v:number,t?:number}} state
 * @param {(x:number)=>number} accel
 * @param {number} h
 */
export function stepVelocityVerlet(state, accel, h) {
  const a1 = accel(state.x);
  state.v += 0.5 * a1 * h;
  state.x += state.v * h;
  const a2 = accel(state.x);
  state.v += 0.5 * a2 * h;
  if (state.t !== undefined) state.t += h;
  return state;
}

/**
 * Classical RK4 for a second-order ODE x'' = a(x, v, t).
 * More accurate than Verlet for velocity-dependent forces (drag), at 4x cost.
 *
 * @param {{x:number,v:number,t?:number}} state
 * @param {(x:number,v:number,t:number)=>number} accel
 * @param {number} h
 * @param {number} [t] current time (defaults to state.t or 0)
 */
export function stepRK4(state, accel, h, t) {
  const t0 = t === undefined ? state.t || 0 : t;
  const { x, v } = state;

  const k1x = v;
  const k1v = accel(x, v, t0);

  const k2x = v + (h / 2) * k1v;
  const k2v = accel(x + (h / 2) * k1x, v + (h / 2) * k1v, t0 + h / 2);

  const k3x = v + (h / 2) * k2v;
  const k3v = accel(x + (h / 2) * k2x, v + (h / 2) * k2v, t0 + h / 2);

  const k4x = v + h * k3v;
  const k4v = accel(x + h * k3x, v + h * k3v, t0 + h);

  state.x = x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
  state.v = v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
  if (state.t !== undefined) state.t = t0 + h;
  return state;
}

/* ------------------------------------------------------------------ */
/* Forces                                                              */
/* ------------------------------------------------------------------ */

/** Spring + viscous damping acceleration: a = -(k x + c v) / m. */
export function springAccel(k, c, m) {
  return (x, v) => -(k * x + c * v) / m;
}

/** Quadratic drag acceleration opposite to velocity: a = -(k/m) v |v|. */
export function dragAccel(k, m) {
  return (x, v) => -(k / m) * v * Math.abs(v);
}

/** Uniform gravitational acceleration as a state-aware function. */
export function gravityAccel(g = G) {
  return () => -g;
}

/* ------------------------------------------------------------------ */
/* Collisions                                                          */
/* ------------------------------------------------------------------ */

/**
 * One-dimensional impulse collision.
 *
 * @param {number} m1
 * @param {number} u1 initial velocity of body 1 (+ = right)
 * @param {number} m2
 * @param {number} u2 initial velocity of body 2
 * @param {number} [e=1] restitution, 0..1
 * @returns {{v1:number,v2:number,impulse:number,keBefore:number,keAfter:number}}
 */
export function collide1D(m1, u1, m2, u2, e = 1) {
  const k = Math.max(0, Math.min(1, e));
  const v1 = ((m1 - k * m2) * u1 + (1 + k) * m2 * u2) / (m1 + m2);
  const v2 = ((1 + k) * m1 * u1 + (m2 - k * m1) * u2) / (m1 + m2);
  const impulse = m1 * (v1 - u1);
  const keBefore = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2;
  const keAfter = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  return { v1, v2, impulse, keBefore, keAfter };
}

/**
 * Two-dimensional impulse along a contact normal.
 * The normal is a unit vector pointing from body 1 towards body 2.
 *
 * @param {{m:number,vx:number,vy:number}} a
 * @param {{m:number,vx:number,vy:number}} b
 * @param {{nx:number,ny:number}} normal
 * @param {number} [e=1]
 * @returns {{a:{vx:number,vy:number}, b:{vx:number,vy:number}, impulse:number}}
 */
export function collide2D(a, b, normal, e = 1) {
  const k = Math.max(0, Math.min(1, e));
  const len = Math.hypot(normal.nx, normal.ny) || 1;
  const nx = normal.nx / len;
  const ny = normal.ny / len;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const vn = rvx * nx + rvy * ny;

  /* Already separating — no impulse, otherwise bodies would stick together. */
  if (vn > 0) {
    return { a: { vx: a.vx, vy: a.vy }, b: { vx: b.vx, vy: b.vy }, impulse: 0 };
  }

  const invA = 1 / a.m;
  const invB = 1 / b.m;
  const j = (-(1 + k) * vn) / (invA + invB);

  return {
    a: { vx: a.vx - j * invA * nx, vy: a.vy - j * invA * ny },
    b: { vx: b.vx + j * invB * nx, vy: b.vy + j * invB * ny },
    impulse: j
  };
}

/* ------------------------------------------------------------------ */
/* Projectiles                                                         */
/* ------------------------------------------------------------------ */

const rad = (deg) => (deg * Math.PI) / 180;

/** Time of flight for a projectile returning to its launch height (no drag). */
export function timeOfFlight(v0, angleDeg, g = G) {
  return (2 * v0 * Math.sin(rad(angleDeg))) / g;
}

/** Horizontal range on level ground (no drag). */
export function projectileRange(v0, angleDeg, g = G) {
  return (v0 * v0 * Math.sin(2 * rad(angleDeg))) / g;
}

/** Maximum height (no drag). */
export function projectileApex(v0, angleDeg, g = G) {
  const vy = v0 * Math.sin(rad(angleDeg));
  return (vy * vy) / (2 * g);
}

/* ------------------------------------------------------------------ */
/* Energy                                                              */
/* ------------------------------------------------------------------ */

export const kinetic = (m, v) => 0.5 * m * v * v;
export const gravitationalPE = (m, h, g = G) => m * g * h;
export const springPE = (k, x) => 0.5 * k * x * x;

/**
 * Total mechanical energy of a one-body system.
 * Omit any term that does not apply by leaving its parameter out.
 *
 * @param {{m?:number,v?:number,h?:number,k?:number,x?:number,g?:number}} o
 */
export function mechanicalEnergy(o) {
  const m = o.m || 0;
  return (
    (o.v === undefined ? 0 : kinetic(m, o.v)) +
    (o.h === undefined ? 0 : gravitationalPE(m, o.h, o.g === undefined ? G : o.g)) +
    (o.k === undefined || o.x === undefined ? 0 : springPE(o.k, o.x))
  );
}

/* ------------------------------------------------------------------ */
/* Orbital mechanics                                                   */
/* ------------------------------------------------------------------ */

/** Gravitational parameter mu = G*M for a central body. */
export const muOf = (mass, gAtSurface, radius) => gAtSurface * radius * radius;

/** Circular orbital speed at radius r. */
export const circularSpeed = (mu, r) => Math.sqrt(mu / r);

/** Escape speed at radius r. */
export const escapeSpeed = (mu, r) => Math.sqrt((2 * mu) / r);

/**
 * Velocity-Verlet step for a 2D orbit under a central inverse-square field.
 * Much better long-term radius conservation than Euler.
 *
 * @param {{x:number,y:number,vx:number,vy:number}} s
 * @param {number} mu
 * @param {number} h
 * @param {number} [cx=0] x coordinate of the central body
 * @param {number} [cy=0] y coordinate of the central body
 */
export function stepOrbit(s, mu, h, cx = 0, cy = 0) {
  const a = (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const r2 = dx * dx + dy * dy;
    const r = Math.sqrt(r2) || 1;
    const f = -mu / (r2 * r);
    return { ax: f * dx, ay: f * dy };
  };

  const a1 = a(s.x, s.y);
  s.vx += 0.5 * a1.ax * h;
  s.vy += 0.5 * a1.ay * h;
  s.x += s.vx * h;
  s.y += s.vy * h;
  const a2 = a(s.x, s.y);
  s.vx += 0.5 * a2.ax * h;
  s.vy += 0.5 * a2.ay * h;
  return s;
}

/** Specific orbital energy (J/kg) — negative for bound orbits. */
export function orbitalEnergy(s, mu, cx = 0, cy = 0) {
  const r = Math.hypot(s.x - cx, s.y - cy) || 1;
  return 0.5 * (s.vx * s.vx + s.vy * s.vy) - mu / r;
}
