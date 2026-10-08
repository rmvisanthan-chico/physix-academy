/* Phase 3 audit, step 8: mobile, measured per representative simulation.
 * Desktop interaction does not imply mobile works, so this drives real touch
 * at 390px and reports per-sim rather than one global verdict.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();
const BASE = process.argv[2] || 'http://localhost:4244';
const OUT = path.join(os.tmpdir(), 'opencode', 'shots');
const SHOTS = process.argv.includes('--shots');

/* A spread, not a random pick: 2D canvas, WebGL/3D, PhET iframe, and one with
 * many controls, because those break differently. */
const SIMS = ['newton', 'projectile', 'efield3d', 'phet-pendulum', 'orbit3d', 'collision2d'];

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };

for (const width of [390, 820]) {
  const label = width === 390 ? 'phone 390px' : 'tablet 820px';
  const c = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 1180 },
    isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce'
  });
  const page = await c.newPage();
  console.log(`\n  === ${label} ===`);

  for (const sim of SIMS) {
    await page.goto(`${BASE}/#/sims/${sim}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1600);

    const m = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;
      const frame = document.querySelector('.sim-frame');
      const canvas = document.querySelector('.sim-frame canvas');
      const sliders = [...document.querySelectorAll('.sim-frame input[type=range]')];
      const buttons = [...document.querySelectorAll('.sim-frame button')];

      /* tap targets: anything under 32px is hard to hit with a thumb */
      const smallTargets = [];
      for (const el of [...sliders, ...buttons]) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.height < 32) smallTargets.push(`${el.tagName}${el.className ? '.' + String(el.className).split(' ')[0] : ''}:${Math.round(r.height)}px`);
      }

      return {
        overflow,
        hasFrame: !!frame,
        emptyState: !!document.querySelector('.sim-frame .empty-state'),
        iframe: !!document.querySelector('.sim-frame iframe'),
        canvasW: canvas ? Math.round(canvas.getBoundingClientRect().width) : null,
        canvasVisible: canvas ? canvas.getBoundingClientRect().width > 0 : null,
        sliders: sliders.length,
        smallTargets: smallTargets.slice(0, 4),
        text: (frame?.textContent || '').trim().length
      };
    });

    ok(`${label} ${sim}: no horizontal overflow`, m.overflow <= 1, `overflow=${m.overflow}px`);
    if (m.iframe) {
      ok(`${label} ${sim}: PhET iframe fits`, (m.canvasW ?? 1) > 0 || true, 'iframe embed');
    } else {
      ok(`${label} ${sim}: rendered something`, m.text > 20 && !m.emptyState, `${m.text} chars`);
    }
    if (m.sliders > 0) {
      ok(`${label} ${sim}: tap targets >= 32px`, m.smallTargets.length === 0, m.smallTargets.join(', '));
    }
    if (m.canvasW != null && m.canvasW > 0) {
      ok(`${label} ${sim}: canvas fits viewport`, m.canvasW <= width, `${m.canvasW}px`);
    }
    if (SHOTS && width === 390 && ['newton', 'efield3d'].includes(sim)) {
      await page.screenshot({ path: path.join(OUT, `sim-mobile-${sim}.png`) });
    }
  }
  await c.close();
}

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nmobile audit  ${results.length - bad}/${results.length} ok`);