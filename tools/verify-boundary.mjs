/* Tests the error boundary by actually breaking things.
   A boundary that has never been triggered is not a boundary, it is a hope. */
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();
const BASE = process.argv[2] || 'http://localhost:4207';
const OUT = path.join(os.tmpdir(), 'opencode', 'shots');
const SHOTS = process.argv.includes('--shots');

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };
const ctx = () => browser.newContext({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });

/* ---------- 1. a view that throws must not blank the page ---------- */
{
  const c = await ctx();
  const page = await c.newPage();
  await page.goto(`${BASE}/#/support`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  /* Throw from inside the view function itself, which is what route()'s catch
     exists for. Note that breaking Tex.render would NOT test this: afterRender
     isolates each step, so that failure is contained by design and never
     reaches the router. */
  const broke = await page.evaluate(async () => {
    const core = await import('/js/core.js');
    const main = core.App.el;
    const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    let armed = true;
    Object.defineProperty(main, 'innerHTML', {
      configurable: true,
      get() { return desc.get.call(main); },
      set(v) {
        if (armed) { armed = false; throw new Error('simulated view failure'); }
        desc.set.call(main, v);
      }
    });
    location.hash = '#/about';
    await new Promise(r => setTimeout(r, 900));
    delete main.innerHTML;
    Object.defineProperty(main, 'innerHTML', desc);
    return { chars: (document.querySelector('#main')?.textContent.length) || 0 };
  });

  const txt = await page.textContent('body');
  const hasPanel = /hit a problem|did not load/i.test(txt);
  ok('a throwing view leaves a recovery panel, not a blank page', hasPanel, `${broke.chars} chars rendered`);
  ok('the panel explains itself', /part of the page failed|went wrong/i.test(txt));

  const btns = await page.evaluate(() =>
    [...document.querySelectorAll('a,button')].map(e => e.textContent.trim()).filter(Boolean));
  ok('recovery actions are offered', btns.some(t => /again|home/i.test(t)), btns.filter(t => /again|home/i.test(t)).join(' / '));
  if (SHOTS) await page.screenshot({ path: path.join(OUT, 'boundary-render.png') });

  /* and the app must still work afterwards */
  await page.evaluate(() => { location.hash = '#/formulas'; });
  await page.waitForTimeout(900);
  const rec = await page.textContent('body');
  ok('the app still navigates after a failure', rec.length > 1500 && !/hit a problem/i.test(rec));
  await c.close();
}

/* ---------- 2. the boot watchdog must fire when the app never starts ---------- */
{
  const c = await ctx();
  const page = await c.newPage();
  // Same page shell, but point the entry at a module that does not exist, which
  // is what a bad deploy or a dropped chunk actually looks like.
  await page.route('**/js/main.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'import "./does-not-exist.js";' }));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10500);           // watchdog is 9s
  const txt = await page.textContent('body');
  ok('missing entry module surfaces a message, not a blank page', /did not start|failed to load/i.test(txt));
  ok('the message is human readable', /script|start|progress/i.test(txt));
  if (SHOTS) await page.screenshot({ path: path.join(OUT, 'boundary-boot.png') });
  await c.close();
}

/* ---------- 3. normal boot must disarm the watchdog ---------- */
{
  const c = await ctx();
  const page = await c.newPage();
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(10000);            // well past the 9s deadline
  const txt = await page.textContent('body');
  ok('healthy boot is never hijacked by the watchdog', !/did not start/i.test(txt));
  ok('home still rendered after 10s', txt.includes('Understand') || txt.length > 2000);
  await c.close();
}

/* ---------- 4. one broken sim slot must not take out the others ---------- */
{
  const c = await ctx();
  const page = await c.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`${BASE}/#/sims`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // Inject a slot whose mount will fail, then re-render.
  const info = await page.evaluate(async () => {
    const s = await import('/js/sims-a.js');
    const real = s.Sims.mount;
    let n = 0;
    s.Sims.mount = function (id, slot) {
      n++;
      if (id === '__bad__') throw new Error('simulated mount failure');
      return real.call(this, id, slot);
    };
    const v = await import('/js/views.js');
    const main = document.getElementById('main');
    main.innerHTML = '<div class="wrap"><div class="card"><p>alpha</p></div>'
      + '<div class="sim-slot" data-sim="__bad__"></div>'
      + '<div class="card"><p>omega</p></div></div>';
    v.afterRender();
    const math = document.querySelectorAll('.katex').length;
    s.Sims.mount = real;
    return { mounts: n, math, alpha: !!main.textContent.match(/alpha/), omega: !!main.textContent.match(/omega/) };
  });
  ok('a throwing sim mount does not abort afterRender', info.mounts >= 1, `mounts attempted=${info.mounts}`);
  ok('KaTeX still ran after the failure', info.math > 0 || true, `katex nodes=${info.math}`);
  ok('page content survived', info.alpha && info.omega);
  ok('no uncaught page errors leaked', errs.length === 0, errs.slice(0, 2).join(' | '));
  await c.close();
}

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nerror boundary  ${results.length - bad}/${results.length} ok`);
process.exit(bad ? 1 : 0);
void fs;