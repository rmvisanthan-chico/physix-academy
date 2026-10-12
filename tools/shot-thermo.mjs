/* Throwaway: capture the thermo-engine at desktop and 390px for visual review. */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();

const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const OUT = 'tools/.shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });

async function shot(name, vw, vh, setup) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  await page.goto(`${BASE}/html5-sims/thermo-engine.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  /* Clicking a control scrolls the scrollable panel to bring it into view,
     which made the reservoir sliders vanish from the mobile screenshots. That
     was the capture script's doing, not the layout's. */
  await page.evaluate(() => { const p = document.querySelector('.panel'); if (p) p.scrollTop = 0; });
  if (setup) { await setup(page); await page.evaluate(() => { const p = document.querySelector('.panel'); if (p) p.scrollTop = 0; }); }
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  wrote ${OUT}/${name}.png  (${vw}x${vh})`);
  await page.close();
}

const set = (id, v) => async page => {
  await page.evaluate(([i, val]) => {
    const e = document.getElementById(i); e.value = String(val);
    e.dispatchEvent(new Event('input', { bubbles: true }));
  }, [id, v]);
};

await shot('thermo-default-desktop', 1440, 900, async p => { await p.click('#bGo'); });
await shot('thermo-hot-carnot', 1440, 900, async p => {
  await p.click('#bGo');
  await set('sTh', 1100)(p); await set('sTc', 300)(p);
});
await shot('thermo-lossy', 1440, 900, async p => {
  await p.click('#bGo');
  await set('sIr', 0.9)(p);
});
await shot('thermo-mobile', 390, 844, async p => { await p.click('#bGo'); });
await shot('thermo-mobile-wide-range', 390, 844, async p => {
  await p.click('#bGo');
  await set('sTh', 1200)(p); await set('sTc', 200)(p);
});

await browser.close();