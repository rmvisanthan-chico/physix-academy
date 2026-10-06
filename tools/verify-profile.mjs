/* Behaviour test for the optional learner profile.
   Checks the actual flows in a real browser, not just that files return 200:
   signed-out form, validation, save, persistence, greeting on #/progress,
   "forget me", and that the disabled gate in index.html still does not fire. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch {
    const glob = process.env.APPDATA + '\\npm\\node_modules';
    return createRequire(path.join(glob, 'noop.js'))('playwright');
  }
}
const { chromium } = loadPlaywright();

const BASE = process.argv[2] || 'http://localhost:4191';
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

/* 1. signed out shows the form, not the saved panel */
await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
ok('signed out shows the form', await page.isVisible('#p-form'), '');
ok('signed out hides the saved panel', !(await page.isVisible('#p-done-wrap')));

/* 2. empty submit is rejected with a visible message, no navigation */
await page.click('#p-save');
await page.waitForTimeout(150);
const errText = (await page.textContent('#p-err')) || '';
ok('empty name is rejected', errText.trim().length > 0, errText.trim());

/* 3. happy path saves under the documented key and shape */
await page.fill('#p-name', 'Aarav');
await page.selectOption('#p-cls', 'Class 11');
await page.click('#p-save');
await page.waitForTimeout(250);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('physix-user') || 'null'));
ok('profile persisted', !!stored && stored.name === 'Aarav', JSON.stringify(stored));
ok('persists `class` for the gate contract', !!stored && stored.class === 'Class 11');
ok('saved panel now shown', await page.isVisible('#p-done-wrap'));

/* 4. greeting renders on the progress route */
await page.goto(`${BASE}/#/progress`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
const prog = await page.textContent('body');
ok('progress page greets by name', /Aarav/.test(prog));
ok('progress page shows the class', /Class 11/.test(prog));

/* 5. survives a reload (the real persistence question) */
await page.reload({ waitUntil: 'domcontentloaded' });
await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
ok('profile survives reload', /Aarav/.test((await page.textContent('body')) || ''));

/* 6. "forget me" clears it, and progress falls back to guest wording */
await page.click('#p-clear');
await page.waitForTimeout(200);
const cleared = await page.evaluate(() => localStorage.getItem('physix-user'));
ok('forget me clears storage', cleared === null, String(cleared));
await page.goto(`${BASE}/#/progress`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
const guest = await page.textContent('body');
ok('progress falls back to guest', /guest/i.test(guest) && !/Aarav/.test(guest));

/* 7. corrupt storage must not throw — treated as signed out */
await page.evaluate(() => localStorage.setItem('physix-user', '{not json'));
await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
ok('corrupt profile degrades to the form', await page.isVisible('#p-form'));
ok('no uncaught page errors', errors.length === 0, errors.join(' | '));

/* 8. the disabled gate must still not redirect anyone */
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
ok('gate stays off: home is not redirected', !/login/.test(page.url()), page.url());

await browser.close();
const bad = results.filter(r => !r.pass);
console.log(`\nprofile flow  ${results.length - bad.length}/${results.length} ok`);
process.exit(bad.length ? 1 : 0);
