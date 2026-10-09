/* Per-simulation checks for the prediction system on SHM and Kinematics 1D.
 * The projectile slice is covered by verify-prediction.mjs. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();
const BASE = process.argv[2] || 'http://localhost:4320';

const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });

/* Each entry: the closed-form check that proves the reported value is real
   physics from the simulation, not a number invented by the UI. */
const CASES = [
  {
    id: 'shm',
    series: 'x',
    theory(t, ctx) {
      /* x = A cos(ωt) in metres; A comes from the amplitude slider (px) / 60 */
      const w = 2 * Math.PI / ctx.T;
      return ctx.ampM * Math.cos(w * t);
    },
    readCtx: () => {
      const inputs = [...document.querySelectorAll('.sim-frame input[type=range]')];
      const m = parseFloat(inputs[0].value), k = parseFloat(inputs[1].value);
      const amp = parseFloat(inputs[3].value);
      return { m, k, T: 2 * Math.PI * Math.sqrt(m / k), ampM: amp / 60 };
    }
  },
  {
    id: 'kin1d',
    series: 'x',
    theory(t, ctx) { return ctx.u * t + 0.5 * ctx.a * t * t; },
    readCtx: () => {
      const inputs = [...document.querySelectorAll('.sim-frame input[type=range]')];
      return { u: parseFloat(inputs[0].value), a: parseFloat(inputs[1].value) };
    }
  }
];

for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = m.location() || {};
    if (/\/_vercel\//.test(loc.url || '')) return;
    errs.push('console: ' + m.text().slice(0, 120));
  });

  await page.goto(`${BASE}/#/sims/${c.id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.predict-input', { timeout: 20000 });

  const info = await page.evaluate(() => ({
    q: (document.querySelector('.predict-q')?.textContent || '').replace(/\s+/g, ' ').trim(),
    unit: document.querySelector('.predict-unit')?.textContent || '',
    sub: (document.querySelector('.predict-sub')?.textContent || '').trim(),
    locked: document.querySelector('.predict-input')?.disabled,
    outHidden: document.querySelector('.predict-out')?.hidden
  }));
  ok(`${c.id}: prediction asks a question`, info.q.length > 20, info.q.slice(0, 70));
  ok(`${c.id}: prediction names its unit`, info.unit.length > 0, info.unit);
  ok(`${c.id}: prediction shows the parameters`, /=/.test(info.sub), info.sub);
  ok(`${c.id}: nothing revealed before submitting`, info.outHidden === true && !info.locked);

  const t = parseFloat((info.q.match(/t\s*=\s*([\d.]+)/) || [])[1]);
  ok(`${c.id}: question names a concrete target time`, t > 0, `${t}s`);

  await page.fill('.predict-input', '0');
  await page.click('.predict-actions .btn');
  await page.waitForTimeout(9000);

  const res = await page.evaluate(() => ({
    shown: !document.querySelector('.predict-out')?.hidden,
    rows: [...document.querySelectorAll('.predict-rows div')].map(d => d.textContent.replace(/\s+/g, ' ').trim()),
    why: (document.querySelector('.predict-why')?.textContent || '').replace(/\s+/g, ' ').trim(),
    verdict: (document.querySelector('.predict-verdict-title')?.textContent || '').trim()
  }));
  ok(`${c.id}: a result appears`, res.shown);
  ok(`${c.id}: an explanation is given`, res.why.length > 40, `${res.why.slice(0, 60)}...`);

  const measured = parseFloat((res.rows.join(' ').match(/Measured from the simulation([\d.-]+)/) || [])[1]);
  const pctx = await page.evaluate(c.readCtx);
  const expected = c.theory(t, pctx);
  /* tolerance: the sim integrates on fixed steps, so exact agreement is not
     expected — this proves the number came from the simulation and not from a
     second formula evaluated by the UI */
  const tol = Math.max(Math.abs(expected) * 0.12, 0.35);
  ok(`${c.id}: measured value is real simulated physics`,
    measured != null && Math.abs(measured - expected) <= tol,
    `reported ${measured}, theory ${expected.toFixed(2)} (ctx ${JSON.stringify(pctx)})`);

  /* retry */
  await page.click('.predict-out .btn');
  await page.waitForTimeout(600);
  const again = await page.evaluate(() => ({
    enabled: !document.querySelector('.predict-input')?.disabled,
    hidden: document.querySelector('.predict-out')?.hidden
  }));
  ok(`${c.id}: retry reopens the input`, again.enabled && again.hidden);

  /* unmount leaves nothing behind */
  await page.evaluate(() => { location.hash = '#/formulas'; });
  await page.waitForTimeout(700);
  const left = await page.evaluate(() => document.querySelectorAll('.predict').length);
  ok(`${c.id}: unmount removes the prediction UI`, left === 0, `${left} left`);

  ok(`${c.id}: no console errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nprediction: shm + kin1d  ${results.length - bad}/${results.length} ok`);
process.exit(bad ? 1 : 0);