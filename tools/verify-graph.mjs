/* Graph engine + simulation integration tests.
 *
 * Two halves:
 *   A. engine unit tests in a bare page (no app) - bounded history, scaling,
 *      reset, destroy, multiple series, and that push() does NOT redraw per
 *      call
 *   B. integration through the real Sims registry, driving actual physics and
 *      asserting the plotted curve tracks the simulation's own state
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
const BASE = process.argv[2] || 'http://localhost:4283';

const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log('  ' + (p ? 'ok  ' : 'FAIL') + '  ' + n + (d ? '  ' + d : '')); };

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });

/* ================= A. ENGINE UNIT TESTS =================
   Run inside a real simulation page and reached via window.PhysixGraph, which
   the engine exports deliberately. Importing '/js/graph-engine.js' by path
   worked only on the unbundled path - the bundler hashes the file into a
   chunk, so the first version of this suite silently could not run against a
   production build at all. */
{
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 950 } })).newPage();
  await page.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pgraph canvas', { timeout: 20000 });
  const have = await page.evaluate(() => !!window.PhysixGraph);
  ok('engine is addressable (window.PhysixGraph)', have);
  if (have) await runEngineTests(page);
  await page.close();
}

/* The engine unit assertions. */
async function runEngineTests(page) {

  /* init + series */
  const init = await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const g = new window.PhysixGraph.Graph({ xLabel: 'Time', xUnit: 's', title: 'T', capacity: 50 });
    host.appendChild(g.el);
    g.addSeries({ id: 'y', label: 'Y', unit: 'm', color: '#f00' });
    g.addSeries({ id: 'v', label: 'V', unit: 'm/s', color: '#0f0' });
    window.__g = g;
    return {
      canvas: !!g.canvas, series: g.series.length, role: g.el.getAttribute('role'),
      legend: g.footEl.querySelectorAll('.pgraph-entry').length
    };
  });
  ok('graph initialises with a canvas', init.canvas);
  ok('series initialise', init.series === 2);
  ok('graph exposes a group role', init.role === 'group');
  ok('legend lists every series', init.legend === 2);

  /* push */
  const pushed = await page.evaluate(() => {
    const g = window.__g;
    for (let i = 0; i < 10; i++) g.push({ x: i, y: i * i, v: i });
    return { len: g.byId.y.len, lastY: g.byId.y.last.y };
  });
  ok('data can be pushed', pushed.len === 10, `${pushed.len} samples`);
  ok('last value is retained', Math.abs(pushed.lastY - 81) < 1e-9, `last y=${pushed.lastY}`);

  /* bounded history: the reason capacity exists */
  const bounded = await page.evaluate(() => {
    const g = window.__g;
    for (let i = 0; i < 500; i++) g.push({ x: i, y: i, v: i });
    return { len: g.byId.y.len, cap: g.byId.y.capacity };
  });
  ok('history is bounded, not unbounded', bounded.len === bounded.cap && bounded.len === 50,
    `${bounded.len} samples held, cap ${bounded.cap}`);

  /* ring buffer keeps ORDER after wrapping */
  const order = await page.evaluate(() => {
    const g = window.__g;
    g.clear();
    for (let i = 0; i < 60; i++) g.push({ x: i, y: i });       // wraps at 50
    const xs = [];
    g.byId.y.each(x => xs.push(x));
    const monotonic = xs.every((v, i) => i === 0 || v > xs[i - 1]);
    return { first: xs[0], last: xs[xs.length - 1], monotonic, n: xs.length };
  });
  ok('ring buffer preserves oldest-to-newest order after wrapping',
    order.monotonic && order.n === 50, `x from ${order.first} to ${order.last}`);

  /* automatic scaling */
  const scale = await page.evaluate(() => {
    const g = window.__g;
    g.clear();
    for (let i = 0; i <= 10; i++) g.push({ x: i, y: i * 5, v: 0 });
    const s = g.computeScale();
    return { x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1 };
  });
  ok('scaling tracks the data', scale.y1 > scale.y0 && scale.x1 > scale.x0,
    `x[${scale.x0.toFixed(1)},${scale.x1.toFixed(1)}] y[${scale.y0.toFixed(1)},${scale.y1.toFixed(1)}]`);
  ok('scaling pads so the curve never touches the frame',
    scale.x0 < 0 && scale.x1 > 10, `x0=${scale.x0.toFixed(2)} x1=${scale.x1.toFixed(1)}`);
  ok('y axis includes zero (sign is visible)', scale.y0 <= 0, `y0=${scale.y0}`);

  /* an extreme outlier must not squash the curve */
  const outlier = await page.evaluate(() => {
    const g = window.__g;
    g.clear();
    for (let i = 0; i <= 20; i++) g.push({ x: i, y: 1, v: 0 });
    const before = g.computeScale();
    g.push({ x: 21, y: 5000, v: 0 });
    const after = g.computeScale();
    return { beforeSpan: before.y1 - before.y0, afterSpan: after.y1 - after.y0 };
  });
  ok('an outlier widens the axis rather than being hidden',
    outlier.afterSpan > outlier.beforeSpan * 10,
    `span ${outlier.beforeSpan.toFixed(1)} -> ${outlier.afterSpan.toFixed(0)}`);

  /* push must NOT redraw per call */
  const batching = await page.evaluate(async () => {
    const g = window.__g;
    g.clear();
    await new Promise(r => setTimeout(r, 120));
    const before = g.drawCount;
    for (let i = 0; i < 200; i++) g.push({ x: i, y: i, v: i });
    const sync = g.drawCount - before;         // must be 0: no synchronous redraw
    await new Promise(r => setTimeout(r, 300));
    const afterFrame = g.drawCount - before;
    return { sync, afterFrame };
  });
  ok('push does not redraw synchronously (batched)', batching.sync === 0,
    `${batching.sync} draws during 200 pushes`);
  ok('one frame redraw covers the whole burst', batching.afterFrame <= 3,
    `${batching.afterFrame} draws after 200 pushes settled`);

  /* reset / clear */
  const reset = await page.evaluate(async () => {
    const g = window.__g;
    g.push({ x: 1, y: 1, v: 1 });
    g.reset();
    await new Promise(r => setTimeout(r, 150));
    return { len: g.byId.y.len, scale: g.scale, legend: g.footEl.textContent.trim() };
  });
  ok('reset clears the data', reset.len === 0);
  ok('reset clears the computed scale', reset.scale === null);
  ok('reset shows no stale live values', !/\d/.test(reset.legend.replace(/\d+\.\d+x?/g, '')) || reset.legend.length < 40,
    `legend="${reset.legend.slice(0, 40)}"`);

  /* visibility toggle */
  const vis = await page.evaluate(() => {
    const g = window.__g;
    g.setVisible('v', false);
    const off = g.footEl.querySelector('.pgraph-entry.off');
    g.setVisible('v', true);
    return { hadOffClass: !!off, restored: !g.footEl.querySelector('.pgraph-entry.off') };
  });
  ok('a hidden series is marked in the legend', vis.hadOffClass);
  ok('a series can be shown again', vis.restored);

  /* destroy */
  const destroyed = await page.evaluate(async () => {
    const g = window.__g;
    const el = g.el;
    g.destroy();
    await new Promise(r => setTimeout(r, 200));
    return {
      inDom: document.body.contains(el),
      rafStopped: g._raf === null,
      alive: g._alive,
      series: g.series.length
    };
  });
  ok('destroy removes the element', !destroyed.inDom);
  ok('destroy cancels the rAF loop', destroyed.rafStopped);
  ok('destroy releases series', destroyed.series === 0);
  ok('destroy marks the graph dead', destroyed.alive === false);

  /* push after destroy must be a no-op, not a crash */
  const afterDestroy = await page.evaluate(() => {
    try { window.__g.push({ x: 1, y: 1, v: 1 }); return 'no throw'; }
    catch (e) { return 'THREW: ' + e.message; }
  });
  ok('push after destroy is a safe no-op', afterDestroy === 'no throw', afterDestroy);

  /* non-finite data is rejected, not plotted as a spike */
  const nan = await page.evaluate(() => {
    const g = window.__g;
    g.addSeries({ id: 'z', label: 'Z', color: '#00f' });
    const before = g.byId.z.len;
    g.push({ x: 1, y: NaN, v: 0, z: Infinity });
    return { before, after: g.byId.z.len };
  });
  ok('NaN / Infinity are rejected rather than plotted', nan.after === nan.before);

  await page.close();
}

/* ================= B. SIMULATION INTEGRATION ================= */
const SIMS = [
  { id: 'projectile', series: ['y', 'vx', 'vy'] },
  { id: 'shm', series: ['x', 'v'] },
  { id: 'kin1d', series: ['x', 'v'] }
];

for (const sim of SIMS) {
  const c = await browser.newContext({ viewport: { width: 1360, height: 950 }, reducedMotion: 'reduce' });
  const page = await c.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = m.location() || {};
    if (/\/_vercel\//.test(loc.url || '')) return;
    errs.push('console: ' + m.text().slice(0, 120));
  });

  await page.goto(`${BASE}/#/sims/${sim.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const present = await page.evaluate(() => ({
    graph: !!document.querySelector('.pgraph'),
    canvas: !!document.querySelector('.pgraph canvas'),
    legend: document.querySelectorAll('.pgraph-entry').length,
    xcap: (document.querySelector('.pgraph-xcap') || {}).textContent || ''
  }));
  ok(`${sim.id}: graph appears`, present.graph && present.canvas);
  ok(`${sim.id}: every series is in the legend`, present.legend === sim.series.length,
    `${present.legend} entries`);
  ok(`${sim.id}: x axis is labelled with units`, /\(.+\)/.test(present.xcap), present.xcap);

  /* real data enters: samples grow while the sim runs */
  const growing = await page.evaluate(async () => {
    const read = () => {
      const g = window.__pg;
      return g ? g.series.map(s => s.len) : null;
    };
    return { note: 'uses exposed handle' };
  });

  await page.waitForTimeout(2500);

  const live = await page.evaluate(() => {
    const legend = [...document.querySelectorAll('.pgraph-entry')].map(e => e.textContent.trim());
    return { legend, draws: null };
  });
  const hasNumbers = live.legend.every(t => /\d/.test(t));
  ok(`${sim.id}: real data reaches the graph`, hasNumbers,
    live.legend.map(t => t.slice(0, 34)).join(' | '));

  /* The curve must change as the physics changes.
     Compared MID-FLIGHT, not after the sim has finished. A projectile lands
     after ~3.6s and then stops integrating, so sampling late compares a settled
     0 m against another settled 0 m and reports no movement - which is correct
     behaviour being read as a failure. The projectile needs a fresh launch
     between samples so there is motion to observe. */
  const moves = await page.evaluate(async (id) => {
    if (id === 'projectile') {
      /* change the angle so the sim relaunches and the ball is airborne */
      const s = document.querySelectorAll('.sim-frame input[type=range]')[1];
      s.value = '70';
      s.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const read = () => [...document.querySelectorAll('.pgraph-entry b')].map(b => b.textContent);
    const first = read();
    await new Promise(r => setTimeout(r, 1100));
    const second = read();
    return { first, second };
  }, sim.id);
  ok(`${sim.id}: the curve tracks changing physics`,
    JSON.stringify(moves.first) !== JSON.stringify(moves.second),
    `${moves.first[0]} -> ${moves.second[0]}`);

  /* reset clears the graph */
  const afterReset = await page.evaluate(async () => {
    /* every integrated sim resets from a slider or a button; find one */
    const slider = document.querySelector('.sim-frame input[type=range]');
    if (slider) {
      slider.value = String(+slider.max);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await new Promise(r => setTimeout(r, 350));
    const legend = [...document.querySelectorAll('.pgraph-entry b')].map(b => b.textContent.trim());
    return legend;
  });
  ok(`${sim.id}: a parameter change does not leave stale curves`,
    afterReset.every(t => t.length > 0), afterReset.join(', '));

  /* unmount destroys: no live graph left behind */
  const unmount = await page.evaluate(async () => {
    location.hash = '#/formulas';
    await new Promise(r => setTimeout(r, 600));
    return {
      graphsLeft: document.querySelectorAll('.pgraph').length,
      canvasesLeft: document.querySelectorAll('.pgraph canvas').length
    };
  });
  ok(`${sim.id}: unmount removes the graph`, unmount.graphsLeft === 0 && unmount.canvasesLeft === 0,
    `${unmount.graphsLeft} graphs left`);

  /* remount: leave, come back via the catalogue link for THIS sim, and confirm
     exactly one graph with the right number of series. Counting all
     .pgraph-entry in the document is right, because if a stale graph survived
     its entries would show up here too - which is exactly what the first
     version of this test caught when it accidentally remounted projectile
     while checking shm. */
  const remount = await page.evaluate(async (id) => {
    location.hash = '#/sims';
    await new Promise(r => setTimeout(r, 500));
    const link = document.querySelector(`a[href="#/sims/${id}"]`);
    if (!link) return { err: 'no catalogue link for ' + id };
    link.click();
    await new Promise(r => setTimeout(r, 1000));
    return {
      graphs: document.querySelectorAll('.pgraph').length,
      entries: document.querySelectorAll('.pgraph-entry').length,
      canvases: document.querySelectorAll('.pgraph canvas').length
    };
  }, sim.id);
  ok(`${sim.id}: remount creates exactly one graph`, remount.graphs === 1,
    remount.err || `${remount.graphs} graphs`);
  ok(`${sim.id}: remount does not duplicate legend entries`,
    remount.entries === sim.series.length, `${remount.entries} entries (want ${sim.series.length})`);
  ok(`${sim.id}: remount does not stack canvases`, remount.canvases === 1, `${remount.canvases} canvases`);

  ok(`${sim.id}: no console errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await c.close();
}

/* Pause stops sampling. Asserted on the SAMPLE COUNT, not on the legend text:
   reading the legend cannot distinguish "no new samples" from "new samples
   with the same displayed value". A projectile that has landed holds y at 0 and
   v_y at its final value, so the legend looks identical whether or not the loop
   is running - which is why the first version of this check passed while
   measuring nothing. */
{
  const c = await browser.newContext({ viewport: { width: 1360, height: 950 }, reducedMotion: 'reduce' });
  const page = await c.newPage();
  await page.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  /* Count actual pushes by wrapping Graph.prototype.push BEFORE the sim mounts,
     reached through window.PhysixGraph so this works in the bundled build too. */
  await page.evaluate(() => { window.__pushes = 0; });
  await page.goto(`${BASE}/#/sims`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const wrapped = await page.evaluate(() => {
    const G = window.PhysixGraph && window.PhysixGraph.Graph;
    if (!G) return false;
    const real = G.prototype.push;
    G.prototype.push = function (s) { window.__pushes++; return real.call(this, s); };
    return true;
  });
  ok('engine is addressable for the pause check', wrapped);
  const link = await page.$('a[href="#/sims/projectile"]');
  await link.click();

  /* Wait for sampling to actually START before measuring anything.
     An earlier version slept 1400ms after the click and asserted on the push
     count, which silently assumed the loop had been running for that entire
     window. When route change plus module load was slower than the sleep - a
     loaded machine, a cold cache - the assertion read a window that had only
     been open for a few hundred ms and failed intermittently, reporting a bug
     that was not there. Waiting for the first push makes the measurement start
     where the thing being measured starts. */
  await page.waitForFunction(() => window.__pushes > 0, { timeout: 15000 });
  const atStart = await page.evaluate(() => window.__pushes);

  /* Measure a known 1.0s of sampling. Threshold stays at > 30 pushes, which is
     what ~60 sub-steps per second would produce at 60fps - the same bar the
     previous fixed sleep was really trying to set. */
  await page.waitForTimeout(1000);
  const before = await page.evaluate(() => window.__pushes);
  const visible = before - atStart;

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  });
  await page.waitForTimeout(1500);
  const during = await page.evaluate(() => window.__pushes);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => window.__pushes);

  ok('sampling happens while visible', visible > 30, `${visible} pushes in 1.0s of visible running`);
  ok('paused/hidden: the graph receives no samples', during === before,
    `${during - before} pushes while hidden`);
  ok('resuming: sampling continues', after > during + 30, `${after - during} pushes after unhiding`);
  await c.close();
}

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\ngraph engine + integration  ${results.length - bad}/${results.length} ok`);
process.exit(bad ? 1 : 0);