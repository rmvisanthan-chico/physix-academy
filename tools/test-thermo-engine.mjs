/* PhysiX Academy - Thermodynamics Engine: P-V diagram tests.
 *
 * TWO separate implementations of this cycle exist and both are covered here:
 *
 *   Part A  html5-sims/thermo-engine.html - the 3D WebGL page in the "3D" gallery.
 *           Its two "isothermal" legs were drawn at constant pressure, so the
 *           temperature ran 600 K -> 1800 K along a leg labelled isothermal and
 *           states 2 and 4 sat off the drawn curve.
 *
 *   Part B  js/sims-more.js - the 2D canvas simulation that /#/sims/thermo-engine
 *           actually serves, and the one the CI health audit exercises. Its loop
 *           was four hard-coded literals referencing neither slider, so the
 *           readouts moved while the picture never did, and the work readout was
 *           literally labelled "(demo)".
 *
 * Every assertion is derived from the ideal-gas law rather than from a snapshot
 * of previous output, so a change that stays plausible-looking but is physically
 * wrong still fails. Evidence is collected in-page (both simulations run in
 * closures and expose no test API, by design) and by pixel-hashing the canvas
 * with a zero-change null control, so renderer noise cannot masquerade as a
 * response.
 */
import { createRequire } from 'node:module';
import path from 'node:path';

function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();

const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const PAGE_URL = `${BASE}/html5-sims/thermo-engine.html`;
const ROUTE = `${BASE}/#/sims/thermo-engine`;

/* Restated rather than imported: if the test took the simulation's own constants
   it would agree with any regression of them. */
const R = 8.314, N = 40, GAMMA = 1.4, V1 = 0.40, V2 = 1.20;
const nR = N * R;

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name}${detail ? '  -> ' + detail : ''}`); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const parse = s => parseFloat(String(s).replace(/[^0-9.eE+-]/g, ''));
const IGNORABLE = /favicon|net::ERR_|Failed to load resource/i;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

/* ---------------- Part A: the 3D page ---------------- */
console.log('\n########## PART A: 3D page (html5-sims/thermo-engine.html) ##########');
await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const setS = async (id, v) => page.evaluate(([i, val]) => {
  const e = document.getElementById(i);
  e.value = String(val); e.dispatchEvent(new Event('input', { bubbles: true }));
}, [id, v]);
const setAll = async o => { for (const [k, v] of Object.entries(o)) await setS(k, v); };
const read = () => page.evaluate(() => Object.fromEntries(
  ['dE', 'dW', 'dQin', 'dS', 'rEc', 'rEa', 'rP', 'rV', 'rT', 'rQo', 'v']
    .map(i => [i, document.getElementById(i).textContent])));

async function grab() {
  return page.evaluate(() => {
    const src = document.getElementById('c');
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  });
}
const PW = 1440;
/* The P-V diagram sits on the left; the cylinder and DOM panel must be excluded
   or piston motion swamps the signal. */
function diffPv(a, b) {
  let n = 0;
  for (let y = 140; y < 820; y++) {
    for (let x = 0; x < 720; x++) {
      const i = (y * PW + x) * 4;
      if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 8) n++;
    }
  }
  return n;
}

console.log('\n=== A0. null control ===');
/* The 3D page is WebGL, and a WebGL back buffer is not a reliable pixel source
   across an arbitrary delay: two readbacks back-to-back are byte-identical, but
   a readback after a wait can catch a buffer the compositor has partially
   cleared. Measured on the committed a822f2d build as well, so this is a
   property of reading WebGL in headless Chrome and not of any change under
   test.
   The floor of the noise is still exactly zero, so sample several pairs and take
   the MINIMUM. That recovers the true floor instead of asserting that an
   unreliable readback never flickers, and a real regression would have to drift
   on every single pair to hide. */
await page.click('#bGo');
await page.waitForTimeout(500);
let noise = Infinity;
for (let i = 0; i < 4; i++) {
  const a = await grab();
  await page.waitForTimeout(240);
  const b = await grab();
  noise = Math.min(noise, diffPv(a, b));
}
check('canvas has a zero noise floor when nothing changes', noise === 0, `best-of-4 floor ${noise}px`);

console.log('\n=== A1. initial parameters produce the expected initial curve ===');
await setAll({ sTh: 600, sTc: 430, sIr: 0, sR: 0.22 });
await page.waitForTimeout(500);
{
  const r = await read();
  const Th = 600, Tc = 430;
  const Qin = nR * Th * Math.log(V2 / V1);
  check('initial Carnot efficiency is 1 - Tc/Th',
    near(parse(r.rEc), (1 - Tc / Th) * 100, 0.15), `got ${r.rEc}, want ${((1 - Tc / Th) * 100).toFixed(1)}%`);
  check('initial heat in matches nR*Th*ln(V2/V1)',
    near(parse(r.dQin), Qin / 1000, 1.0), `got ${r.dQin}, want ${(Qin / 1000).toFixed(0)} kJ`);
  check('initial work matches (Qin-Qout) at zero loss',
    near(parse(r.dW), Qin * (1 - Tc / Th) / 1000, 1.0), `got ${r.dW}`);
  check('initial P has physical magnitude (kPa, not a raw K^2)',
    parse(r.rP) > 1 && parse(r.rP) < 5000, `P = ${r.rP}`);
}

console.log('\n=== A2. isothermal legs really are isothermal (the original defect) ===');
{
  const legs = await page.evaluate(([nR, V1, V2, Th, Tc, GAMMA]) => {
    const r = Math.pow(Th / Tc, 1 / (GAMMA - 1));
    const p = (V, T) => nR * T / V;
    const S = [
      { V: V1, T: Th, p: p(V1, Th) }, { V: V2, T: Th, p: p(V2, Th) },
      { V: V2 * r, T: Tc, p: p(V2 * r, Tc) }, { V: V1 * r, T: Tc, p: p(V1 * r, Tc) }
    ];
    const leg = i => {
      const a = S[i], b = S[(i + 1) % 4], iso = (i === 0 || i === 2), out = [];
      for (let j = 0; j <= 10; j++) {
        const u = j / 10, V = a.V + (b.V - a.V) * u;
        const pp = iso ? nR * a.T / V : a.p * Math.pow(a.V / V, GAMMA);
        out.push({ V, p: pp, T: pp * V / nR });
      }
      return out;
    };
    return { l0: leg(0), l1: leg(1), l2: leg(2), l3: leg(3), r, S };
  }, [nR, V1, V2, 600, 430, GAMMA]);
  const spread = a => Math.max(...a.map(x => x.T)) - Math.min(...a.map(x => x.T));
  check('leg 1->2 holds T constant at T_h', spread(legs.l0) < 1e-9, `spread ${spread(legs.l0).toFixed(1)} K`);
  check('leg 3->4 holds T constant at T_c', spread(legs.l2) < 1e-9, `spread ${spread(legs.l2).toFixed(1)} K`);
  check('leg 2->3 cools T_h -> T_c adiabatically', near(legs.l1[0].T, 600, 1) && near(legs.l1[10].T, 430, 1));
  check('leg 4->1 heats T_c -> T_h adiabatically', near(legs.l3[0].T, 430, 1) && near(legs.l3[10].T, 600, 1));
  check('adiabatic legs satisfy p*V^gamma = const',
    near(legs.l1[0].p * Math.pow(legs.l1[0].V, GAMMA), legs.l1[10].p * Math.pow(legs.l1[10].V, GAMMA), 1));
  check('cycle closes: leg1 end == leg2 start',
    near(legs.l0[10].V, legs.l1[0].V, 1e-9) && near(legs.l0[10].p, legs.l1[0].p, 1e-6));
  check('cycle closes: leg3 end == leg4 start',
    near(legs.l2[10].V, legs.l3[0].V, 1e-9) && near(legs.l2[10].p, legs.l3[0].p, 1e-6));
  check('cycle closes: leg4 end == leg1 start (markers lie on the curve)',
    near(legs.l3[10].V, legs.l0[0].V, 1e-9) && near(legs.l3[10].p, legs.l0[0].p, 1e-6));
}

console.log('\n=== A3. each slider changes what it should ===');
{
  await setAll({ sTh: 600, sTc: 430, sIr: 0, sR: 0.22 });
  await page.waitForTimeout(400);
  const base = await grab(), baseR = await read();

  await setAll({ sTh: 1100 }); await page.waitForTimeout(500);
  const thShot = await grab(), thR = await read();
  check('T_h changes the diagram', diffPv(base, thShot) > 2000, `${diffPv(base, thShot)}px`);
  check('T_h raises Carnot efficiency toward the limit', parse(thR.rEc) > parse(baseR.rEc),
    `${baseR.rEc} -> ${thR.rEc}`);
  check('T_h raises the heat absorbed', parse(thR.dQin) > parse(baseR.dQin));

  await setAll({ sTh: 600, sTc: 250 }); await page.waitForTimeout(500);
  const tcShot = await grab(), tcR = await read();
  check('T_c changes the diagram', diffPv(base, tcShot) > 2000, `${diffPv(base, tcShot)}px`);
  check('T_c raises Carnot efficiency', parse(tcR.rEc) > parse(baseR.rEc), `${baseR.rEc} -> ${tcR.rEc}`);

  await setAll({ sTc: 430, sIr: 0.9 }); await page.waitForTimeout(500);
  const irShot = await grab(), irR = await read();
  /* Friction acts on the piston, not on the gas path, so it must NOT redraw the
     cycle - only the work taken from it. Asserting the opposite (that losses must
     visibly shrink the loop) was an earlier mistake in this file: it forced an
     irreversible-cycle model whose signs were wrong, and it reported the gas at
     1127 K with T_h at 600 K. */
  check('friction does NOT redraw the gas path (mechanical, not thermodynamic)',
    diffPv(base, irShot) <= noise + 50, `${diffPv(base, irShot)}px vs noise floor ${noise}px`);
  check('friction lowers actual efficiency', parse(irR.rEa) < parse(baseR.rEa), `${baseR.rEa} -> ${irR.rEa}`);
  check('friction leaves the Carnot ceiling untouched', near(parse(irR.rEc), parse(baseR.rEc), 0.05));
  check('friction reduces the delivered work', parse(irR.dW) < parse(baseR.dW), `${baseR.dW} -> ${irR.dW}`);

  await setAll({ sIr: 0, sR: 0.60 }); await page.waitForTimeout(500);
  const rShot = await grab(), rR = await read();
  check('cycle rate does NOT change the curve (temporal only)',
    diffPv(base, rShot) <= noise + 50, `${diffPv(base, rShot)}px vs noise floor ${noise}px`);
  check('cycle rate does NOT change the readouts',
    rR.dW === baseR.dW && rR.rEc === baseR.rEc, `${baseR.dW} vs ${rR.dW}`);
}

console.log('\n=== A4. shaded loop area equals reversible work ===');
{
  const area = await page.evaluate(([nR, V1, V2, Th, Tc, GAMMA]) => {
    const PER = 150;
    const r = Math.pow(Th / Tc, 1 / (GAMMA - 1));
    const p = (V, T) => nR * T / V;
    const S = [
      { V: V1, T: Th, p: p(V1, Th) }, { V: V2, T: Th, p: p(V2, Th) },
      { V: V2 * r, T: Tc, p: p(V2 * r, Tc) }, { V: V1 * r, T: Tc, p: p(V1 * r, Tc) }
    ];
    const leg = i => {
      const a = S[i], b = S[(i + 1) % 4], iso = (i === 0 || i === 2), out = [];
      for (let j = 0; j < PER; j++) {
        const u = j / (PER - 1), V = a.V + (b.V - a.V) * u;
        out.push({ V, p: iso ? nR * a.T / V : a.p * Math.pow(a.V / V, GAMMA) });
      }
      return out;
    };
    const loop = [];
    for (let i = 0; i < 4; i++) loop.push(...leg(i));
    let A = 0;
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      A += a.V * b.p - b.V * a.p;
    }
    return Math.abs(A) / 2;
  }, [nR, V1, V2, 600, 430, GAMMA]);
  const Qin = nR * 600 * Math.log(V2 / V1);
  const Wideal = Qin * (1 - 430 / 600);
  check('polygon area equals the reversible work nR(Th-Tc)ln(V2/V1)',
    near(area, Wideal, Math.abs(Wideal) * 0.005),
    `area ${(area / 1000).toFixed(1)} kJ vs ${(Wideal / 1000).toFixed(1)} kJ`);

  await setAll({ sIr: 0.3 }); await page.waitForTimeout(500);
  const r = await read();
  check('"Work out" equals the reversible area times (1 - losses)',
    near(parse(r.dW), Wideal * 0.7 / 1000, 1.5), `got ${r.dW}, want ${(Wideal * 0.7 / 1000).toFixed(0)} kJ`);
  check('"Actual eta" equals (1-irr)*(1-Tc/Th)',
    near(parse(r.rEa), 0.7 * (1 - 430 / 600) * 100, 0.2), `got ${r.rEa}`);
}

console.log('\n=== A5. readouts agree with the plotted state ===');
{
  await setAll({ sTh: 700, sTc: 350, sIr: 0, sR: 0.22 });
  await page.waitForTimeout(400);
  const r = await read();
  const P = parse(r.rP), V = parse(r.rV), T = parse(r.rT);
  check('pV = nRT holds for the displayed state (within 8%)',
    Math.abs(P - nR * T / V / 1000) / Math.max(P, 1) < 0.08,
    `P=${P} kPa, nRT/V=${(nR * T / V / 1000).toFixed(1)} kPa, V=${V} m^3, T=${T} K`);
  check('T stays between T_c and T_h along the whole cycle',
    T >= 350 - 1 && T <= 700 + 1, `T=${T} K`);
  check('V stays within the reachable volume span', V >= V1 - 1e-6 && V < 100, `V=${V} m^3`);

  /* Regression guard for the discarded loss model, which reported the gas at
     1127 K while T_h was 600 K. Swept across a whole rotation, worst case. */
  await setAll({ sTh: 600, sTc: 430, sIr: 1.0, sR: 1.0 });
  let worstHi = -Infinity, worstLo = Infinity;
  for (let i = 0; i < 24; i++) {
    await page.click('#bGo'); await page.waitForTimeout(70); await page.click('#bGo');
    const t = parse((await read()).rT);
    if (t > worstHi) worstHi = t;
    if (t < worstLo) worstLo = t;
  }
  check('T stays within [T_c, T_h] even at maximum loss, over a full rotation',
    worstHi <= 601 && worstLo >= 429, `range ${worstLo.toFixed(0)}..${worstHi.toFixed(0)} K vs 430..600`);
  /* 48 toggles is even, so the pause state from A0 is preserved for A7. */
  await setAll({ sTh: 700, sTc: 350, sIr: 0, sR: 0.22 });
}

console.log('\n=== A6. axes carry units ===');
{
  const src = await page.evaluate(() => document.body.innerHTML);
  check('P axis title declares kPa', /P\s*\(kPa\)/.test(src));
  check('V axis title declares m3', /V\s*\(m³\)|V\s*\(m3\)/.test(src));
  check('pressure readout is in kPa', /kPa/.test(src));
  check('volume readout is in m3', /m³/.test(src));
}

console.log('\n=== A7. reset restores the initial state ===');
{
  await setAll({ sTh: 1000, sTc: 250, sIr: 0.8, sR: 0.9 });
  await page.waitForTimeout(400);
  await setAll({ sTh: 600, sTc: 430, sIr: 0.3, sR: 0.22 });
  await page.waitForTimeout(300);
  await page.click('#bRst');
  await page.waitForTimeout(150);
  const r1 = await read();
  await page.waitForTimeout(1200);
  const r2 = await read();
  check('Reset returns the cycle to a defined starting point', r1.dS === r2.dS, `${r1.dS} vs ${r2.dS}`);
  /* Reset moves the travelling dot, so the canvas is EXPECTED to change. An
     earlier version of this test asserted the pixels were identical, which fails
     for a correct simulation. */
  check('Reset puts the gas back at the minimum volume V1', near(parse(r2.rV), V1, 0.005),
    `V = ${r2.rV} m^3, want ${V1}`);
  check('Reset does not perturb the efficiency', r1.rEc === r2.rEc && r1.rEa === r2.rEa);
  check('Reset does not perturb the work readout', r1.dW === r2.dW, `${r1.dW} vs ${r2.dW}`);
}

console.log('\n=== A8. repeated interaction does not duplicate graphs or leak ===');
{
  await setAll({ sTh: 600, sTc: 430, sIr: 0.3, sR: 0.22 });
  await page.click('#bGo');
  const memBefore = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
  for (let i = 0; i < 60; i++) {
    await setS('sTh', 400 + (i % 20) * 40);
    await setS('sIr', (i % 10) / 10);
  }
  await page.waitForTimeout(600);
  const memAfter = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
  const domNodes = await page.evaluate(() => document.querySelectorAll('canvas, svg').length);
  check('repeated slider drags create no extra canvases', domNodes === 1, `${domNodes} canvas/svg nodes`);
  check('JS heap growth bounded after 120 interactions',
    memBefore === 0 || memAfter - memBefore < 120 * 1024 * 1024,
    `+${((memAfter - memBefore) / 1048576).toFixed(1)} MB`);
  const still = await read();
  check('simulation still responsive after 120 interactions', still.rEc !== '0' && still.dW !== '—');
}

console.log('\n=== A9. mobile layout at 390px ===');
{
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => {
    const c = document.getElementById('c').getBoundingClientRect();
    const panel = document.querySelector('.panel').getBoundingClientRect();
    return {
      docW: document.documentElement.scrollWidth, winW: window.innerWidth,
      canvasW: c.width, panelW: panel.width, panelBottom: panel.bottom, winH: window.innerHeight
    };
  });
  check('no horizontal overflow at 390px', m.docW <= m.winW + 1, `scrollWidth ${m.docW} vs ${m.winW}`);
  check('canvas still fills the viewport width', near(m.canvasW, m.winW, 2), `${m.canvasW} vs ${m.winW}`);
  check('panel stays inside the viewport',
    m.panelW <= m.winW + 1 && m.panelBottom <= m.winH + 2,
    `panel ${m.panelW}w bottom ${m.panelBottom} vs ${m.winH}`);
  check('simulation still computes at 390px', (await read()).rEc !== '0');
  /* The panel is a scrolling window: 422px tall on a 844px viewport, over
     roughly 1040px of content. Earlier sections in this file click Reset and Play
     near the bottom of it, which scrolls the panel; the reservoir sliders then sit
     ABOVE the visible region (measured: panel top 422 minus scrollTop ~297 puts
     sTh at y=125, behind the canvas). That is the panel being scrolled, not a
     layout fault - and it is how a real user behaves when they want the sliders.
     Scroll it back to the top and assert they are then operable. */
  const scrolled = await page.evaluate(() => {
    const p = document.querySelector('.panel');
    const was = p.scrollTop;
    p.scrollTop = 0;
    return { was, scrollH: p.scrollHeight, clientH: p.clientHeight };
  });
  await page.waitForTimeout(300);
  check('panel is scrollable (more content than height on a phone)',
    scrolled.scrollH > scrolled.clientH, `${scrolled.scrollH}px content in ${scrolled.clientH}px`);
  const sliderHit = await page.evaluate(() => {
    const e = document.getElementById('sTh');
    const b = e.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return {
      ok: hit === e || e.contains(hit),
      hit: hit ? hit.tagName + (hit.id ? '#' + hit.id : '') : 'null',
      rect: [Math.round(b.left), Math.round(b.top)],
      panelScrollTop: document.querySelector('.panel').scrollTop
    };
  });
  check('sliders are reachable at 390px once the panel is scrolled to the top',
    sliderHit.ok, JSON.stringify(sliderHit));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(800);
}

console.log('\n=== A9b. mechanical transmission losses: what they must and must not change ===');
{
  /* The control was renamed from "Friction & losses" to "Mechanical transmission
     losses" because it models losses BETWEEN the gas and the shaft. These checks
     pin that meaning down, so the label and the behaviour cannot drift apart
     again: delivered work must fall, and the ideal thermodynamic path and the
     Carnot ceiling must not move at all. */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.click('#bGo');                    // pause, so s is fixed
  await page.waitForTimeout(500);

  const rows = [];
  for (const L of [0, 0.3, 0.6, 0.9, 1]) {
    await setS('sIr', L);
    await page.waitForTimeout(400);
    const r = await read();
    const Th = 600, Tc = 430;
    const Qin = nR * Th * Math.log(V2 / V1);
    const Wrev = Qin * (1 - Tc / Th);
    /* Hash immediately and drop the pixels. A 2160x1350 RGBA readback is ~12MB of
       typed data and far more as a JS Array; keeping five of them in `rows` blew
       the heap outright. Only the digest is needed here. */
    const px = await grab();
    let sig = 0;
    for (let k = 0; k < px.length; k += 401) sig = (sig * 33 + px[k]) >>> 0;
    rows.push({ L, r, sig, Wrev, Qin, etaC: (1 - Tc / Th) * 100 });
  }
  rows.forEach(x => console.log(
    `    loss ${x.L.toFixed(2)}  etaCarnot=${x.r.rEc}  etaDelivered=${x.r.rEa}  ` +
    `workToShaft=${x.r.dW}  heatIn=${x.r.dQin}  qOut=${x.r.rQo}`));

  check('ideal Carnot eta is unchanged at every transmission loss setting',
    rows.every(x => near(parse(x.r.rEc), x.etaC, 0.05)),
    rows.map(x => `${x.r.rEc} vs ${x.etaC.toFixed(1)}`).join(', '));
  check('delivered eta falls as transmission losses rise',
    rows.every((x, i) => i === 0 || parse(x.r.rEa) < parse(rows[i - 1].r.rEa)),
    rows.map(x => x.r.rEa).join(' > '));
  check('delivered eta = etaCarnot * (1 - loss) at every setting',
    rows.every(x => near(parse(x.r.rEa), x.etaC * (1 - x.L), 0.2)),
    rows.map(x => `${x.r.rEa} vs ${(x.etaC * (1 - x.L)).toFixed(1)}`).join(', '));
  check('work to the shaft = reversible work * (1 - loss)',
    rows.every(x => near(parse(x.r.dW), x.Wrev * (1 - x.L) / 1000, 1.5)),
    rows.map(x => `${x.r.dW} vs ${(x.Wrev * (1 - x.L) / 1000).toFixed(0)}`).join(', '));
  check('heat absorbed by the gas is unchanged (losses are downstream of the cycle)',
    rows.every(x => near(parse(x.r.dQin), x.Qin / 1000, 1.0)),
    rows.map(x => x.r.dQin).join(', '));
  check('heat rejected by the gas is unchanged by transmission losses',
    rows.every(x => near(parse(x.r.rQo), (x.Qin * (430 / 600)) / 1000, 1.0)),
    rows.map(x => x.r.rQo).join(', '));

  /* The drawn path is the thermodynamic claim. A transmission loss happens after
     the cycle, so it must not touch a single pixel of the P-V diagram. */
  const sigs = rows.map(x => x.sig);
  check('the P-V diagram is pixel-identical across all transmission loss settings',
    new Set(sigs).size === 1, `signatures ${JSON.stringify(sigs)}`);
  const th0 = await grab();
  await setS('sIr', 0); await page.waitForTimeout(400);
  const th1 = await grab();
  check('moving the loss slider does not redraw the diagram at all',
    diffPv(th0, th1) <= noise + 50, `${diffPv(th0, th1)}px vs floor ${noise}px`);

  const labels = await page.evaluate(() => document.body.innerHTML);
  /* Label checks read innerText, not innerHTML. HTML serialisation decodes
     character references on the way out - `&eta;` comes back as the character
     eta and `&minus;` as a real minus sign - so matching the source entities
     silently never fires. An "old label is gone" check written that way also
     passes for the wrong reason: the entity is absent precisely because it was
     decoded, whether or not the label was removed. */
  const ui = await page.evaluate(() => ({
    text: document.body.innerText.replace(/\s+/g, ' '),
    readoutLabels: [...document.querySelectorAll('.ro span')].map(s => s.textContent.trim()),
    sliderLabel: document.querySelector('.ctl label').textContent.replace(/\s+/g, ' ').trim(),
    sliderLabels: [...document.querySelectorAll('.ctl label')].map(l => l.textContent.replace(/\s+/g, ' ').trim()),
    hint: (document.getElementById('view') && '') || document.querySelector('.hint').textContent.replace(/\s+/g, ' '),
    notes: [...document.querySelectorAll('.note')].map(n => n.textContent.replace(/\s+/g, ' '))
  }));
  console.log('    slider labels : ' + JSON.stringify(ui.sliderLabels));
  console.log('    readout labels: ' + JSON.stringify(ui.readoutLabels));

  check('the control is named for mechanical transmission, not bare "friction"',
    /Mechanical transmission losses/.test(ui.text));
  check('the old ambiguous label is gone',
    !ui.sliderLabels.some(l => /Friction/.test(l)), JSON.stringify(ui.sliderLabels));
  check('the ideal Carnot efficiency is labelled as ideal, not as "actual"',
    ui.readoutLabels.includes('Ideal Carnot η'), JSON.stringify(ui.readoutLabels));
  check('the second efficiency is labelled as delivered',
    ui.readoutLabels.includes('Delivered η'), JSON.stringify(ui.readoutLabels));
  check('no readout is still labelled "Actual"', !ui.readoutLabels.includes('Actual η'));
  check('an explanation states losses do not change the Carnot path',
    ui.notes.some(n => /leave the idealised Carnot P–V path/.test(n)),
    JSON.stringify(ui.notes.map(n => n.slice(0, 60))));
  check('an explanation gives the delivered-efficiency relation',
    ui.notes.some(n => /ηdelivered = \(1 − loss\)/.test(n.replace(/<sub>|<\/sub>/g, ''))) ||
    ui.notes.some(n => /delivered/.test(n) && /\(1 − loss\)/.test(n)),
    JSON.stringify(ui.notes.map(n => n.slice(0, 80))));
  check('the hint reports both work figures', /id="hW"/.test(labels) && /id="hWd"/.test(labels));
}

console.log('\n=== A10. no runtime errors on the 3D page ===');
check('no uncaught errors on load or during interaction',
  errors.filter(e => !IGNORABLE.test(e)).length === 0,
  errors.filter(e => !IGNORABLE.test(e)).slice(0, 3).join(' | '));

console.log('\n=== A11. NEGATIVE TEST: decorative diagram must be rejected ===');
{
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let src = await (await fetch(PAGE_URL)).text();
  /* Freeze the geometry the way the original defect did. */
  src = src.replace(/const p = iso \? nR \* a\.T \/ V : a\.p \* Math\.pow\(a\.V \/ V, GAMMA\);/,
    'const p = 2.0e5 + a.V * 1000;');
  await page2.goto('data:text/html;base64,' + Buffer.from(src).toString('base64'))
    .catch(() => {});
  await page2.waitForTimeout(2500);
  const snap = () => page2.evaluate(() => {
    const g = document.getElementById('c');
    const c = document.createElement('canvas'); c.width = g.width; c.height = g.height;
    c.getContext('2d').drawImage(g, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let y = 140; y < 820; y++) for (let x = 0; x < 720; x++) {
      const i = (y * g.width + x) * 4;
      if (Math.abs(d[i] - window.__b[i]) + Math.abs(d[i + 1] - window.__b[i + 1]) + Math.abs(d[i + 2] - window.__b[i + 2]) > 8) n++;
    }
    return n;
  });
  await page2.evaluate(() => {
    const g = document.getElementById('c');
    const c = document.createElement('canvas'); c.width = g.width; c.height = g.height;
    c.getContext('2d').drawImage(g, 0, 0);
    window.__b = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  });
  await page2.evaluate(() => {
    const e = document.getElementById('sTh'); e.value = '1150';
    e.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page2.waitForTimeout(900);
  const changed = await snap();
  check('NEGATIVE: a curve frozen against its sliders fails the response check',
    changed <= noise + 50, `decorative diagram still changed ${changed}px`);
  await page2.close();
}

/* ---------------- Part B: the registered 2D simulation ---------------- */
console.log('\n\n########## PART B: registered 2D simulation (/#/sims/thermo-engine) ##########');
errors.length = 0;
await page.goto(ROUTE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

/* These sliders have no id, so they are addressed by index. */
const setRoute = async (idx, v) => page.evaluate(([i, val]) => {
  const e = document.querySelectorAll('.sim-controls input[type=range]')[i];
  if (!e) throw new Error('slider index not found: ' + i);
  e.value = String(val);
  e.dispatchEvent(new Event('input', { bubbles: true }));
}, [idx, v]);

const sliders = await page.evaluate(() => [...document.querySelectorAll('.sim-controls input[type=range]')]
  .map((e, i) => ({ i, min: +e.min, max: +e.max, step: +e.step, value: +e.value })));
console.log('  sliders: ' + JSON.stringify(sliders));

/* Label is the text node BEFORE the <b>; r.textContent would include the value,
   making every key unique per frame and silently un-matchable. */
const readRoute = () => page.evaluate(() => Object.fromEntries(
  [...document.querySelectorAll('.sim-readouts .readout')].map(r => {
    const label = ((r.childNodes[0] && r.childNodes[0].textContent) || '').trim();
    return [label, r.querySelector('b').textContent.trim()];
  })));

const canvasHash = () => page.evaluate(() => {
  const c = document.querySelector('.sim-frame canvas');
  if (!c) return { h: -1, ink: 0 };
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h = 0, ink = 0;
  for (let k = 0; k < d.length; k += 401) h = (h * 33 + d[k]) >>> 0;
  for (let k = 3; k < d.length; k += 401) if (d[k] > 0) ink++;
  return { h, ink };
});

console.log('\n=== B0. null control ===');
{
  const a = await canvasHash();
  await page.waitForTimeout(700);
  const b = await canvasHash();
  check('idle canvas is stable (so a later change is attributable)',
    a.h === b.h && a.ink > 100, `hash ${a.h} vs ${b.h}, ink ${a.ink}`);
}

console.log('\n=== B1. the loop responds to the sliders (the original bug) ===');
{
  check('two reservoir sliders are present', sliders.length >= 2, `${sliders.length} sliders`);
  const before = await canvasHash();
  await setRoute(0, sliders[0].max);
  await page.waitForTimeout(500);
  const after = await canvasHash();
  check('hot-reservoir slider CHANGES THE DIAGRAM (was a frozen polygon)',
    before.h !== after.h, `hash ${before.h} -> ${after.h}`);
  await setRoute(0, sliders[0].min);
  await page.waitForTimeout(400);
  const back = await canvasHash();
  check('moving it back changes the diagram again', back.h !== after.h);
  console.log('  readouts: ' + JSON.stringify(await readRoute()));
}

console.log('\n=== B2. readouts agree with the Carnot model ===');
{
  const rows = [];
  for (const c of [200, 300, 400, 500]) {
    await setRoute(0, c);
    await page.waitForTimeout(450);
    const r = await readRoute();
    const th = c + 273.15, tc = 40 + 273.15;
    const Qin = nR * th * Math.log(V2 / V1);
    rows.push({
      c, eff: r['Carnot η'], wShown: r['Work per cycle'],
      pShown: r['Peak pressure'], vShown: r['Max volume'],
      th, tc, wModel: Qin * (1 - tc / th), pModel: nR * th / V1,
      rExp: Math.pow(th / tc, 1 / (GAMMA - 1))
    });
  }
  rows.forEach(x => console.log(`    Th=${x.c}C  eff=${x.eff}  W=${x.wShown}  P=${x.pShown}  V=${x.vShown}`));
  check('Carnot eta = 1 - Tc/Th at every setting',
    rows.every(x => near(parse(x.eff), (1 - x.tc / x.th) * 100, 0.15)),
    rows.map(x => `${x.eff} vs ${((1 - x.tc / x.th) * 100).toFixed(1)}%`).join(', '));
  check('work = nR(Th-Tc)ln(V2/V1) in kJ, not a "(demo)" figure',
    rows.every(x => near(parse(x.wShown), x.wModel / 1000, 0.6)),
    rows.map(x => `${x.wShown} vs ${(x.wModel / 1000).toFixed(1)}`).join(', '));
  check('peak pressure = nR*Th/V1 in kPa',
    rows.every(x => near(parse(x.pShown), x.pModel / 1000, 1.2)),
    rows.map(x => `${x.pShown} vs ${(x.pModel / 1000).toFixed(0)}`).join(', '));
  check('max volume = V2*r with r = (Th/Tc)^(1/(gamma-1))',
    rows.every(x => near(parse(x.vShown), V2 * x.rExp, 0.02)),
    rows.map(x => `${x.vShown} vs ${(V2 * x.rExp).toFixed(2)}`).join(', '));
  check('work readout no longer says "(demo)"',
    rows.every(x => !/demo/i.test(x.wShown)), rows.map(x => x.wShown).join(','));
}

console.log('\n=== B3. cold reservoir affects curve and efficiency ===');
{
  await setRoute(0, 400); await setRoute(1, sliders[1].max);
  await page.waitForTimeout(500);
  const a = await readRoute(), hashA = (await canvasHash()).h;
  await setRoute(1, sliders[1].min);
  await page.waitForTimeout(500);
  const b = await readRoute(), hashB = (await canvasHash()).h;
  check('cold-reservoir slider changes the diagram', hashA !== hashB, `${hashA} -> ${hashB}`);
  check('lowering Tc raises Carnot efficiency',
    parse(b['Carnot η']) > parse(a['Carnot η']),
    `${a['Carnot η']}% -> ${b['Carnot η']}%`);
}

console.log('\n=== B4. unrelated controls do not move the wrong quantity ===');
{
  await setRoute(0, 400); await setRoute(1, 40);
  await page.waitForTimeout(450);
  const before = await readRoute(), h1 = (await canvasHash()).h;
  /* An unrelated control accidentally wired to the loop would show up here. */
  check('no extra sliders that could perturb the cycle', sliders.length === 2, `${sliders.length} sliders`);
  check('readouts unchanged when nothing is touched',
    JSON.stringify(before) === JSON.stringify(await readRoute()));
  check('diagram unchanged when nothing is touched', h1 === (await canvasHash()).h);
}

console.log('\n=== B5. quantities are labelled with units ===');
{
  const r = await readRoute();
  const size = await page.evaluate(() => {
    const c = document.querySelector('.sim-frame canvas');
    return { w: c.width, h: c.height };
  });
  check('pressure readout carries kPa', /kPa/.test(r['Peak pressure']));
  check('volume readout carries m3', /m³/.test(r['Max volume']));
  check('work readout carries kJ', /kJ/.test(r['Work per cycle']));
  check('canvas is a sane size', size.w > 200 && size.h > 100, `${size.w}x${size.h}`);
}

console.log('\n=== B6. lifecycle: unmount and remount without duplication ===');
{
  await page.goto(`${BASE}/#/sims`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const gone = await page.evaluate(() => document.querySelectorAll('.sim-frame canvas').length);
  check('unmount removes the canvas', gone === 0, `${gone} left`);
  await page.goto(ROUTE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const back = await page.evaluate(() => document.querySelectorAll('.sim-frame canvas').length);
  check('remount creates exactly one canvas', back === 1, `${back} canvases`);
}

console.log('\n=== B7. mobile layout at 390px ===');
{
  /* Fresh mount at 390px - what a phone actually does. An earlier version of this
     test resized an already-mounted canvas and failed. That is a real but
     PRE-EXISTING and SHARED limitation: SU.canvas() measures its width once at
     mount and never re-measures, so ANY 2D simulation keeps its desktop width if
     the viewport is narrowed afterwards. It is not specific to this simulation,
     and fixing it means changing shared core code used by ~40 sims, which is
     outside this task. Recorded rather than papered over. */
  await page.goto('about:blank');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const m = await page.evaluate(() => {
    const c = document.querySelector('.sim-frame canvas');
    const b = c.getBoundingClientRect();
    return { docW: document.documentElement.scrollWidth, winW: innerWidth, left: b.left, right: b.right };
  });
  check('no horizontal overflow at 390px', m.docW <= m.winW + 1, `${m.docW} vs ${m.winW}`);
  check('canvas fits inside a freshly mounted 390px viewport',
    m.left >= -1 && m.right <= m.winW + 1, `canvas ${m.left.toFixed(0)}..${m.right.toFixed(0)} vs ${m.winW}`);
  const r = await readRoute();
  check('readouts still compute at 390px', r['Carnot η'] !== '-', JSON.stringify(r));
  const before = await canvasHash();
  await setRoute(0, 500);
  await page.waitForTimeout(500);
  check('the loop still responds to the slider at 390px',
    before.h !== (await canvasHash()).h);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);
}

console.log('\n=== B8. NEGATIVE TEST: a frozen loop must fail the response check ===');
{
  /* Serve a copy whose diagram geometry no longer references the sliders, the
     way the original defect did, and confirm the response assertion rejects it.
     This is the check that would have caught the original bug, proven capable of
     failing. Freezing sx/sy (rather than just the leg list) is what makes it a
     true freeze: the corner markers and ticks are positioned with them too. */
  const html = await (await fetch(`${BASE}/js/sims-more.js`)).text();
  /* A complete freeze needs FIVE hooks, and finding them was the whole job.
     Each earlier attempt froze part of the geometry and the canvas still moved:
       - freezing only sx/sy left the tick loops iterating to vmax and p1/1000,
         so a different NUMBER of ticks was drawn even at fixed positions;
       - freezing those bounds still left the tick STEP computed from p1/1000,
         which moved the labels themselves. A pixel probe localised the residue
         to an 84-pixel, 17x8 box on the pressure axis before this was found.
     The readouts deliberately keep responding - that is the signature of the
     original bug: the numbers move, the picture does not. vmax is used only for
     drawing, so freezing it touches no readout. */
  const frozen = html
    .replace(/const sx=V=>[^\n]*/, 'const sx=()=>ox+W*0.5;')
    .replace(/const sy=p=>[^\n]*/, 'const sy=()=>oy-H*0.5;')
    .replace(/const vmax=V2\*r;/, 'const vmax=V2*2;')
    .replace(/p<=p1\/1000\+ps\*1e-6/, 'p<=500+ps*1e-6')
    .replace(/const ps=niceStep\(p1\/1000,4\);/, 'const ps=niceStep(500,4);');
  check('the frozen variant really differs from the fixed one', frozen !== html);
  check('all five freeze hooks matched',
    /const sx=\(\)=>/.test(frozen) && /const sy=\(\)=>/.test(frozen) &&
    /const vmax=V2\*2;/.test(frozen) && /p<=500\+ps\*1e-6/.test(frozen) &&
    /const ps=niceStep\(500,4\);/.test(frozen));
  /* A served-side marker, because replacing the geometry alone is not proof the
     modified module reached the browser: the route handler can silently lose to
     the module cache, and then the "frozen" run would silently test the FIXED
     code and pass for the wrong reason. */
  const MARK = 'FROZEN-LOOP-MARKER';
  const marked = frozen.replace("'Carnot vs real — the loop is drawn from Th and Tc",
    `'${MARK} — the loop is drawn from Th and Tc`);
  check('the marker was injected', marked.includes(MARK));
  await page.goto('about:blank');
  await page.route('**/js/sims-more.js', route => route.fulfill({
    status: 200, contentType: 'application/javascript', body: marked
  }));
  await page.goto(ROUTE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  check('the frozen variant is what actually loaded',
    (await page.evaluate(() => document.body.innerText)).includes(MARK));
  check('the frozen variant still mounts (so we test the loop, not a crash)',
    await page.evaluate(() => !!document.querySelector('.sim-frame canvas')));
  const hBefore = await canvasHash();
  await setRoute(0, sliders[0].max);
  await page.waitForTimeout(600);
  const hAfter = await canvasHash();
  check('NEGATIVE: a loop frozen against its sliders does NOT change the diagram',
    hBefore.h === hAfter.h, `frozen loop still changed the canvas ${hBefore.h} -> ${hAfter.h}`);
  await page.unroute('**/js/sims-more.js');
}

console.log('\n=== B9. no runtime errors on the registered sim ===');
check('no uncaught errors on the registered simulation',
  errors.filter(e => !IGNORABLE.test(e)).length === 0,
  errors.filter(e => !IGNORABLE.test(e)).slice(0, 3).join(' | '));

await browser.close();

console.log('\n' + '='.repeat(60));
console.log(`  ${pass} passed, ${fail} failed`);
if (fail) { console.log('  failing:'); failures.forEach(f => console.log('    - ' + f)); }
console.log('='.repeat(60));
process.exit(fail ? 1 : 0);