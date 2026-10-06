/* Screenshot the profile page in its three states so the effects can be
   eyeballed rather than assumed: signed out, saved, and reduced-motion. */
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const OUT = path.join(os.tmpdir(), 'opencode', 'shots');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();
const BASE = process.argv[2] || 'http://localhost:4195';

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });

async function shot(name, { motion = 'no-preference', act } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1000, height: 760 },
    reducedMotion: motion,
    deviceScaleFactor: 2
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);          // let the stagger settle
  if (act) await act(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  if (errs.length) console.log(`  ${name}: PAGE ERRORS -> ${errs.join(' | ')}`);
  else console.log(`  ${name}: ok`);
  await ctx.close();
}

await shot('profile-empty');
await shot('profile-reduced', { motion: 'reduce' });
await shot('profile-saved', {
  act: async (p) => {
    await p.fill('#p-name', 'Aarav');
    await p.selectOption('#p-cls', 'Class 11');
    await p.click('#p-save');
  }
});

await browser.close();
console.log(`\nscreenshots -> ${OUT}`);
