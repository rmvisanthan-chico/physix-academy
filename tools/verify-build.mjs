/* Verifies that `npm run bundle` produces a dist/ that actually works.
   The gap this closes: for a long while `npm run bundle` emitted zero
   stylesheets and no boot-guard.js, and reported success. A build that is
   missing assets does not throw - it ships a blank, unstyled site. So this
   serves dist/ and asserts the real thing renders.
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();
const BASE = process.argv[2] || 'http://localhost:4236';
const DIST = path.join(ROOT, 'dist');

const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };

/* ---------- 1. dist/ contains what the HTML actually references ---------- */
const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const refs = [...indexHtml.matchAll(/(?:href|src)="([^"#][^"]*)"/g)]
  .map(m => m[1])
  /* not filesystem paths: external URLs, Vercel's own endpoints, data URIs,
     and non-http schemes like mailto: and tel: */
  .filter(u => !/^https?:|^\/_vercel|^data:|^mailto:|^tel:|^javascript:/.test(u));

let missing = 0;
for (const u of refs) {
  const p = path.join(DIST, u.replace(/^\//, '').split('?')[0]);
  if (!fs.existsSync(p)) { ok(`dist has ${u}`, false, 'referenced by index.html but absent'); missing++; }
}
ok(`all ${refs.length} local references in dist/index.html resolve`, missing === 0, missing ? `${missing} missing` : '');

/* every root page referenced by the rollup inputs */
for (const f of ['index.html', '404.html', 'privacy.html', 'terms.html', 'login.html', 'motion-graphs.html']) {
  ok(`dist/${f}`, fs.existsSync(path.join(DIST, f)));
}

/* the stylesheet and the classic script, which Vite has no reason to emit */
for (const f of ['css/style.css', 'css/progress-dashboard.css', 'js/boot-guard.js']) {
  ok(`dist/${f} (never imported by JS)`, fs.existsSync(path.join(DIST, f)));
}

/* ---------- 2. and the served dist/ really renders ---------- */
const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const page = await c.newPage();
const IGNORED = /\/_vercel\//;
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => {
  if (m.type() !== 'error') return;
  const loc = m.location() || {};
  if (IGNORED.test(loc.url || '')) return;
  errs.push('console: ' + m.text().slice(0, 120) + ' @ ' + (loc.url || '?'));
});

await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => { location.hash = '#/dashboard'; });
await page.waitForTimeout(1200);
await page.evaluate(() => { location.hash = '#/'; });
await page.waitForTimeout(1200);
const home = await page.evaluate(() => ({
  len: (document.querySelector('#main')?.textContent || '').trim().length,
  /* Asserted on a real element's computed style, which is the only thing that
     distinguishes "the stylesheet loaded" from "the stylesheet is listed".
     The first two attempts matched on the href (fails: the bundler rewrites
     the path) and then on cssRules.length (fails: same-origin CSSOM access is
     blocked for these). Computed style cannot lie. */
  dashRulesInDom: document.querySelectorAll('link[rel=stylesheet]').length,
  booted: window.__PHYSIX_BOOTED === true,
  guardLoaded: typeof window.physixFail === 'function'
}));
ok('dist home renders content', home.len > 1000, `${home.len} chars`);
ok('dist boots the app (watchdog disarmed)', home.booted);
ok('dist loads the error boundary', home.guardLoaded);
/* style.css: .topbar is its own element and is styled by it alone. */
/* .wrap gets its max-width from style.css only. Checked on the dashboard,
   where the element definitely exists. */
const styleApplies = await page.evaluate(() => {
  const el = document.querySelector('.wrap');
  return el ? parseFloat(getComputedStyle(el).maxWidth) : 0;
});
ok('dist applies style.css', styleApplies > 200, `.wrap max-width=${styleApplies}px`);

await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
/* Now that the dashboard is rendered, ask whether ITS stylesheet applied. */
const dash = await page.evaluate(() => {
  const t = document.querySelector('.dash-title');
  const track = document.querySelector('.mastery-track');
  return {
    hasHello: !!document.querySelector('.dash-hello'),
    titleSize: t ? parseFloat(getComputedStyle(t).fontSize) : 0,
    /* .mastery-track's 99px radius exists only in progress-dashboard.css */
    trackRadius: track ? getComputedStyle(track).borderRadius : ''
  };
});
ok('dist dashboard renders', dash.hasHello);
ok('dist dashboard is styled (title sized by CSS)', dash.titleSize > 16, `${dash.titleSize}px`);
ok('dist dashboard stylesheet applied (.mastery-track)',
  /99px/.test(dash.trackRadius), `radius=${dash.trackRadius}`);
ok('no errors on dist', errs.length === 0, errs.slice(0, 3).join(' | '));

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nbundled build  ${results.length - bad}/${results.length} ok`);
process.exit(bad ? 1 : 0);