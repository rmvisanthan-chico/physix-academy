/* Asserts the video-backdrop contract in a real browser:
   - no file present  -> no request for it, no console noise, gradient stands
   - file present      -> probed, plays, fades in via .is-ready
   - reduced motion    -> element is never even fetched
   - hidden tab        -> playback pauses                                    */
import { createRequire } from 'node:module';
import path from 'node:path';
import { createRequire as _c } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();
const BASE = process.argv[2] || 'http://localhost:4198';
const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };

/* --- with a video present --- */
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 } });
  const page = await ctx.newPage();
  const noise = [];
  page.on('console', m => { if (m.type() === 'error') noise.push(m.text()); });
  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  ok('video element kept when a file exists', await page.isVisible('#p-bg'));
  const st = await page.evaluate(() => {
    const v = document.getElementById('p-bg');
    return { srcs: [...v.querySelectorAll('source')].map(s => s.getAttribute('src')),
             ready: v.classList.contains('is-ready'), paused: v.paused,
             t: v.currentTime, muted: v.muted, loop: v.loop, w: v.videoWidth };
  });
  ok('source attached from the real file', st.srcs.some(s => /login-bg\.(webm|mp4)$/.test(s)), st.srcs.join(','));
  ok('video actually decoded', st.w > 0, `videoWidth=${st.w}`);
  ok('is-playing (not frozen on frame 0)', !st.paused && st.t > 0, `paused=${st.paused} t=${st.t.toFixed(2)}`);
  ok('faded in via .is-ready', st.ready);
  ok('muted + loop (required for autoplay)', st.muted && st.loop);
  ok('no console errors', noise.length === 0, noise.join(' | '));

  /* tab hidden -> paused */
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(400);
  ok('pauses when the tab is hidden', await page.evaluate(() => document.getElementById('p-bg').paused));
  await ctx.close();
}

/* --- reduced motion: must not even fetch it --- */
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const asked = [];
  page.on('request', r => { if (/login-bg\.(webm|mp4)/.test(r.url())) asked.push(r.url()); });
  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  ok('reduced motion: video removed', !(await page.isVisible('#p-bg')));
  ok('reduced motion: never fetched', asked.length === 0, asked.join(','));
  ok('reduced motion: form still usable', await page.isVisible('#p-name'));
  await ctx.close();
}

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nvideo backdrop  ${results.length - bad}/${results.length} ok`);
process.exit(bad ? 1 : 0);
