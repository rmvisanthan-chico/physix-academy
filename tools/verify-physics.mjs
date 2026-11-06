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

/* Static benches (mirror, eye, heating, vernier, solids, PV, heat engine)
   expose a probe with no clock, so they need only the function to exist. */
async function openStatic(page, id) {
  await page.goto('about:blank');
  await page.goto(`${BASE}/#/sims/${id}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__tcProbe === 'function', null, {
    timeout: 20000
  });
  await page.waitForTimeout(250);
}

async function setRange(page, index, value) {
  const ranges = await page.$$('.sim-controls input[type=range]');
  await ranges[index].evaluate((el, v) => {
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(300);
}

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

  /* ---------------- Wave: the crest travels at f·λ ---------------- */
  await openSim(page, 'wave');
  const wv0 = await probe(page);
  await page.waitForTimeout(2000);
  const wv1 = await probe(page);
  const wvMod = (v, m) => ((v % m) + m) % m;
  const wvDx = wvMod(wv1.crest - wv0.crest, wv1.lambda);
  const wvExpect = wvMod(wv1.v * (wv1.t - wv0.t), wv1.lambda);
  check(
    'wave: crest displacement equals f·λ·Δt',
    Math.abs(wvDx - wvExpect) < 0.2,
    `Δcrest ${wvDx.toFixed(2)} px vs fλΔt ${wvExpect.toFixed(2)} px`
  );

  /* ---------------- Circuit: q/t = I and P = I²R ---------------- */
  await openSim(page, 'circuit');
  await page.waitForTimeout(1000);
  const ci1 = await probe(page);
  check(
    'circuit: charge over time equals the current',
    rel(ci1.q / ci1.t, ci1.I) < 1e-6,
    `q/t ${(ci1.q / ci1.t).toFixed(6)} A vs I ${ci1.I.toFixed(6)} A`
  );
  check(
    'circuit: power is I²R',
    rel(ci1.P, ci1.I * ci1.I * ci1.R) < 1e-9,
    `P ${ci1.P.toFixed(3)} W vs I²R ${(ci1.I * ci1.I * ci1.R).toFixed(3)} W`
  );

  /* ---------------- Doppler: the ring gap IS the heard frequency ---------------- */
  await openSim(page, 'doppler');
  await page.waitForFunction(() => window.__tcProbe().gap != null, null, { timeout: 15000 });
  const dp = await probe(page);
  const DC = 90;
  check(
    'doppler: wavefront gap equals (c−v)/f',
    rel(dp.gap, (DC - dp.vs) / dp.f) < 1e-6,
    `gap ${dp.gap.toFixed(3)} px vs (c−v)/f ${((DC - dp.vs) / dp.f).toFixed(3)} px`
  );
  check(
    'doppler: c/gap reproduces the heard frequency',
    rel(DC / dp.gap, dp.fHeard) < 1e-6,
    `c/gap ${(DC / dp.gap).toFixed(4)} Hz vs f' ${dp.fHeard.toFixed(4)} Hz`
  );

  /* ---------------- Induction: EMF = −N dΦ/dt ---------------- */
  await openSim(page, 'induction');
  const in0 = await probe(page);
  await page.waitForTimeout(300);
  const in1 = await probe(page);
  check(
    'induction: EMF is exactly −N dΦ/dt',
    rel(in1.emfRaw, -in1.n * in1.dphiDt) < 1e-9,
    `emf ${in1.emfRaw.toFixed(4)} V vs −N dΦ/dt ${(-in1.n * in1.dphiDt).toFixed(4)} V`
  );
  check(
    'induction: the flux slope matches the flux difference',
    rel((in1.phi - in0.phi) / (in1.t - in0.t), in1.dphiDt) < 0.35,
    `ΔΦ/Δt ${((in1.phi - in0.phi) / (in1.t - in0.t)).toFixed(4)} vs dΦ/dt ${in1.dphiDt.toFixed(4)}`
  );

  /* ---------------- Cooling: ln(ΔT) slope is −k ---------------- */
  await openSim(page, 'cooling');
  await page.waitForTimeout(3000);
  const co = await probe(page);
  check(
    'cooling: ln(ΔT/ΔT₀)/t equals −k',
    rel(Math.log(co.excess / (co.t0 - co.Ta)) / co.t, -co.k) < 1e-3,
    `slope ${(Math.log(co.excess / (co.t0 - co.Ta)) / co.t).toFixed(5)} vs −k ${(-co.k).toFixed(5)}`
  );

  /* ---------------- RC: 63.2% at one time constant ---------------- */
  await openSim(page, 'rc');
  await page.waitForFunction(() => window.__tcProbe().frac >= 0.632, null, { timeout: 20000 });
  const rc = await probe(page);
  check(
    'rc: capacitor reaches 63.2% at t = τ',
    Math.abs(rc.t - rc.tauMs / 1000) / (rc.tauMs / 1000) < 0.02,
    `t ${rc.t.toFixed(3)} s vs τ ${(rc.tauMs / 1000).toFixed(3)} s`
  );

  /* ---------------- Buoyancy: settled displacement is ρ/ρ_f ---------------- */
  await openSim(page, 'buoyancy');
  await page.waitForFunction(
    () => {
      const p = window.__tcProbe();
      return p.t > 4 && Math.abs(p.vyMs) < 0.05;
    },
    null,
    { timeout: 20000 }
  );
  const bu = await probe(page);
  check(
    'buoyancy: settled submerged fraction equals ρ/ρ_f',
    Math.abs(bu.subFrac - 0.6) < 0.015,
    `submerged ${(bu.subFrac * 100).toFixed(1)}% vs ρ/ρ_f 60%`
  );
  check(
    'buoyancy: at equilibrium weight equals buoyancy',
    Math.abs(bu.W - bu.B) / bu.W < 0.02,
    `W ${bu.W.toFixed(4)} kN vs B ${bu.B.toFixed(4)} kN`
  );

  /* ---------------- Standing wave: node grid and 0.6 Hz phase ---------------- */
  await openSim(page, 'standing');
  const st0 = await probe(page);
  const stNodesOk = st0.nodeX.every((x, i) => Math.abs(x - (40 + (i * st0.L) / st0.n)) < 1e-9);
  await page.waitForTimeout(500);
  const st1 = await probe(page);
  const stPhase = wvMod(st1.phase - st0.phase, 2 * Math.PI);
  const stExpect = wvMod(2 * Math.PI * 0.6 * (st1.t - st0.t), 2 * Math.PI);
  check(
    'standing: nodes sit at 40 + p·L/n',
    stNodesOk,
    `${st0.nodes} nodes across L=${st0.L.toFixed(0)} px`
  );
  check(
    'standing: the pattern phase advances at 0.6 Hz',
    Math.abs(stPhase - stExpect) < 0.05,
    `Δφ ${stPhase.toFixed(3)} rad vs ωΔt ${stExpect.toFixed(3)} rad`
  );

  /* ---------------- Interference: centre constructive, edge amplitude ---------------- */
  await openSim(page, 'interference');
  let zCentre = 0,
    zEdge = 0;
  for (let k = 0; k < 25; k++) {
    const s = await probe(page);
    zCentre = Math.max(zCentre, Math.abs(s.zAtOrigin));
    zEdge = Math.max(zEdge, Math.abs(s.zAtRightEdge));
    await page.waitForTimeout(100);
  }
  const iv = await probe(page);
  check(
    'interference: the midpoint stays fully constructive',
    zCentre > 1.9,
    `max |z| at centre ${zCentre.toFixed(3)} (limit 2)`
  );
  check(
    'interference: the edge oscillates at 2|cos(kd/2)|',
    Math.abs(zEdge - iv.edgeAmp) < 0.1,
    `measured ${zEdge.toFixed(3)} vs predicted ${iv.edgeAmp.toFixed(3)}`
  );

  /* ---------------- Refraction: Snell, critical angle, TIR ---------------- */
  await openSim(page, 'refraction');
  const rf = await probe(page);
  check(
    'refraction: n₁ sin θ₁ = n₂ sin θ₂',
    rel(rf.sin2, (rf.n1 / rf.n2) * Math.sin(rf.th1)) < 1e-9,
    `sin θ₂ ${rf.sin2.toFixed(6)}`
  );
  check(
    'refraction: the critical angle is asin(n₁/n₂)',
    rel(rf.critDeg, (Math.asin(rf.n1 / rf.n2) * 180) / Math.PI) < 1e-9,
    `${rf.critDeg.toFixed(3)}°`
  );
  await setRange(page, 0, 1.5);
  await setRange(page, 1, 1);
  await setRange(page, 2, 60);
  const tir = await probe(page);
  check(
    'refraction: past the critical angle the ray totally reflects',
    tir.tir === true && tir.th2Deg === null,
    `sin θ₂ ${tir.sin2.toFixed(3)} > 1 → TIR`
  );

  /* ---------------- 2D collision: KE survives at e = 1 ---------------- */
  await openSim(page, 'collision2d');
  await page.waitForTimeout(2000);
  const cd = await probe(page);
  check(
    'collision2d: kinetic energy conserved in elastic collisions',
    Math.abs(cd.ke - cd.ke0) / cd.ke0 < 0.02,
    `KE ${cd.ke.toFixed(2)} J vs initial ${cd.ke0.toFixed(2)} J`
  );

  /* ---------------- Heat engine: Carnot efficiency and work ---------------- */
  await openStatic(page, 'thermo-engine');
  const th = await probe(page);
  check(
    'heat engine: efficiency equals the Carnot value',
    rel(th.eff, 1 - th.tc / th.th) < 1e-12,
    `η ${(th.eff * 100).toFixed(3)}%`
  );
  check(
    'heat engine: work equals Q_in − Q_out',
    rel(th.W, th.Qin - th.Qout) < 1e-9,
    `W ${th.W.toFixed(1)} J vs Qin−Qout ${(th.Qin - th.Qout).toFixed(1)} J`
  );
  check(
    'heat engine: isothermal heat is nRTh ln(V₂/V₁)',
    rel(th.Qin, 332.56 * th.th * Math.log(3)) < 1e-9,
    `Qin ${th.Qin.toFixed(1)} J`
  );

  /* ---------------- Kinetic gas: v_rms = √(3RT/M) ---------------- */
  await openSim(page, 'ktg-gas');
  const kg300 = await probe(page);
  check(
    'kinetic gas: v_rms = √(3RT/M)',
    rel(kg300.vRms, Math.sqrt((3 * 8.314 * kg300.T) / 0.032)) < 1e-9,
    `${kg300.vRms.toFixed(3)} m/s at ${kg300.T} K`
  );
  await setRange(page, 0, 600);
  const kg600 = await probe(page);
  check(
    'kinetic gas: v_rms scales as √T',
    Math.abs(kg600.vRms / kg300.vRms - Math.SQRT2) < 1e-5,
    `ratio ${(kg600.vRms / kg300.vRms).toFixed(6)} vs √2`
  );

  /* ---------------- Bohr atom: levels, radius, Lyman photon ---------------- */
  await openSim(page, 'atoms-bohr');
  const b1 = await probe(page);
  await setRange(page, 0, 2);
  const b2 = await probe(page);
  check(
    'bohr: ground state has r = 0.53 Å and E = −13.6 eV',
    Math.abs(b1.radiusA - 0.53) < 1e-9 &&
      Math.abs(b1.energyEv + 13.6) < 1e-9 &&
      b1.photonNm === null,
    `r ${b1.radiusA} Å, E ${b1.energyEv} eV`
  );
  check(
    'bohr: n = 2 is 4× wider and Lyman-α is 121.6 nm',
    Math.abs(b2.radiusA - 2.12) < 1e-9 &&
      Math.abs(b2.energyEv + 3.4) < 1e-9 &&
      Math.abs(b2.photonNm - 121.5686) < 0.01,
    `r ${b2.radiusA} Å, E ${b2.energyEv} eV, λ ${b2.photonNm} nm`
  );

  /* ---------------- NCERT: echo, mirror, eye ---------------- */
  await openSim(page, 'ncert9-echo');
  const ec = await probe(page);
  check(
    'echo: the round trip is 2d/v',
    rel(ec.roundTrip, (2 * ec.d) / ec.v) < 1e-9 && ec.echo === ec.roundTrip >= 0.1,
    `${ec.roundTrip.toFixed(3)} s at ${ec.d} m`
  );

  await openStatic(page, 'ncert10-mirror');
  const mi = await probe(page);
  check(
    'mirror (concave): 1/f = 1/u + 1/v gives a real inverted image',
    Math.abs(mi.v + 37.5) < 1e-9 &&
      Math.abs(mi.m + 1.5) < 1e-9 &&
      mi.nature === 'real' &&
      rel(1 / mi.f, 1 / mi.u + 1 / mi.v) < 1e-9,
    `v ${mi.v} cm, m ${mi.m}`
  );
  await setRange(page, 0, 1);
  const mc = await probe(page);
  check(
    'mirror (convex): same equation, virtual erect image',
    Math.abs(mc.v - 9.375) < 1e-9 &&
      Math.abs(mc.m - 0.375) < 1e-9 &&
      mc.nature === 'virtual' &&
      rel(1 / mc.f, 1 / mc.u + 1 / mc.v) < 1e-9,
    `f ${mc.f} cm, v ${mc.v} cm, m ${mc.m}`
  );

  await openStatic(page, 'ncert10-eye');
  const ey = await probe(page);
  check(
    'eye: f = 1/P and myopia needs a diverging lens',
    Math.abs(ey.fCm - 100 / ey.P) < 1e-9 && ey.correct === true,
    `P ${ey.P} D → f ${ey.fCm} cm`
  );

  /* ---------------- NCERT: heating, vernier, skater, solids, venturi, PV ---------------- */
  await openStatic(page, 'ncert10-heating');
  const ht = await probe(page);
  check(
    'heating: daily kWh, monthly bill and current follow the formulas',
    rel(ht.dailyKWh, (ht.P * ht.h) / 1000) < 1e-9 &&
      rel(ht.monthlyCost, 30 * ht.dailyKWh * ht.rate) < 1e-9 &&
      rel(ht.current, ht.P / 220) < 1e-9,
    `${ht.dailyKWh} kWh/day, ₹${ht.monthlyCost.toFixed(0)}/month`
  );

  await openStatic(page, 'ncert11-measure');
  const me = await probe(page);
  check(
    'vernier: reading = MSR + VC × LC',
    Math.abs(me.reading - (me.MSR + me.VC * me.LC)) < 1e-9 &&
      Math.abs(me.byFormula - (me.MSR + me.VC * me.LC)) < 1e-9,
    `${me.MSR} + ${me.VC}×${me.LC} = ${me.reading} mm`
  );

  await openSim(page, 'ncert11-rotation');
  const ro0 = await probe(page);
  await setRange(page, 0, 0.4);
  await page.waitForTimeout(400);
  const ro1 = await probe(page);
  check(
    'skater: angular momentum survives pulling the arms in',
    Math.abs(ro1.L - ro0.L) / ro0.L < 0.02,
    `L ${ro0.L.toFixed(3)} → ${ro1.L.toFixed(3)} kg·m²/s`
  );
  check(
    'skater: halving the radius quadruples ω',
    Math.abs(ro1.omega / ro0.omega - 4) / 4 < 0.02,
    `ω ${ro0.omega.toFixed(2)} → ${ro1.omega.toFixed(2)} rad/s`
  );

  await openStatic(page, 'ncert11-solids');
  const so = await probe(page);
  await setRange(page, 0, 1);
  const sr = await probe(page);
  check(
    'solids: Young modulus is σ/ε for steel and rubber',
    rel(so.E, 2e11) < 1e-9 && rel(sr.E, 1e7) < 1e-9 && sr.material === 'rubber',
    `steel ${so.E_GPa} GPa, rubber ${sr.E_GPa} GPa`
  );

  await openSim(page, 'ncert11-venturi');
  const ve = await probe(page);
  check(
    'venturi: continuity and Bernoulli hold across the constriction',
    rel(ve.continuityIn, ve.continuityOut) < 1e-9 &&
      rel(ve.dP, 0.5 * ve.rho * (ve.v2 * ve.v2 - ve.v1 * ve.v1)) < 1e-9,
    `A₁v₁ ${ve.continuityIn.toFixed(3)} = A₂v₂ ${ve.continuityOut.toFixed(3)}, ΔP ${ve.dP.toFixed(0)} Pa`
  );

  await openStatic(page, 'ncert11-pv');
  await setRange(page, 0, 2);
  const pv2 = await probe(page);
  await setRange(page, 0, 3);
  const pv3 = await probe(page);
  await setRange(page, 0, 0);
  const pv0 = await probe(page);
  check(
    'pv diagram: only closed cycles enclose a work area',
    Math.abs(pv2.area - 0.21) < 1e-9 &&
      Math.abs(pv3.area - 0.1828) < 1e-9 &&
      pv0.closed === false &&
      pv0.area === null,
    `isobaric 0.21, Carnot 0.1828, open → null`
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
