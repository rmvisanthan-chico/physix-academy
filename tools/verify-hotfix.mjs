/* Phase 4A hotfix verification — assessment flow + about route + regression sweep.
 *
 *   node tools/verify-hotfix.mjs [baseUrl]
 *
 * Drives the real app in a real browser (system Chrome locally; CI sets
 * PW_CHANNEL=chromium) and asserts the behaviours the hotfix repairs:
 *   - #/assessment renders the topic grid (topics wired from the quiz bank)
 *   - #/assessment/<topic> offers 5/10/20-question starts
 *   - a full 5-question adaptive session runs: question UI, answer, submit,
 *     adaptive theta readout, completion into the results view
 *   - #/assessment/results/<id> reaches the same results view via URL
 *   - #/about renders (was swallowed by a missing brace in views.js)
 *   - no console/page errors on the core routes (regression sweep)
 *
 * Exits non-zero on any failure, so it can gate CI.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:4188';
const CHANNEL = process.env.PW_CHANNEL || 'chrome';

const results = [];
const add = (name, pass, evidence) => {
  results.push({ name, pass: !!pass, evidence: evidence || '' });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : `  — ${evidence}`}`);
};

/* External-resource refusals (CSP, offline) are a policy condition, not a
   page defect — same separation the simulation audit uses. */
const isNoise = (t) =>
  /Content Security Policy|violates the following/i.test(t) ||
  /Refused to connect because it violates/i.test(t) ||
  /cdn\.jsdelivr\.net/i.test(t) ||
  /net::ERR_/i.test(t) ||
  /_vercel\//i.test(t);

async function main() {
  const browser = await chromium.launch({ channel: CHANNEL });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  /* Track 404 response URLs so a "Failed to load resource ... 404" console
     line can be attributed to its resource. On a local static server the
     Vercel analytics beacons (/_vercel/insights, /_vercel/speed-insights) 404;
     that is an environment artifact, not an app defect, and it loads fine on
     real Vercel. */
  let last404 = '';
  page.on('response', (r) => {
    if (r.status() === 404) last404 = r.url();
  });
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 160)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource/i.test(t) && /404/i.test(t) && /_vercel\//.test(last404)) return;
    errs.push('console: ' + t.slice(0, 160));
  });
  const realErrs = () => errs.filter((e) => !isNoise(e));

  const go = async (hash) => {
    await page.evaluate((h) => {
      location.hash = h;
    }, hash);
    await page.waitForTimeout(400);
  };

  /* ---------- 1. home ---------- */
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#main .wrap', { timeout: 10000 });
  add('home renders', true);

  /* ---------- 2. assessment topic grid ---------- */
  await go('#/assessment');
  const heading = await page.$eval('.page-head h1', (el) => el.textContent).catch(() => '');
  const topicCards = await page.$$('.topic-card');
  const topics = await page
    .$eval('.topic-card', (a) => a.getAttribute('href').replace('#/assessment/', ''))
    .catch(() => '');
  add(
    'assessment topic grid renders',
    /Adaptive Assessment/.test(heading) && topicCards.length >= 5,
    `heading="${heading.trim()}" cards=${topicCards.length} first=${topics}`
  );
  const real = realErrs();
  add('assessment view has no console errors', real.length === 0, real.slice(0, 3).join(' ; '));

  /* ---------- 3. topic setup ---------- */
  const topic = topics || 'kinematics';
  await go(`#/assessment/${topic}`);
  const hasStart5 = !!(await page.$('#start-assess-5'));
  const hasStart10 = !!(await page.$('#start-assess-10'));
  const hasStart20 = !!(await page.$('#start-assess-20'));
  add(
    `assessment setup for topic "${topic}"`,
    hasStart5 && hasStart10 && hasStart20,
    `start5=${hasStart5} start10=${hasStart10} start20=${hasStart20}`
  );

  /* ---------- 4. run a 5-question session ---------- */
  await page.click('#start-assess-5');
  await page.waitForSelector('#assess-q .quiz-q', { timeout: 10000 });
  const q1Head = await page.$eval('.sec-title h2', (el) => el.textContent).catch(() => '');
  add('question 1 UI renders', /Question 1 of/.test(q1Head), q1Head);

  let completed = false;
  let loopErr = '';
  for (let i = 0; i < 5; i++) {
    const opts = await page.$$('.opts .opt');
    if (!opts.length) break;
    const qText = await page.$eval('.q-text', (el) => el.innerText.slice(0, 100)).catch(() => '?');
    errs.length = 0;
    await opts[0].click();
    try {
      await page.waitForFunction(
        () => {
          const b = document.querySelector('#assess-submit');
          return b && !b.disabled;
        },
        null,
        { timeout: 5000 }
      );
    } catch {
      loopErr = `q="${qText.replace(/\n/g, ' ')}" errs=${realErrs().slice(0, 2).join(' || ')}`;
      break;
    }
    await page.click('#assess-submit');
    await page.waitForTimeout(300);
    const done = await page.$eval('.page-head h1', (el) => el.textContent).catch(() => '');
    if (/Assessment Results/.test(done)) {
      completed = true;
      break;
    }
  }
  const thetaShown = await page.$eval('.assess-theta', (el) => el.textContent).catch(() => 'n/a');
  add(
    '5-question session completes to results',
    completed,
    `theta-readout="${thetaShown}"${loopErr ? ' | ' + loopErr : ''}`
  );

  /* ---------- 5. results via URL ---------- */
  const sid = await page.evaluate(async () => {
    const { Store } = await import('/js/utils.js');
    const s = (Store.data.assessment && Store.data.assessment.sessions) || [];
    return s.length ? s[s.length - 1].id : null;
  });
  add('session persisted with id', !!sid, `id=${sid}`);
  if (sid) {
    await page.goto(`${BASE}/#/assessment/results/${sid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const rHead = await page.$eval('.page-head h1', (el) => el.textContent).catch(() => '');
    const rBody = await page.$eval('#main', (el) => el.innerText.slice(0, 400)).catch(() => '');
    add(
      'results reachable via #/assessment/results/<id>',
      /Assessment Results/.test(rHead),
      `heading="${rHead.trim()}"`
    );
    add(
      'results show score + ability',
      /%/.test(rBody) && /θ|ability/i.test(rBody),
      rBody.replace(/\s+/g, ' ').slice(0, 160)
    );
  }

  /* ---------- 6. about ---------- */
  await go('#/about');
  const aboutHead = await page.$eval('.page-head h1', (el) => el.textContent).catch(() => '');
  add('#/about renders', /About PhysiX Academy/.test(aboutHead), `heading="${aboutHead}"`);

  /* ---------- 7. regression sweep ---------- */
  const sweep = [
    '#/learn',
    '#/dashboard',
    '#/path',
    '#/achievements',
    '#/mistakes',
    '#/progress',
    '#/sims',
    '#/topics'
  ];
  errs.length = 0;
  for (const h of sweep) {
    await go(h);
    const wrap = !!(await page.$('#main .wrap, #main .grid, #main .sec, #main .sim-slot'));
    if (!wrap) add(`sweep ${h} renders`, false, 'no main content after 400ms');
  }
  const sweepErrs = realErrs();
  add(
    'sweep routes render + no console errors',
    sweepErrs.length === 0,
    sweepErrs.slice(0, 3).join(' ; ')
  );

  /* ---------- 8. known pre-existing #/graph bug (documented, not fixed) ---------- */
  errs.length = 0;
  await go('#/graph');
  await page.waitForTimeout(300);
  const graphErr = realErrs().length > 0;
  add(
    '#/graph pre-existing crash still present (documented, out of scope)',
    graphErr,
    graphErr ? realErrs()[0] : 'no error seen'
  );

  await browser.close();

  const failed = results.filter((r) => !r.pass).length;
  console.log(
    `\n===== SUMMARY =====\npassed: ${results.length - failed}\nfailed: ${failed}\ntotal:  ${results.length}`
  );
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
