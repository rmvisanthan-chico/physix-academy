/* Phase 3 audit, step 9: performance and lifecycle.
 *
 * Measures rather than assumes. The specific risks with 51 simulations are:
 *   - animation loops that keep running when the tab is hidden
 *   - loops that survive a route change (the classic leak: requestAnimationFrame
 *     scheduled on a canvas that has been replaced)
 *   - canvas sized to a huge devicePixelRatio
 *   - unbounded listener accumulation across repeated mounts
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
const BASE = process.argv[2] || 'http://localhost:4244';

const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const c = await browser.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce' });
const page = await c.newPage();

/* Count every animation frame the page requests. The app's SU.loop uses rAF,
   so instrumenting rAF is the honest way to see whether loops stop. */
await page.addInitScript(() => {
  window.__rafCount = 0;
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb) { window.__rafCount++; return raf.call(this, cb); };
});

await page.goto(`${BASE}/#/sims/newton`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const t1 = await page.evaluate(() => window.__rafCount);
ok('simulation animates (rAF in use)', t1 > 10, `${t1} frames in ~2.5s`);

/* ---- route away: do the old sim's frames stop? ---- */
await page.evaluate(() => { location.hash = '#/formulas'; });
await page.waitForTimeout(1500);
const a = await page.evaluate(() => window.__rafCount);
await page.waitForTimeout(2000);
const b = await page.evaluate(() => window.__rafCount);
const framesWhileAway = b - a;
ok('leaving a simulation stops its animation loop', framesWhileAway < 20,
  `${framesWhileAway} frames in 2s on a static page`);

/* ---- hidden tab: does the SIMULATION work, not the rAF chain, stop? ----
   The first version of this assertion counted requestAnimationFrame CALLS and
   reported 121 frames while hidden, which looked like a failure. It was the
   test that was wrong: a loop that pauses must keep its rAF chain alive or it
   cannot resume without re-mounting. The thing that matters is whether the
   per-frame work - integrating physics and drawing - stops.

   So wrap SU.loop and count actual invocations of the simulation body. */
await page.evaluate(async () => {
  window.__simFrames = 0;
  const { SU } = await import('/js/core.js');
  const realLoop = SU.loop.bind(SU);
  SU.loop = function (cv, fn) {
    return realLoop(cv, (dt, t) => { window.__simFrames++; return fn(dt, t); });
  };
});
await page.goto(`${BASE}/#/sims/newton`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const visibleBefore = await page.evaluate(() => window.__simFrames);
await page.waitForTimeout(1500);
const visibleAfter = await page.evaluate(() => window.__simFrames);
const visibleFrames = visibleAfter - visibleBefore;
ok('simulation body runs while visible', visibleFrames > 20, `${visibleFrames} frames in 1.5s`);

const hiddenBefore = await page.evaluate(() => window.__simFrames);
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
});
await page.waitForTimeout(2000);
const hiddenFrames = (await page.evaluate(() => window.__simFrames)) - hiddenBefore;
ok('a hidden tab stops simulating, not just requesting frames', hiddenFrames < 5,
  `${hiddenFrames} simulation frames in 2s while hidden (rAF chain still alive)`);

await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
});
await page.waitForTimeout(1500);
const resumed = (await page.evaluate(() => window.__simFrames)) - hiddenBefore - hiddenFrames;
ok('the simulation resumes when the tab returns', resumed > 20, `${resumed} frames after unhiding`);

/* ---- canvas sizing: is devicePixelRatio clamped? ---- */
const dpr = await page.evaluate(() => {
  const c = document.querySelector('.sim-canvas-wrap canvas');
  if (!c) return null;
  const host = c.parentElement;
  return {
    dpr: window.devicePixelRatio,
    backingW: c.width,
    cssW: Math.round(c.getBoundingClientRect().width),
    wrapW: Math.round(host.getBoundingClientRect().width)
  };
});
if (dpr) {
  const ratio = dpr.backingW / Math.max(1, dpr.cssW);
  ok('canvas backing store is not absurd', dpr.backingW < 6000, `${dpr.backingW}px backing at dpr=${dpr.dpr}`);
  ok('canvas backing store matches dpr, not more', ratio < 3.2, `backing/css = ${ratio.toFixed(2)}x`);
} else {
  ok('a canvas exists to measure', false);
}

/* ---- repeated mount/unmount: listener leak? ---- */
await page.goto(`${BASE}/#/sims/newton`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const before = await page.evaluate(() => performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd);
for (let i = 0; i < 12; i++) {
  await page.evaluate(() => { location.hash = '#/formulas'; });
  await page.waitForTimeout(90);
  await page.evaluate(() => { location.hash = '#/sims/newton'; });
  await page.waitForTimeout(160);
}
await page.waitForTimeout(1200);
const after = await page.evaluate(() => ({
  nodes: document.querySelectorAll('*').length,
  canvases: document.querySelectorAll('canvas').length,
  frames: window.__rafCount
}));
ok('no canvas accumulation over 12 remounts', after.canvases <= 3, `${after.canvases} canvases live`);
ok('DOM stays bounded over 12 remounts', after.nodes < 4000, `${after.nodes} nodes`);
void before;

/* ---- sliders actually drive the sim (not decorative) ---- */
await page.goto(`${BASE}/#/sims/newton`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const sliderTest = await page.evaluate(async () => {
  const r = document.querySelector('.sim-frame input[type=range]');
  if (!r) return { found: false };
  const readout = () => [...document.querySelectorAll('.sim-frame .readout b')].map(b => b.textContent).join('|');
  const before = readout();
  r.value = String(Math.min(+r.max, +r.value + (+r.step || 1) * 4));
  r.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(res => setTimeout(res, 400));
  return { found: true, before, after: readout() };
});
ok('a slider exists on a simulation', sliderTest.found);
ok('moving a slider changes a numerical readout',
  sliderTest.found && sliderTest.before !== sliderTest.after,
  `"${sliderTest.before}" -> "${sliderTest.after}"`);

/* ---- reset button present and wired? ---- */
const hasReset = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.sim-frame button')].find(x => /reset/i.test(x.textContent));
  return b ? b.textContent.trim() : null;
});
console.log(`  [info] reset button on newton: ${hasReset || 'none'}`);

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nperf/lifecycle  ${results.length - bad}/${results.length} ok`);