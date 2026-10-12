/* Throwaway: capture the registered 2D thermo-engine at desktop and 390px,
 * at several reservoir settings, for visual review. */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
function lp() { try { return createRequire(import.meta.url)('playwright'); } catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); } }
const { chromium } = lp();
const B = process.env.BASE || 'http://127.0.0.1:4321';
const ROUTE = B + '/#/sims/thermo-engine';
fs.mkdirSync('tools/.shots', { recursive: true });

const br = await chromium.launch({ channel: 'chrome' });

async function shot(name, vw, vh, th, tc) {
  const pg = await br.newPage({ viewport: { width: vw, height: vh } });
  await pg.goto(ROUTE, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1800);
  if (th != null) {
    await pg.evaluate(([a, b]) => {
      const s = document.querySelectorAll('.sim-controls input[type=range]');
      s[0].value = String(a); s[0].dispatchEvent(new Event('input', { bubbles: true }));
      s[1].value = String(b); s[1].dispatchEvent(new Event('input', { bubbles: true }));
    }, [th, tc]);
    await pg.waitForTimeout(700);
  }
  await pg.screenshot({ path: `tools/.shots/${name}.png` });
  const ro = await pg.evaluate(() => Object.fromEntries([...document.querySelectorAll('.sim-readouts .readout')]
    .map(r => [((r.childNodes[0] || {}).textContent || '').trim(), r.querySelector('b').textContent.trim()])));
  console.log(`  ${name}  ${vw}x${vh}  ${JSON.stringify(ro)}`);
  await pg.close();
}

await shot('thermo2d-default', 1440, 900, null, null);
await shot('thermo2d-hot-cold', 1440, 900, 500, 20);
await shot('thermo2d-mobile', 390, 844, null, null);
await shot('thermo2d-mobile-hot', 390, 844, 500, 20);
await br.close();