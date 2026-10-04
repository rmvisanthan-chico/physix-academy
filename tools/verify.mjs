/* PhysiX Academy - build verification harness.
   Loads the site in a real browser and reports anything that throws, so a
   refactor can be checked against a recorded baseline instead of by eye.

   Playwright is resolved from the global install if the project has none.

     node tools/verify.mjs http://localhost:4173 base
     node tools/verify.mjs https://physix-academy.vercel.app live          */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:4173';
const LABEL = process.argv[3] || 'target';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch (_) {
    const globals = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return createRequire(path.join(globals, 'noop.js'))('playwright');
  }
}
const { chromium } = loadPlaywright();

// Every route the SPA can render. Each is checked for thrown errors and for
// having actually painted something into the view container.
const ROUTES = [
  '#/', '#/learn', '#/topics', '#/sims', '#/games', '#/practice', '#/tutor',
  '#/formulas', '#/calculators', '#/people', '#/progress', '#/support'
];
const SIM_PAGES = ['#/sims/newton', '#/sims/energy', '#/sims/circuit', '#/sims/collision'];

// NOTE: must be a single regex. `reA || reB` would keep only reA, since a
// regex literal is truthy - that silently dropped the ViewTransition filter.
const IGNORE = /favicon|_vercel|netlify|googletagmanager|gtag|adsbygoogle|ERR_INTERNET_DISCONNECTED|Failed to load resource|Transition was skipped|New ViewTransition started/i;

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

let fails = 0;
const report = [];

for (const route of [...ROUTES, ...SIM_PAGES]) {
  const errs = [];
  const onErr = e => {
    const m = e.message || String(e);
    if (!IGNORE.test(m)) errs.push(m.split('\n')[0].slice(0, 160));
  };
  const onCon = m => {
    if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push('console: ' + m.text().slice(0, 160));
  };
  page.on('pageerror', onErr);
  page.on('console', onCon);

  let info = {};
  try {
    // Navigate the way a visitor does: load once, then move by hash. Loading
    // /index.html#/route directly does not exercise the router, and made
    // several routes look identical in the first baseline run.
    if (route === ROUTES[0]) {
      await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(2600);
    } else {
      await page.evaluate(r => { location.hash = r; }, route);
    }
    await page.waitForTimeout(route.startsWith('#/sims/') ? 3200 : 2400);
    info = await page.evaluate(() => {
      const app = document.getElementById('app') || document.querySelector('main') || document.body;
      return {
        hash: location.hash,
        chars: (app.innerText || '').trim().length,
        nodes: app.querySelectorAll('*').length,
        canvases: app.querySelectorAll('canvas').length,
        simSlots: app.querySelectorAll('.sim-slot, .sim-slot-lg').length,
        cards: document.querySelectorAll('.topic-card, a.card').length
      };
    });
    // a route that did not take is a failure, not just an empty page.
    // The home route has no hash at all, so treat '' as '#/'.
    const at = info.hash || '#/';
    if (at !== route) errs.push(`router did not take: at ${at}, wanted ${route}`);
  } catch (e) {
    errs.push('nav: ' + e.message.split('\n')[0].slice(0, 120));
  }
  page.off('pageerror', onErr);
  page.off('console', onCon);

  const bad = errs.length || !info.chars || !info.nodes;
  if (bad) fails++;
  report.push({ route, bad, errs: [...new Set(errs)], info });
}

// the standalone 3D set
const simDir = path.join(ROOT, 'html5-sims');
const simFiles = [];
try {
  const { readdirSync } = await import('node:fs');
  for (const f of readdirSync(simDir)) if (f.endsWith('.html') && f !== 'index.html') simFiles.push(f);
} catch (_) { /* running against a live URL where this tree may not exist */ }

let simFails = 0;
for (const f of simFiles) {
  const errs = [];
  const onErr = e => errs.push(e.message.split('\n')[0].slice(0, 140));
  const onCon = m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text().slice(0, 140)); };
  page.on('pageerror', onErr); page.on('console', onCon);
  let painted = false;
  try {
    await page.goto(`${BASE}/html5-sims/${f}`, { waitUntil: 'load', timeout: 40000 });
    await page.waitForTimeout(2400);
    painted = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return !!c && c.width > 0;
    });
  } catch (e) { errs.push('nav: ' + e.message.split('\n')[0].slice(0, 100)); }
  page.off('pageerror', onErr); page.off('console', onCon);
  if (errs.length || !painted) {
    simFails++;
    report.push({ route: f, bad: true, errs: [...new Set(errs)].slice(0, 2), info: { painted } });
  }
}
await browser.close();

console.log(`\n=== ${LABEL} (${BASE}) ===`);
for (const r of report) {
  const tag = r.bad ? 'FAIL' : 'ok  ';
  console.log(`  ${tag} ${r.route.padEnd(20)} nodes=${String(r.info.nodes ?? '-').padEnd(6)} chars=${String(r.info.chars ?? '-').padEnd(6)} canvas=${r.info.canvases ?? '-'}`);
  for (const e of r.errs) console.log(`       ${e}`);
}
const totalRoutes = ROUTES.length + SIM_PAGES.length;
console.log(`\nroutes ${totalRoutes - fails}/${totalRoutes} ok   standalone sims ${simFiles.length - simFails}/${simFiles.length} ok`);
process.exit(fails + simFails ? 1 : 0);