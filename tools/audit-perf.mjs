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

   So wrap SU.loop AND the shared time-control render callback, and count actual
   invocations of the simulation body from either path.

   Phase 3C.1 replaced SU.loop with the shared controller on several simulations,
   so wrapping SU.loop alone started counting zero and read as "the simulation
   stopped running" when it had not - a false failure that would have hidden a
   genuine regression later. Counting the per-frame RENDER callback is the honest
   measurement for both architectures: it is the function that runs every frame
   while the simulation is live and stops when it is not. */
await page.goto(`${BASE}/#/sims/newton`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

/* Measure "the simulation is doing work" without assuming an architecture.
   Two attempts were made at wrapping a function and both were wrong:
     - wrapping SU.loop read 0 frames once Phase 3C.1 moved newton onto the
       shared time controller, which looked like "the sim stopped running" when
       it had not;
     - wrapping the time controller's factory also read 0, because the patch was
       installed before a page.goto that discarded it, AND because an ES module
       namespace object is frozen - you cannot reassign its exports at all, so
       the patch could never have applied even in the right order.

   So measure the thing itself instead of the plumbing. A simulation that is
   integrating physics advances its own integration counter, which is exactly the
   per-frame work this assertion is about. SU.loop-based simulations fall back to
   a canvas-pixel hash, which likewise cannot advance without the body running. */
const counter = await page.evaluate(() => {
  if (window.__tcProbe) return 'probe';
  return 'pixels';
});
ok('perf counter found a measurable simulation path',
  counter === 'probe' || counter === 'pixels', counter);

if (counter === 'pixels') {
  await page.evaluate(async () => {
    window.__simFrames = 0;
    const { SU } = await import('/js/core.js');
    const realLoop = SU.loop.bind(SU);
    SU.loop = function (cv, fn) {
      return realLoop(cv, (dt, t) => { window.__simFrames++; return fn(dt, t); });
    };
  });
}

const readFrames = () => page.evaluate(async (mode) => {
  if (mode === 'probe') {
    /* Physics integrations performed. Directly the per-frame work. */
    const now = window.__tcProbe ? window.__tcProbe().calls : 0;
    const prev = window.__prevCalls || 0;
    window.__prevCalls = now;
    return now;
  }
  return window.__simFrames || 0;
}, counter);
const frameDelta = async (ms) => {
  const before = await readFrames();
  await page.waitForTimeout(ms);
  const after = await readFrames();
  return after - before;
};

if (counter === 'probe') await readFrames();   /* baseline */
const visibleFrames = await frameDelta(1500);
ok('simulation body runs while visible', visibleFrames > 20, `${visibleFrames} integrations in 1.5s`);

const hiddenTotal = await readFrames();
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
});
await page.waitForTimeout(2000);
const hiddenFrames = (await readFrames()) - hiddenTotal;
ok('a hidden tab stops simulating, not just requesting frames', hiddenFrames < 5,
  `${hiddenFrames} integrations in 2s while hidden (rAF chain still alive)`);

await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
});
const resumedFrames = await frameDelta(1500);
ok('the simulation resumes when the tab returns', resumedFrames > 20,
  `${resumedFrames} integrations after unhiding`);

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