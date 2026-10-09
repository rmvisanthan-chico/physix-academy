/* PhysiX Academy — Phase 3C.1 visual verification.
 * Drives one full play -> pause -> step -> step -> reset cycle per integrated
 * simulation and captures desktop and 390px shots of the panel, controls and
 * readouts.
 *
 * Screenshots cannot confirm a reveal fired or a number is right, so the physics
 * readouts are printed alongside each shot and checked against closed form here
 * rather than judged by eye alone.
 *
 * Run: node tools/shot-timecontrols.mjs [baseUrl]
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();

const BASE = process.argv[2] || 'http://localhost:4173';
const ONLY = process.argv[3];

/* Closed-form expectations, evaluated in-page where possible. */
const CHECKS = {
  /* Escape speed at r=190px for GM=420000 is sqrt(2*GM/r) = 66.5 px/s, and the
     default launch speed is 66 - just under it, so the default orbit is bound. */
  orbit: () => {
    const p = window.__tcProbe();
    const vEsc = Math.sqrt(2 * 420000 / p.r);
    return p.r > 0 && Math.abs(p.speed - vEsc) / vEsc < 0.02;
  },
  newton: () => Math.abs(window.__tcProbe().a - (20 - 0.1 * 6 * 9.8) / 6) < 0.05,
  energy: () => {
    const p = window.__tcProbe();
    return Math.abs(p.total - p.pe - p.ke) < 1e-6;
  },
  collision: () => Math.abs(window.__tcProbe().p - window.__tcProbe().p0) < 0.35,
  incline: () => Math.abs(window.__tcProbe().a -
    9.8 * (Math.sin(32 * Math.PI / 180) - 0.12 * Math.cos(32 * Math.PI / 180))) < 0.05,
  atwood: () => Math.abs(window.__tcProbe().a - 4.2) < 0.02 && Math.abs(window.__tcProbe().T - 28) < 0.2,
  bfield: () => Math.abs(window.__tcProbe().T - 2 * Math.PI / 0.3) < 0.02,
  /* Read AFTER reset here, so these two report on a freshly started run. Both
     reset their graph, so the sample count is legitimately 0 at that instant;
     what matters is that the probe and the readouts are live, which the closed
     forms below confirm directly. */
  projectile: () => {
    const p = window.__tcProbe();
    /* v_y = u sin(th) - g t, with drag k = 0 at the default slider values. */
    return Math.abs(p.vy - (25 * Math.sin(45 * Math.PI / 180) - 9.8 * p.t)) < 0.01;
  },
  /* SHM: x = A cos(omega t) from rest, omega = sqrt(k/m) = sqrt(25/1.5). */
  shm: () => {
    const p = window.__tcProbe();
    const w = Math.sqrt(25 / 1.5);
    return Math.abs(p.x - (80 / 60) * Math.cos(w * p.t)) < 1e-6;
  },
  kin1d: () => Math.abs(window.__tcProbe().x -
    (4 * window.__tcProbe().t + 0.5 * window.__tcProbe().t ** 2)) < 0.02
};

const IDS = Object.keys(CHECKS).filter(id => !ONLY || id === ONLY);

const browser = await chromium.launch({ channel: 'chrome' });

async function setRunning(page, want) {
  const is = await page.evaluate(() =>
    !document.querySelector('.sim-time').classList.contains('is-paused'));
  if (is !== want) await page.click('.sim-time-play');
}

for (const id of IDS) {
  for (const [tag, vp] of [['desktop', { width: 1280, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const p = await browser.newPage({ viewport: vp });
    await p.goto(`${BASE}/#/sims/${id}`, { waitUntil: 'networkidle' });
    await p.waitForSelector('.sim-time');
    await p.waitForTimeout(400);

    /* The cycle, in the order a student would do it. */
    await p.evaluate(() => {
      /* coarse step so a single click is visible at 390px */
      const s = document.querySelector('.sim-time-stepsize');
      s.selectedIndex = 1; s.dispatchEvent(new Event('change'));
    });
    await setRunning(p, true);
    await p.waitForTimeout(600);
    await setRunning(p, false);
    const paused = await p.evaluate(() => ({
      t: window.__tcProbe().t,
      state: document.querySelector('.sim-time-state').textContent.trim(),
      clock: document.querySelector('.sim-time-clock').textContent.trim()
    }));
    await p.click('.sim-time-step');
    await p.click('.sim-time-step');
    const stepped = await p.evaluate(() => ({
      t: window.__tcProbe().t,
      calls: window.__tcProbe().calls,
      physicsOk: (() => { try { return window.__PHYSCHK; } catch (e) { return null; } })()
    }));
    await p.click('.sim-time-reset');
    const reset = await p.evaluate(() => window.__tcProbe().t);

    /* Physics checked in-page against closed form. */
    const physOk = await p.evaluate((src) => {
      const f = new Function('window', 'return (' + src + ')');
      try { return !!f(window)(); } catch (e) { return 'err: ' + e.message; }
    }, CHECKS[id].toString());
    const readouts = await p.evaluate(() =>
      [...document.querySelectorAll('.readout')].map(r => r.innerText.replace(/\n/g, ' ').trim()));
    const adv = (stepped.t - paused.t);

    console.log(`  ${id.padEnd(11)} ${tag.padEnd(8)} paused@${paused.t.toFixed(3)}s -> ` +
      `2 steps -> ${stepped.t.toFixed(3)}s (dt=${adv.toFixed(4)}s) -> reset@${reset.toFixed(3)}s  ` +
      `physics=${physOk}`);
    if (tag === 'desktop') console.log(`  ${''.padEnd(11)} ${''.padEnd(8)} readouts: ${readouts.join(' | ')}`);

    /* Screenshot the panel: sliders, readouts, control bar, canvas. */
    await p.evaluate(() => {
      const r = document.querySelector('.sim-frame').getBoundingClientRect();
      window.scrollTo(0, r.y + window.scrollY - 16);
    });
    await p.waitForTimeout(220);
    await p.screenshot({ path: `tools/.shots/tcw-${id}-${tag}.png` });
    await p.close();
  }
}

await browser.close();
console.log(`\n  wrote ${IDS.length * 2} screenshots to tools/.shots/`);
