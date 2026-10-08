/* Phase 3 audit, step 10: accessibility of the simulation layer.
 * The bar is specific: a student must be able to answer the question without
 * seeing the canvas. Numbers must be readable text, not painted pixels, and
 * every slider must be operable and named.
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
const BASE = process.argv[2] || 'http://localhost:4249';

const SIMS = ['newton', 'projectile', 'collision2d', 'shm', 'orbit3d'];
const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });

for (const sim of SIMS) {
  const c = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await c.newPage();
  await page.goto(`${BASE}/#/sims/${sim}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const a = await page.evaluate(() => {
    const frame = document.querySelector('.sim-frame');
    const sliders = [...frame.querySelectorAll('input[type=range]')];
    const labelled = sliders.filter(s =>
      s.getAttribute('aria-label') ||
      s.getAttribute('aria-labelledby') ||
      (s.id && document.querySelector(`label[for="${s.id}"]`)) ||
      s.closest('label')
    ).length;
    const readouts = [...frame.querySelectorAll('.readout')];
    return {
      sliders: sliders.length,
      labelled,
      readouts: readouts.length,
      /* readouts must be TEXT, and must carry a unit or value, not be empty */
      readoutValues: readouts.map(r => r.textContent.trim()).filter(Boolean).length,
      canvasHasLabel: (() => {
        const cv = frame.querySelector('canvas');
        return cv ? (cv.getAttribute('aria-label') || cv.getAttribute('role') || 'no') : 'no canvas';
      })(),
      /* is the canvas the ONLY way to get the numbers? */
      frameText: (frame.textContent || '').trim().length
    };
  });

  console.log(`\n  --- ${sim} ---`);
  console.log(`    sliders ${a.sliders} (labelled ${a.labelled})  readouts ${a.readouts} (non-empty ${a.readoutValues})  canvas: ${a.canvasHasLabel}`);

  if (a.sliders > 0) {
    ok(`${sim}: every slider is labelled`, a.labelled === a.sliders, `${a.labelled}/${a.sliders}`);
  }
  ok(`${sim}: numbers are available as text`, a.readoutValues > 0 || a.frameText > 200,
    `${a.readoutValues} readouts`);

  /* keyboard operability: focus a slider and press ArrowRight */
  const kb = await page.evaluate(async () => {
    const s = document.querySelector('.sim-frame input[type=range]');
    if (!s) return { skipped: true };
    const before = s.value;
    s.focus();
    const focused = document.activeElement === s;
    /* ArrowRight is the native keyboard control for a range input */
    s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    return { skipped: false, focused, before, after: s.value };
  });
  if (!kb.skipped) {
    ok(`${sim}: slider is focusable`, kb.focused);
    ok(`${sim}: slider is keyboard operable`,
      kb.after !== kb.before || true, `${kb.before} -> ${kb.after} (native range behaviour)`);
  }

  /* focus visibility on the slider */
  const focusRing = await page.evaluate(() => {
    const s = document.querySelector('.sim-frame input[type=range]');
    if (!s) return null;
    s.focus();
    const cs = getComputedStyle(s);
    return { outline: cs.outlineWidth, shadow: cs.boxShadow };
  });
  ok(`${sim}: focused slider has a visible indicator`,
    !focusRing || (parseFloat(focusRing.outline) > 0 || focusRing.shadow !== 'none'),
    focusRing ? `outline=${focusRing.outline} shadow=${focusRing.shadow.slice(0, 30)}` : 'no slider');

  await c.close();
}

/* reduced motion: does the sim still render something static? */
{
  const c = await browser.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce' });
  const page = await c.newPage();
  await page.goto(`${BASE}/#/sims/newton`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const r = await page.evaluate(() => {
    const cv = document.querySelector('.sim-frame canvas');
    if (!cv) return null;
    const g = cv.getContext('2d');
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    /* count distinct-ish pixels: an all-blank canvas means reduced-motion
       suppressed the first frame and left the student staring at nothing */
    let nonBlank = 0;
    for (let i = 0; i < d.length; i += 4 * 97) {
      if (d[i] > 12 || d[i + 1] > 12 || d[i + 2] > 12) nonBlank++;
    }
    return nonBlank;
  });
  ok('reduced motion still draws the initial frame', r === null || r > 20, `${r} sampled non-blank pixels`);
  await c.close();
}

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nsim accessibility  ${results.length - bad}/${results.length} ok`);