/* Confirms the repaired emoji actually reach the DOM as real characters,
   not as the mojibake glyphs. Reads them back out of the live page. */
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
const BASE = process.argv[2] || 'http://localhost:4204';
const OUT = path.join(os.tmpdir(), 'opencode', 'shots');

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })).newPage();
await page.goto(`${BASE}/#/sims`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);

const info = await page.evaluate(() => {
  const txt = document.body.innerText;
  // Real emoji sit in the astral planes; mojibake shows up as these ranges.
  const emoji = [...new Set(txt.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [])];
  const mojibake = (txt.match(/[âÃðÂ][\u0080-\u00BF\u2018-\u201F\u20AC]{1,3}/g) || []);
  return { emoji, mojibake, len: txt.length };
});

console.log(`  emoji glyphs rendered : ${info.emoji.length} distinct -> ${info.emoji.join(' ')}`);
console.log(`  mojibake sequences    : ${info.mojibake.length}${info.mojibake.length ? ' -> ' + info.mojibake.slice(0, 8).join(' ') : ''}`);
console.log(`  page text length      : ${info.len}`);
await page.screenshot({ path: path.join(OUT, 'sims-catalogue.png') });
await browser.close();

if (info.mojibake.length) { console.log('\n  FAIL: mojibake still visible in the DOM'); process.exit(1); }
console.log('\n  ok - no mojibake in the rendered page');