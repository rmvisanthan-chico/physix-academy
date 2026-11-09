/* PhysiX Academy — interactive simulation audit.
 *
 * Drives every registered in-app sim through its full control surface and
 * reports genuine defects: console/page errors, non-finite or missing numbers
 * leaking into readouts, crashing sliders, dead presets, broken layer
 * switches, POR panels that never reveal, and runaway/dead probes.
 *
 * Usage:
 *   node tools/audit-interactions.mjs [base] [--only=id1,id2]
 *
 * Exit code 0 = no issues, 1 = issues found. Findings are printed as compact
 * lines and written to tools/_audit-findings.json for follow-up.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const BASE = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:4191';
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',').filter(Boolean)) : null;

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const IGNORE = /favicon|_vercel|netlify|googletagmanager|gtag|adsbygoogle|Failed to load resource|Transition was skipped|New ViewTransition started|ERR_INTERNET_DISCONNECTED|WebGL: CONTEXT_LOST|THREE\.WebGLRenderer/i;

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const issues = [];
const note = (sim, type, detail) => issues.push({ sim, type, detail });
const BAD = /(NaN|undefined|Infinity)/;

async function scanText(sim, where) {
  const bad = await page.evaluate(() => {
    const roots = ['.ws-side', '.ws-por', '.ws-head'];
    const out = [];
    for (const sel of roots) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const t = el.innerText || '';
      if (/(NaN|undefined|Infinity)/.test(t)) out.push(el.className + ' → ' + t.slice(0, 160).replace(/\s+/g, ' '));
    }
    return out;
  });
  bad.forEach((b) => note(sim, 'text:' + where, b));
}

async function probeOnce() {
  return page.evaluate(() => {
    if (typeof window.__tcProbe !== 'function') return null;
    try {
      return window.__tcProbe();
    } catch (e) {
      return { __throw: String(e) };
    }
  });
}

function probeProblems(p, atMount) {
  const out = [];
  if (!p) return ['probe missing'];
  if (p.__throw) return ['probe threw: ' + p.__throw];
  const bad = (v) => typeof v === 'number' && !isFinite(v);
  const missing = (v) => v === undefined; /* null = deliberate "no reading yet" */
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined) {
      /* state/scratch fields may legitimately be empty at mount; elsewhere
         `null` means the bench has no reading yet (period not measured, no
         transmitted angle under TIR, …). Only `undefined` indicates a field
         the probe forgot to supply. */
      if (!atMount && !['state', 'calls', 'paused'].includes(k) && missing(v)) out.push(k + ' is undefined');
      continue;
    }
    if (bad(v)) out.push(k + ' = ' + v);
    if (typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        if (bad(v2)) out.push(k + '.' + k2 + ' = ' + v2);
        else if (!atMount && missing(v2)) out.push(k + '.' + k2 + ' is undefined');
      }
    }
  }
  return out;
}

/* ---------- ids from the catalogue, plus the hidden demo ---------- */
await page.goto(BASE + '/#/sims', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('.sim-cat-card', { timeout: 25000 });
const ids = await page.evaluate(() =>
  [...document.querySelectorAll('a[href^="#/sims/"]')]
    .map((a) => a.getAttribute('href').replace('#/sims/', ''))
    .filter((id) => id && id !== 'workstation-demo')
);
ids.push('workstation-demo');
const targets = only ? ids.filter((id) => only.has(id)) : ids;

let errs = [];
page.on('pageerror', (e) => {
  const m = e.message || String(e);
  if (!IGNORE.test(m)) errs.push('pageerror: ' + m.split('\n')[0].slice(0, 180));
});
page.on('console', (m) => {
  if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push('console: ' + m.text().slice(0, 180));
});

console.log('Auditing ' + targets.length + ' simulations on ' + BASE + '\n');

for (const sim of targets) {
  errs = [];
  try {
    await page.evaluate((id) => {
      location.hash = '#/sims/' + id;
    }, sim);
    await page.waitForSelector('.ws-root', { timeout: 20000 });
    await page.waitForTimeout(900);
    await scanText(sim, 'mount');

    /* probe at rest */
    const p1 = await probeOnce();
    /* nulls at mount are legitimate for measurements that need a run first
       (period, gap, photon energy, …) — they are re-checked after running */
    if (sim !== 'workstation-demo') probeProblems(p1, true).forEach((d) => note(sim, 'probe:mount', d));

    /* graph data: live timers may still be filling; only flag if EMPTY after mounts */
    const graphCount = await page.locator('.ws-graphs .pgraph canvas').count();
    /* the brief allows 1–2 plots per sim; only an empty graph section is a bug */
    if (graphCount < 1 && sim !== 'workstation-demo') note(sim, 'graphs', 'no graph canvases');

    /* sliders to min, then max */
    const sliders = page.locator('.sim-controls input[type=range]');
    const ns = await sliders.count();
    for (let i = 0; i < ns; i++) {
      for (const which of ['min', 'max']) {
        await sliders.nth(i).evaluate((el, w) => {
          el.value = el[w];
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }, which);
        await page.waitForTimeout(220);
        await scanText(sim, 'slider' + i + ':' + which);
      }
      /* restore mid */
      await sliders.nth(i).evaluate((el) => {
        el.value = String((+el.min + +el.max) / 2);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
    await page.waitForTimeout(250);
    await scanText(sim, 'sliders:mid');

    /* presets */
    const presets = page.locator('.ws-preset');
    const np = await presets.count();
    for (let i = 0; i < np; i++) {
      await presets.nth(i).click();
      await page.waitForTimeout(260);
      await scanText(sim, 'preset' + i);
      const on = await page.locator('.ws-preset-on').count();
      if (on !== 1) note(sim, 'presets', 'preset ' + i + ' did not activate (' + on + ' active)');
    }

    /* layers */
    const layers = page.locator('.ws-layers .ws-layerbtn');
    const nl = await layers.count();
    if (nl && sim !== 'workstation-demo') {
      for (let i = 0; i < nl; i++) {
        await layers.nth(i).click();
        await page.waitForTimeout(320);
        await scanText(sim, 'layer' + i);
      }
      /* back to first */
      await layers.nth(0).click();
      await page.waitForTimeout(250);
    }

    /* transport: pause → step → play → reset */
    const playBtn = page.locator('.ws-transport .ws-tplay');
    const paused0 = await page.evaluate(() => (window.__tcProbe ? window.__tcProbe().paused : null));
    if (paused0 === false) await playBtn.click();
    const stepBtn = page.locator('.ws-transport .ws-tbtn', { hasText: '⏭' });
    if (await stepBtn.count()) {
      /* liveness is measured by the pump counter: six benches keep a
         deliberately static probe clock (a closed thermodynamic cycle, a
         completed swing measurement), so t can stay flat while advance()
         still runs. */
      const c0 = await page.evaluate(() => (window.__tcProbe ? window.__tcProbe().calls : null));
      await stepBtn.click();
      await page.waitForTimeout(150);
      const c1 = await page.evaluate(() => (window.__tcProbe ? window.__tcProbe().calls : null));
      if (typeof c0 === 'number' && typeof c1 === 'number' && !(c1 > c0)) {
        note(sim, 'transport', 'step did not advance the pump (calls ' + c0 + ' → ' + c1 + ')');
      }
    }
    await playBtn.click(); /* play */
    await page.waitForTimeout(700);
    const p2 = await probeOnce();
    if (sim !== 'workstation-demo') probeProblems(p2).forEach((d) => note(sim, 'probe:run', d));
    if (p1 && p2) {
      const c1 = p1.calls,
        c2 = p2.calls;
      if (typeof c1 === 'number' && typeof c2 === 'number' && !(c2 > c1) && p2.paused !== true) {
        note(sim, 'probe:run', 'pump did not advance while playing (calls ' + c1 + ' → ' + c2 + ')');
      }
    }

    /* POR lock-in: any finite guess must produce a rendered verdict */
    const hasPor = (await page.locator('.ws-por .predict').count()) === 1;
    if (hasPor) {
      const input = page.locator('.predict-input');
      if (await input.count()) {
        await input.fill('1');
        await page.locator('.predict .btn', { hasText: 'Lock in my estimate' }).click();
        /* target-time PORs reveal only once sim time reaches the target, so
           poll for up to 12 s instead of sampling once after 300 ms. The
           window must exceed the longest target a bench can set: collision's
           computeTarget() clamps at 8 s (heavy, slow approach), and reveal
           then happens at that 8 s mark. */
        let outVisible = false,
          verdict = 0,
          errText = '';
        for (let w = 0; w < 24; w++) {
          outVisible = await page.locator('.predict-out').isVisible().catch(() => false);
          verdict = await page.locator('.predict-verdict').count();
          errText = await page.locator('.predict-err').innerText().catch(() => '');
          if (outVisible || verdict > 0 || /Not enough|Let the simulation continue/.test(errText)) break;
          await page.waitForTimeout(500);
        }
        const okMsg = /Not enough|Let the simulation continue/.test(errText);
        if (!outVisible && !okMsg && verdict === 0) {
          note(sim, 'por', 'lock-in neither revealed nor explained: ' + (errText || '(no message)').slice(0, 160));
        }
        await scanText(sim, 'por');
      } else {
        note(sim, 'por', 'prediction input missing');
      }
    } else if (sim !== 'workstation-demo') {
      note(sim, 'por', 'prediction panel missing');
    }

    /* reset after everything */
    await page.locator('.ws-transport .ws-tbtn', { hasText: '↺' }).click();
    await page.waitForTimeout(500);
    await scanText(sim, 'reset');
    const p3 = await probeOnce();
    if (sim !== 'workstation-demo') probeProblems(p3).forEach((d) => note(sim, 'probe:reset', d));

    if (errs.length) errs.forEach((e) => note(sim, 'error', e));
    console.log((issues.some((i) => i.sim === sim) ? 'FAIL ' : 'ok   ') + sim);
  } catch (e) {
    note(sim, 'harness', String(e.message || e).slice(0, 200));
    console.log('FAIL ' + sim + '  [harness]');
  }
}

await browser.close();

writeFileSync(new URL('./_audit-findings.json', import.meta.url), JSON.stringify(issues, null, 2));

console.log('\n' + (issues.length ? issues.length + ' issue(s):' : 'No issues found.'));
for (const i of issues) console.log('  ' + i.sim + '  [' + i.type + ']  ' + i.detail);
process.exit(issues.length ? 1 : 0);
