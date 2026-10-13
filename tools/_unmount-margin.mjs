/* Measure how long the router takes to unmount each simulation's rendering
 * surface. The audit's "unmount removes the rendering surface" check polls for
 * this with a 6000ms deadline and then reports the observed state - so a slow
 * unmount fails the check while the evidence line still reads canvas=0.
 *
 * This distinguishes a tight deadline from a real leak: a leaked surface never
 * goes away, so its time-to-remove is unbounded, while a correct unmount is just
 * however long the router takes.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
function lp() { try { return createRequire(import.meta.url)('playwright'); } catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); } }
const { chromium } = lp();

const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const THROTTLE = Number(process.env.THROTTLE || 4);
const DEADLINE = 20000;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${BASE}/#/sims`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const ids = await page.evaluate(async () => {
  try { const { Sims } = await import('/js/sims-a.js'); return Object.keys(Sims.reg); }
  catch (e) { return [...document.querySelectorAll('a[href*="#/sims/"]')].map(a => a.getAttribute('href').split('#/sims/')[1]).filter(Boolean); }
});
console.log(`  throttle ${THROTTLE}x, ${ids.length} sims, deadline ${DEADLINE}ms`);

const cdp = await page.context().newCDPSession(page);
if (THROTTLE > 1) { try { await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }); } catch (e) {} }

const rows = [];
for (const id of ids) {
  await page.goto(`${BASE}/#/sims/${id}`, { waitUntil: 'domcontentloaded' });
  // give the sim a chance to actually mount a surface
  try { await page.waitForFunction(() => document.querySelector('#main .sim-frame canvas, #main .sim-frame iframe'), null, { timeout: 15000 }); }
  catch (e) { rows.push({ id, ms: null, mounted: false }); continue; }
  const t0 = Date.now();
  await page.evaluate(() => { location.hash = '#/formulas'; });
  let removed = false, ms = null;
  try {
    await page.waitForFunction(() => {
      const m = document.getElementById('main');
      return !m.querySelector('.sim-frame canvas') && !m.querySelector('.sim-frame iframe');
    }, null, { timeout: DEADLINE, polling: 25 });
    removed = true; ms = Date.now() - t0;
  } catch (e) { ms = Date.now() - t0; }
  rows.push({ id, ms, mounted: true, removed });
}

rows.sort((a, b) => (b.ms ?? 1e9) - (a.ms ?? 1e9));
console.log('\n  slowest unmounts:');
console.log('      ms  removed  id');
rows.slice(0, 20).forEach(r => console.log(`  ${String(r.ms ?? '-').padStart(6)}   ${String(r.removed).padEnd(6)}  ${r.id}${r.mounted === false ? '   (never mounted)' : ''}`));
const over6 = rows.filter(r => r.mounted && r.ms > 6000);
const over10 = rows.filter(r => r.mounted && r.ms > 10000);
const never = rows.filter(r => r.mounted && !r.removed);
console.log(`\n  over the audit's 6000ms deadline : ${over6.length}  -> ${over6.map(r => `${r.id}(${r.ms}ms)`).join(', ') || 'none'}`);
console.log(`  over 10000ms                     : ${over10.length}  -> ${over10.map(r => r.id).join(', ') || 'none'}`);
console.log(`  NEVER removed within ${DEADLINE}ms   : ${never.length}  -> ${never.map(r => r.id).join(', ') || 'none'}`);
await browser.close();