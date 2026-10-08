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
const BASE = process.argv[2] || 'http://localhost:4270';
const OUT = path.join(os.tmpdir(), 'opencode', 'shots');

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({
  viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce'
})).newPage();

await page.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.locator('.sim-frame').screenshot({ path: path.join(OUT, 'graph-projectile.png') });
console.log('  captured graph-projectile.png');

/* mobile */
const m = await (await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  deviceScaleFactor: 2, reducedMotion: 'reduce'
})).newPage();
await m.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'networkidle' });
await m.waitForTimeout(3000);
await m.locator('.sim-frame').screenshot({ path: path.join(OUT, 'graph-projectile-mobile.png') });
const info = await m.evaluate(() => {
  const cv = document.querySelector('.pgraph canvas');
  const foot = document.querySelector('.pgraph-foot');
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    canvasW: cv ? Math.round(cv.getBoundingClientRect().width) : 0,
    canvasH: cv ? Math.round(cv.getBoundingClientRect().height) : 0,
    footDir: foot ? getComputedStyle(foot).flexDirection : ''
  };
});
console.log(`  mobile: overflow=${info.overflow}px canvas=${info.canvasW}x${info.canvasH} legend=${info.footDir}`);

await browser.close();