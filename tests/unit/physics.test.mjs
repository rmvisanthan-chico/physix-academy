import test from 'node:test';
import assert from 'node:assert/strict';
import {
  G,
  stepSemiImplicit,
  stepVelocityVerlet,
  stepRK4,
  springAccel,
  collide1D,
  collide2D,
  timeOfFlight,
  projectileRange,
  projectileApex,
  mechanicalEnergy,
  kinetic,
  springPE,
  circularSpeed,
  escapeSpeed,
  stepOrbit,
  orbitalEnergy
} from '../../js/physics.js';

const close = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg}: expected ${b} ± ${tol}, got ${a}`);

test('semi-implicit Euler free fall matches kinematics', () => {
  const s = { x: 0, v: 0, t: 0 };
  const h = 1 / 1000;
  for (let i = 0; i < 1000; i++) stepSemiImplicit(s, -G, h);
  close(s.v, -G, 0.01, 'velocity after 1 s');
  close(s.x, -0.5 * G, 0.02, 'displacement after 1 s');
});

test('velocity Verlet constant acceleration is exact for quadratics', () => {
  const s = { x: 0, v: 0 };
  const h = 1 / 60;
  for (let i = 0; i < 60; i++) stepVelocityVerlet(s, () => -G, h);
  close(s.v, -G, 1e-9, 'velocity');
  close(s.x, -0.5 * G, 1e-9, 'position');
});

test('RK4 projectile range matches the analytic result', () => {
  const v0 = 40;
  const angle = 37;
  const rad = (angle * Math.PI) / 180;
  const s = { x: 0, v: v0 * Math.cos(rad) };
  /* Integrate vertical motion separately so x is uniform. */
  const y = { x: 0, v: v0 * Math.sin(rad) };
  const h = 1 / 500;
  let t = 0;
  let steps = 0;
  while (true) {
    stepRK4(y, () => -G, h, t);
    t += h;
    steps++;
    if (y.x <= 0 && steps > 1) break;
    if (steps > 100000) break;
  }
  const range = s.v * t;
  close(range, projectileRange(v0, angle), 0.6, 'range');
  close(projectileApex(v0, angle), (40 * Math.sin(rad)) ** 2 / (2 * G), 1e-9, 'apex formula');
  close(timeOfFlight(v0, angle), (2 * v0 * Math.sin(rad)) / G, 1e-9, 'time of flight');
});

test('elastic collision between equal masses swaps velocities', () => {
  const r = collide1D(2, 5, 2, -3, 1);
  close(r.v1, -3, 1e-12, 'v1');
  close(r.v2, 5, 1e-12, 'v2');
  close(r.keAfter, r.keBefore, 1e-9, 'kinetic energy conserved');
});

test('perfectly inelastic collision conserves momentum', () => {
  const m1 = 3,
    u1 = 4,
    m2 = 1,
    u2 = 0;
  const r = collide1D(m1, u1, m2, u2, 0);
  close(r.v1, r.v2, 1e-12, 'common velocity');
  close(m1 * r.v1 + m2 * r.v2, m1 * u1 + m2 * u2, 1e-9, 'momentum');
  assert.ok(r.keAfter < r.keBefore, 'kinetic energy must be lost');
});

test('2D impulse conserves momentum and ignores separating bodies', () => {
  const a = { m: 2, vx: 3, vy: 0 };
  const b = { m: 1, vx: -1, vy: 0 };
  const b0 = b.vx;
  const before = a.m * a.vx + b.m * b.vx;
  const r = collide2D(a, b, { nx: 1, ny: 0 }, 0.5);
  close(a.m * r.a.vx + b.m * r.b.vx, before, 1e-9, 'momentum x');
  assert.ok(r.b.vx > b0, 'body 2 should be pushed right');

  const separating = collide2D(
    { m: 1, vx: -1, vy: 0 },
    { m: 1, vx: 1, vy: 0 },
    { nx: 1, ny: 0 },
    1
  );
  assert.equal(separating.impulse, 0, 'no impulse when separating');
});

test('spring energy drifts less than 2% in 10 s under semi-implicit Euler', () => {
  const k = 10,
    m = 1;
  const s = { x: 1, v: 0 };
  const e0 = mechanicalEnergy({ m, v: s.v, k, x: s.x });
  const h = 1 / 240;
  for (let i = 0; i < 2400; i++) stepSemiImplicit(s, springAccel(k, 0, m), h);
  const e1 = mechanicalEnergy({ m, v: s.v, k, x: s.x });
  close(e1, e0, e0 * 0.02, 'total energy');
  close(springPE(k, 1), 5, 1e-12, 'spring PE at unit stretch');
  close(kinetic(2, 3), 9, 1e-12, 'kinetic energy');
});

test('circular orbit keeps its radius over one period', () => {
  const mu = 3.986e14; // Earth
  const r0 = 7.0e6;
  const v = circularSpeed(mu, r0);
  const s = { x: r0, y: 0, vx: 0, vy: v };
  const period = (2 * Math.PI * r0) / v;
  const h = period / 2000;
  const e0 = orbitalEnergy(s, mu);

  for (let i = 0; i < 2000; i++) stepOrbit(s, mu, h);

  const r1 = Math.hypot(s.x, s.y);
  close(r1, r0, r0 * 0.01, 'radius drift over one orbit');
  close(orbitalEnergy(s, mu), e0, Math.abs(e0) * 0.01, 'specific orbital energy');
  close(escapeSpeed(mu, r0) / v, Math.SQRT2, 1e-9, 'escape speed ratio');
});
