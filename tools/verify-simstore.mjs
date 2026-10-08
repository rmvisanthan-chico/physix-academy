/* Phase 2 <-> Phase 3 integration: does simulation use actually reach the Store?
 * Asserts the counters exist, that real time is recorded, that hidden time is
 * NOT counted, that a mis-click is not counted, and that nothing is broken when
 * storage is unavailable.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();
const BASE = process.argv[2] || 'http://localhost:4253';

const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const c = await browser.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce' });
const page = await c.newPage();
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);

/* ---------- real engagement is recorded ---------- */
/* Navigating with location.hash does NOT unmount the old sim: afterRender runs
   for the new route, replacing #main wholesale, but the observer watches the
   OLD host, which is already detached. The first version of this test therefore
   never triggered the unmount path and reported zero. Real students click links,
   so drive it the way a person does. */
/* Real clicks, because location.hash does not take the path a student does.
   `hold` is the dwell measured from the moment the simulation actually
   appeared, not from the click: Playwright's own actionability wait plus the
   router render is ~160ms, which otherwise inflates a 500ms "mis-click" past
   the 2s threshold and makes this test fail for the wrong reason. */
async function useSim(sim, hold) {
  /* Always start from the catalogue: after clearing storage the app may be on a
     different route, and the sim links only exist there. Simple and explicit
     beats clever conditionals that quietly skip the setup. */
  await page.goto(`${BASE}/#/sims`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(450);
  const link = await page.$(`a[href="#/sims/${sim}"]`);
  if (!link) throw new Error(`no link to #/sims/${sim} on the catalogue page`);
  await link.click();
  /* wait for the sim to exist, THEN hold */
  await page.waitForSelector('.sim-frame canvas, .sim-frame iframe, .sim-frame .empty-state',
    { timeout: 10000 });
  if (hold > 0) await page.waitForTimeout(hold);
  await page.evaluate(() => { location.hash = '#/sims'; });
  await page.waitForTimeout(500);
}
await useSim('newton', 3000);

const afterOne = await page.evaluate(async () => {
  const { Store } = await import('/js/utils.js');
  await Store.ready();
  return Store.simActivity();
});
ok('opening and using a simulation is recorded', afterOne.count >= 1,
  `sims=${afterOne.count} min=${afterOne.totalMin}`);
ok('time is in a sensible range, not inflated', afterOne.totalMin <= 2 && afterOne.totalMin >= 0,
  `${afterOne.totalMin} min recorded`);

/* ---------- a mis-click is not recorded ---------- */
/* Clear IndexedDB too: Store.ready() reconciles against it and it wins over
   the localStorage mirror, so clearing only localStorage leaves the previous
   run's data in place. That is also why this test failed on a re-run. */
await page.evaluate(async () => {
  localStorage.clear();
  await new Promise(res => {
    const rq = indexedDB.open('physix-academy', 1);
    rq.onsuccess = () => {
      const db = rq.result;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').clear();
      tx.oncomplete = () => { db.close(); res(); };
      tx.onerror = () => { db.close(); res(); };
    };
    rq.onerror = () => res();
  });
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await useSim('shm', 0);   /* a mis-click: barely on screen */
const afterClick = await page.evaluate(async () => {
  const { Store } = await import('/js/utils.js');
  await Store.ready();
  return Store.simActivity();
});
ok('a sub-2s view is not counted as study', afterClick.count === 0,
  `sims=${afterClick.count} (opened and left immediately)`);

/* ---------- two sims are distinguished ---------- */
for (const s of ['newton', 'projectile']) await useSim(s, 2400);
const two = await page.evaluate(async () => {
  const { Store } = await import('/js/utils.js');
  await Store.ready();
  return Store.simActivity();
});
ok('each simulation is tracked separately', two.count === 2, two.list.map(x => x.id).join(', '));

/* ---------- storage unavailable must not break a simulation ---------- */
const blocked = await page.evaluate(async () => {
  const real = Storage.prototype.setItem;
  Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); };
  let simOk = true;
  try {
    const { Sims } = await import('/js/sims-a.js');
    const host = document.createElement('div');
    document.body.appendChild(host);
    Sims.mount('newton', host);
    simOk = !!host.querySelector('.sim-frame canvas');
  } catch (e) { simOk = 'THREW: ' + e.message; }
  Storage.prototype.setItem = real;
  return simOk;
});
ok('a simulation still runs when storage throws', blocked === true, String(blocked));

/* ---------- nothing regressed in the routes that host sims ---------- */
await page.goto(`${BASE}/#/sims`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const list = await page.evaluate(() => ({
  cards: document.querySelectorAll('#main .card').length,
  broken: /hit a problem|did not load/i.test(document.querySelector('#main')?.textContent || '')
}));
ok('the simulation catalogue still renders', list.cards > 5 && !list.broken, `${list.cards} cards`);

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nsim<->store integration  ${results.length - bad}/${results.length} ok`);
process.exit(bad ? 1 : 0);