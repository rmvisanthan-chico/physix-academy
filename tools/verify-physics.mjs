/* PhysiX Academy — physics invariant verification.
 *
 *   node tools/verify-physics.mjs [baseUrl]
 *
 * The simulation health audit proves each sim is ALIVE (pixels move, clock
 * advances, graphs sample). It cannot prove the motion is physically right.
 * This suite asserts the laws the sims claim to obey, using the numbers each
 * sim exposes on window.__tcProbe:
 *
 *   energy  — mechanical energy conserved; measured period ≈ 2π√(l/g)
 *   shm     — energy conserved; measured period ≈ 2π√(m/k); ζ = 0 when undamped
 *   orbit   — bound orbit keeps its radius (no spiral from integration error)
 *   incline — dv/dt equals the quoted a; a = 0 when friction holds the block
 *   atwood  — dv/dt equals (m₂−m₁)g/(m₁+m₂); tension matches 2m₁m₂g/(m₁+m₂)
 *
 * Tolerances are deliberately physical, not bit-exact: they catch a wrong
 * integrator (Euler spirals) while allowing the discretisation error a
 * fixed 1/60 s step legitimately has.
 *
 * Exits non-zero on any failure, so it can gate CI.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:4190';
const CHANNEL = process.env.PW_CHANNEL || 'chrome';

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);

async function openSim(page, id) {
  /* Force a real document load. Navigating between two hashes on the same
     origin only fires hashchange, so the previous sim's probe can still be
     installed when the wait starts - and is then nulled by its own cleanup. */
  await page.goto('about:blank');
  await page.goto(`${BASE}/#/sims/${id}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => typeof window.__tcProbe === 'function' && window.__tcProbe().t > 0.25,
    null,
    { timeout: 20000 }
  );
}

const probe = (page) => page.evaluate(() => window.__tcProbe());

async function main() {
  const browser = await chromium.launch({ channel: CHANNEL });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).split('\n')[0]));

  /* ---------------- Pendulum: energy + period ---------------- */
  await openSim(page, 'energy');
  const e0 = await probe(page);
  await page.waitForTimeout(7000);
  const e1 = await probe(page);
  const E0 = e0.pe + e0.ke;
  const E1 = e1.pe + e1.ke;
  check(
    'pendulum: mechanical energy conserved over 7 s (<0.5%)',
    rel(E1, E0) < 0.005,
    `E ${E0.toFixed(6)} → ${E1.toFixed(6)}, drift ${(rel(E1, E0) * 100).toFixed(3)}%`
  );
  check(
    'pendulum: measured period within 10% of 2π√(l/g)',
    e1.period && rel(e1.period, e1.predictedPeriod) < 0.1,
    `measured ${e1.period?.toFixed(3)} s vs predicted ${e1.predictedPeriod.toFixed(3)} s`
  );

  /* ---------------- SHM: energy, period, damping label ---------------- */
  await openSim(page, 'shm');
  const s0 = await probe(page);
  await page.waitForTimeout(6000);
  const s1 = await probe(page);
  const shmE = (p) => 0.5 * p.k * p.x * p.x + 0.5 * p.m * p.v * p.v;
  check(
    'shm: mechanical energy conserved over 6 s (<0.5%)',
    rel(shmE(s1), shmE(s0)) < 0.005,
    `E ${shmE(s0).toFixed(5)} → ${shmE(s1).toFixed(5)}, drift ${(rel(shmE(s1), shmE(s0)) * 100).toFixed(3)}%`
  );
  check(
    'shm: measured period within 3% of 2π√(m/k)',
    s1.periodMeasured && rel(s1.periodMeasured, s1.periodTheory) < 0.03,
    `measured ${s1.periodMeasured?.toFixed(3)} s vs theory ${s1.periodTheory.toFixed(3)} s`
  );
  check(
    'shm: undamped run reports ζ = 0',
    s1.zeta === 0 && s1.regime === 'undamped',
    `ζ=${s1.zeta} (${s1.regime})`
  );

  /* ---------------- Orbit: energy and angular momentum ---------------- */
  await openSim(page, 'orbit');
  const o0 = await probe(page);
  await page.waitForTimeout(6000);
  const o1 = await probe(page);
  /* A bound orbit is generally an ellipse: the radius and speed MUST change.
     What has to stay constant is the specific mechanical energy
     ε = v²/2 − μ/r and the specific angular momentum L = r × v. Asserting the
     radius instead would have failed a perfectly correct orbit. */
  const eps = (p) => 0.5 * (p.vx * p.vx + p.vy * p.vy) - p.mu / p.r;
  const ang = (p) => p.dx * p.vy - p.dy * p.vx;
  check(
    'orbit: specific orbital energy conserved over 6 s (<1%)',
    rel(eps(o1), eps(o0)) < 0.01,
    `ε ${eps(o0).toFixed(4)} → ${eps(o1).toFixed(4)}, drift ${(rel(eps(o1), eps(o0)) * 100).toFixed(3)}%`
  );
  check(
    'orbit: angular momentum conserved over 6 s (<1%)',
    rel(ang(o1), ang(o0)) < 0.01,
    `L ${ang(o0).toFixed(1)} → ${ang(o1).toFixed(1)}`
  );

  /* ---------------- Incline: acceleration + friction threshold ---------------- */
  await openSim(page, 'incline');
  const i0 = await probe(page);
  await page.waitForTimeout(1000);
  const i1 = await probe(page);
  const aMeasured = (i1.v - i0.v) / (i1.t - i0.t);
  check(
    'incline: dv/dt equals the quoted acceleration (<2%)',
    i1.slides && rel(aMeasured, i1.a) < 0.02,
    `measured ${aMeasured.toFixed(2)} vs quoted ${i1.a.toFixed(2)} m/s²`
  );

  const iRanges = await page.$$('.sim-controls input[type=range]');
  await iRanges[0].evaluate((el) => {
    el.value = '5';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(700);
  const iHeld = await probe(page);
  check(
    'incline: friction holds the block below the threshold (a = 0, v = 0)',
    !iHeld.slides && iHeld.a === 0 && iHeld.v === 0,
    `slides=${iHeld.slides} a=${iHeld.a} v=${iHeld.v}`
  );

  /* ---------------- Atwood: acceleration + tension + balance ---------------- */
  await openSim(page, 'atwood');
  const a0 = await probe(page);
  await page.waitForTimeout(1000);
  const a1 = await probe(page);
  const aAt = (a1.v - a0.v) / (a1.t - a0.t);
  check(
    'atwood: dv/dt equals (m₂−m₁)g/(m₁+m₂) (<2%)',
    rel(aAt, a1.a) < 0.02,
    `measured ${aAt.toFixed(2)} vs quoted ${a1.a.toFixed(2)} m/s²`
  );
  const atRanges = await page.$$('.sim-controls input[type=range]');
  const massValues = await page.$$eval('.sim-controls input[type=range]', (els) =>
    els.slice(0, 2).map((e) => +e.value)
  );
  const [m1, m2] = massValues;
  const tFormula = (2 * m1 * m2 * 9.8) / (m1 + m2);
  check(
    'atwood: tension equals 2m₁m₂g/(m₁+m₂) (<1%)',
    rel(a1.T, tFormula) < 0.01,
    `reported ${a1.T.toFixed(2)} N vs formula ${tFormula.toFixed(2)} N`
  );

  await atRanges[1].evaluate((el) => {
    el.value = '2';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await atRanges[0].evaluate((el) => {
    el.value = '2';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(600);
  const balanced = await probe(page);
  check(
    'atwood: equal masses do not accelerate',
    balanced.balanced && balanced.v === 0 && balanced.a === 0,
    `balanced=${balanced.balanced} v=${balanced.v} a=${balanced.a}`
  );

  check('no uncaught page errors during the run', pageErrors.length === 0, pageErrors.join(' ; '));

  await browser.close();
  const failed = results.filter((r) => !r.pass).length;
  console.log(
    `\n===== SUMMARY =====\npassed: ${results.length - failed}\nfailed: ${failed}\ntotal:  ${results.length}`
  );
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
