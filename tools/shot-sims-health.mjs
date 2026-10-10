/* PhysiX Academy — visual verification for the registry health audit.
 *
 * Captures the classes the audit treats differently, so the classification can be
 * argued with by eye: a dynamic simulation actually moving, an interactive one
 * responding to its control, a gated lazy-load one, and a third-party embed
 * behind its launch gate.
 *
 * Run: node tools/shot-sims-health.mjs [baseUrl]
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'));
const { chromium } = req('playwright');

const BASE = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'chrome' });

const SPOTS = [
  { id: 'newton',      label: 'dynamic + time controls', act: 'none' },
  { id: 'lens',        label: 'interactive: slider',      act: 'slider' },
  { id: 'ncert11-measure', label: 'interactive: pointer drag', act: 'drag' },
  { id: 'efield',      label: 'interactive: canvas click', act: 'click' },
  { id: 'cdn-3d-atom', label: 'interactive: gated button', act: 'button' },
  { id: 'phet-pendulum', label: 'third-party: launch gate', act: 'launch' }
];

for (const spot of SPOTS) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.goto(`${BASE}/#/sims/${spot.id}`, { waitUntil: 'networkidle' });
  await p.waitForSelector('.sim-frame', { timeout: 12000 });
  await p.waitForTimeout(900);

  if (spot.act === 'slider') {
    await p.evaluate(() => {
      const r = document.querySelector('.sim-frame input[type=range]');
      if (r) { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await p.waitForTimeout(350);
  } else if (spot.act === 'drag') {
    await p.evaluate(async () => {
      const c = document.querySelector('.sim-frame canvas');
      const r = c.getBoundingClientRect(), y = r.top + r.height * 0.5;
      c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 100, clientY: y, pointerId: 1, isPrimary: true }));
      for (let x = 100; x <= 200; x += 10) {
        c.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + x, clientY: y, pointerId: 1, isPrimary: true }));
        await new Promise(r2 => requestAnimationFrame(r2));
      }
      c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + 200, clientY: y, pointerId: 1, isPrimary: true }));
    });
    await p.waitForTimeout(350);
  } else if (spot.act === 'click') {
    await p.evaluate(() => {
      const c = document.querySelector('.sim-frame canvas');
      const r = c.getBoundingClientRect(), x = r.left + r.width * 0.35, y = r.top + r.height * 0.6;
      c.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
      c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
      c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
    });
    await p.waitForTimeout(700);
  } else if (spot.act === 'button') {
    await p.evaluate(() => {
      const b = [...document.querySelectorAll('.sim-frame button')].find(x => /load/i.test(x.textContent));
      if (b) b.click();
    });
    await p.waitForTimeout(3500);
  } else if (spot.act === 'launch') {
    await p.evaluate(() => { const b = document.querySelector('.sim-frame .btn-launch'); if (b) b.click(); });
    await p.waitForTimeout(2500);
  }

  const state = await p.evaluate(() => {
    const f = document.querySelector('.sim-frame');
    return {
      readouts: [...f.querySelectorAll('.readout')].map(r => r.innerText.replace(/\s+/g, ' ').trim()),
      canvases: f.querySelectorAll('canvas').length,
      iframe: f.querySelector('iframe') ? f.querySelector('iframe').src.slice(0, 52) : null,
      text: f.innerText.replace(/\s+/g, ' ').slice(0, 70)
    };
  });
  console.log(`  ${spot.id.padEnd(17)} ${spot.label.padEnd(28)} canvases=${state.canvases} ` +
    `${state.iframe ? 'iframe=' + state.iframe : ''}`);
  console.log(`  ${''.padEnd(17)} readouts: ${state.readouts.join(' | ') || '(none)'}`);

  await p.evaluate(() => {
    const r = document.querySelector('.sim-frame').getBoundingClientRect();
    window.scrollTo(0, r.y + window.scrollY - 12);
  });
  await p.waitForTimeout(250);
  const frame = await p.$('.sim-frame');
  if (frame) await frame.screenshot({ path: `tools/.shots/health-${spot.id}.png` });
  await p.close();
}

/* mobile spot check on a representative pair */
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
for (const id of ['newton', 'lens']) {
  await m.goto(`${BASE}/#/sims/${id}`, { waitUntil: 'networkidle' });
  await m.waitForSelector('.sim-frame');
  await m.waitForTimeout(700);
  const ov = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`  mobile ${id.padEnd(12)} horizontal overflow = ${ov}px`);
  await m.screenshot({ path: `tools/.shots/health-${id}-mobile.png` });
}
await m.close();
await browser.close();
console.log('  wrote health-*.png');