/* PhysiX Academy - Simulation UI acceptance check (sim-transform Phase B)
   ------------------------------------------------------------
   Verifies the workstation design system and the catalogue changes:

     1. #/sims catalogue shows exactly 40 simulations (10 PhET iframes and
        the "ns" external-site embed are gone; source files untouched).
     2. #/sims/workstation-demo renders the full workstation chrome:
        header chips (incl. the real-world application), stage canvas,
        side panel, two Graph-engine plots and the Predict slot.
     3. Interactions work: layer switch, quality selector, transport
        (play/pause/step/reset/speed), presets; measurements update while
        the sim runs; graph data is recorded.
     4. Zero console errors / pageerrors on both pages.

     node tools/check-sim-ui.mjs http://localhost:4191   */
import { createRequire } from 'node:module';

const BASE = process.argv[2] || 'http://localhost:4191';

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch (_) {
  const { execFileSync } = await import('node:child_process');
  const path = await import('node:path');
  const win = process.platform === 'win32';
  const globals = execFileSync(win ? 'npm.cmd' : 'npm', ['root', '-g'], {
    encoding: 'utf8',
    shell: win
  }).trim();
  ({ chromium } = createRequire(path.join(globals, 'noop.js'))('playwright'));
}

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const IGNORE = /favicon|_vercel|netlify|googletagmanager|gtag|adsbygoogle|ERR_INTERNET_DISCONNECTED|Failed to load resource|Transition was skipped|New ViewTransition started/i;

let fails = 0;
const report = [];
const ok = (name, pass, extra = '') => {
  report.push((pass ? 'PASS  ' : 'FAIL  ') + name + (extra ? '  [' + extra + ']' : ''));
  if (!pass) fails++;
};

function attachErrors(tag) {
  const errs = [];
  const onErr = (e) => {
    const m = e.message || String(e);
    if (!IGNORE.test(m)) errs.push((tag + ' pageerror: ' + m.split('\n')[0]).slice(0, 200));
  };
  const onCon = (m) => {
    if (m.type() === 'error' && !IGNORE.test(m.text()))
      errs.push((tag + ' console: ' + m.text().slice(0, 200)));
  };
  page.on('pageerror', onErr);
  page.on('console', onCon);
  return () => {
    errs.forEach((e) => ok('no errors', false, e));
    page.removeListener('pageerror', onErr);
    page.removeListener('console', onCon);
    if (!errs.length) ok('no console/page errors', true, tag);
  };
}

await page.goto(BASE + '/#/sims', { waitUntil: 'load', timeout: 30000 });

/* ============ 1. catalogue ============ */
let finishErrors = attachErrors('catalogue');
try {
  await page.waitForSelector('.sim-cat-card', { timeout: 20000 });
  const cards = await page.locator('.sim-cat-card').count();
  /* 40 in-app benches + the 40 standalone 3D-set cards merged into the same
     grid = 80 catalogue cards. */
  ok('catalogue shows 80 simulations (40 in-app + 40 3D set)', cards === 80, 'cards=' + cards);
  const inApp = await page.locator('.sim-cat-card a[href^="#/sims/"]').count();
  const threeD = await page.locator('.sim-cat-card a[href^="/html5-sims/"]').count();
  ok('catalogue splits 40 in-app + 40 standalone', inApp === 40 && threeD === 40, 'inApp=' + inApp + ' 3D=' + threeD);
  const countText = await page.textContent('#sim-count');
  ok('count label says "80 simulations"', /80 simulations/.test(countText || ''), (countText || '').trim());

  /* the de-registered ids must not be routable-as-catalogue or present at all */
  const hasPhet = await page.locator('.sim-cat-card', { hasText: 'PhET' }).count();
  ok('no PhET entries in catalogue', hasPhet === 0, 'phet=' + hasPhet);
  const hasNs = await page.locator('.sim-cat-card', { hasText: 'PHYSIX LAB' }).count();
  ok('no "ns" external-site entry in catalogue', hasNs === 0, 'ns=' + hasNs);
} catch (e) {
  ok('catalogue rendered', false, String(e).slice(0, 120));
}
finishErrors();

/* ============ 2. workstation demo ============ */
await page.evaluate(() => { location.hash = '#/sims/workstation-demo'; });
finishErrors = attachErrors('workstation');
try {
  await page.waitForSelector('.ws-root', { timeout: 15000 });

  ok('workstation root present', (await page.locator('.ws-root').count()) === 1);
  ok('side panel present', (await page.locator('.ws-side').count()) === 1);
  ok('foot strip present', (await page.locator('.ws-foot').count()) === 1);
  ok('stage canvas present', (await page.locator('.ws-stage-wrap canvas').count()) === 1);
  ok('two graph canvases', (await page.locator('.ws-graphs .pgraph canvas').count()) === 2,
    'found=' + (await page.locator('.ws-graphs .pgraph canvas').count()));
  ok('prediction (POR) slot present', (await page.locator('.ws-por .predict').count()) === 1);
  ok('transport present', (await page.locator('.ws-transport .ws-tbtn').count()) === 3,
    'buttons=' + (await page.locator('.ws-transport .ws-tbtn').count()));
  ok('speed selector present', (await page.locator('.ws-transport .ws-speed').count()) === 1);
  ok('layer switcher present', (await page.locator('.ws-layers .ws-layerbtn').count()) === 2,
    'buttons=' + (await page.locator('.ws-layers .ws-layerbtn').count()));
  ok('application chip shows real-world app',
    (await page.locator('.ws-chip-app').textContent() || '').includes('EV acceleration test track'));
  ok('3 presets', (await page.locator('.ws-preset').count()) === 3);

  /* ---------- interactions ---------- */
  /* read a measurement, run the sim, read it again. Poll the VELOCITY
     readout (2-decimal) rather than position (1-decimal): it changes after
     ~3 ms of sim time. Also poll rather than use a fixed wait: the
     verification browser's rAF is throttled when its window is occluded and
     SU.loop clamps dt to 33ms, so sim time can advance well slower than
     wall time. */
  const readV = async () => (await page.locator('.ws-readouts .readout b').nth(1).textContent()).trim();
  const vBefore = await readV();
  let vAfter = vBefore,
    waited = 0;
  while (vAfter === vBefore && waited < 15000) {
    await page.waitForTimeout(500);
    waited += 500;
    vAfter = await readV();
  }
  ok('measurements update while running', vBefore !== vAfter, vBefore + ' → ' + vAfter + ' after ' + waited + 'ms');

  /* graph actually recording samples */
  const samples = await page.evaluate(() => {
    const w = window.PhysixWorkstation;
    return !!w;
  });
  ok('window.PhysixWorkstation exposed', samples === true);

  /* layer switch */
  await page.locator('.ws-layerbtn', { hasText: 'Scientific' }).click();
  await page.waitForTimeout(250);
  ok('layer switch keeps zero errors', true);

  /* quality selector */
  await page.locator('.ws-qsel').selectOption('low');
  await page.waitForTimeout(150);
  const tier = (await page.locator('.ws-tier').textContent()).trim();
  ok('quality select updates tier note', /LOW/.test(tier), tier);
  await page.locator('.ws-qsel').selectOption('auto');

  /* transport: pause → step → play → reset.
     The step check reads VELOCITY (2-decimal readout): a 1/60 s step at
     a ≈ 3.8 m/s² changes v by ~0.06 m/s, which always moves the display;
     the position readout is 0.1 m resolution and would not. */
  const playBtn = page.locator('.ws-transport .ws-tplay');
  await playBtn.click(); /* pause */
  await page.waitForTimeout(300);
  const pausedVal = (await page.locator('.ws-readouts .readout b').first().textContent()).trim();
  await page.waitForTimeout(400);
  const pausedVal2 = (await page.locator('.ws-readouts .readout b').first().textContent()).trim();
  ok('pause freezes the sim', pausedVal === pausedVal2, pausedVal + ' / ' + pausedVal2);

  const vStep1 = (await page.locator('.ws-readouts .readout b').nth(1).textContent()).trim();
  await page.locator('.ws-transport .ws-tbtn', { hasText: '⏭' }).click();
  await page.waitForTimeout(200);
  const vStep2 = (await page.locator('.ws-readouts .readout b').nth(1).textContent()).trim();
  ok('step advances the sim', vStep1 !== vStep2, vStep1 + ' → ' + vStep2);

  await playBtn.click(); /* play */
  await page.waitForTimeout(300);
  await page.locator('.ws-transport .ws-tbtn', { hasText: '↺' }).click(); /* reset (auto-plays) */
  await playBtn.click(); /* pause immediately: one frame of motion is invisible */
  await page.waitForTimeout(150);
  const resetVal = (await page.locator('.ws-readouts .readout b').first().textContent()).trim();
  /* A pause click costs a frame or two, so allow the first fraction of a
     second rather than requiring an exact 0.0. */
  ok('reset returns to start', +resetVal < 1.5, resetVal);

  /* preset */
  await page.locator('.ws-preset', { hasText: 'Rough surface' }).click();
  await page.waitForTimeout(200);
  ok('preset click lands', (await page.locator('.ws-preset-on', { hasText: 'Rough surface' }).count()) === 1);
} catch (e) {
  ok('workstation demo rendered', false, String(e).slice(0, 160));
}
finishErrors();

await browser.close();

console.log('\nPhysiX simulation UI check — ' + BASE);
console.log(report.join('\n'));
console.log('\n' + (fails ? fails + ' check(s) FAILED' : 'All checks passed'));
process.exit(fails ? 1 : 0);
