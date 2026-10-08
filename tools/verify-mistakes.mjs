/* Exercises the mistake notebook and the mastery engine against real stored
   data: drive actual wrong answers through the real quiz UI, then assert the
   notebook shows them, groups them, explains them, and can retry in place. */
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
const BASE = process.argv[2] || 'http://localhost:4211';
const OUT = path.join(os.tmpdir(), 'opencode', 'shots');
const SHOTS = process.argv.includes('--shots');

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };

const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const page = await c.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));

/* ---------- empty state ---------- */
await page.goto(`${BASE}/#/mistakes`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { localStorage.clear(); });
await page.reload({ waitUntil: 'networkidle' });
await page.goto(`${BASE}/#/mistakes`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
let txt = await page.textContent('body');
ok('empty notebook explains itself', /no mistakes yet/i.test(txt));
ok('empty notebook offers a way forward', /practice/i.test(txt));

/* ---------- seed a realistic history, through the app's own Store ---------- */
/* Seeded AFTER boot, on the live Store object, so it goes through recordAnswer
   and Store.save() exactly as a real answer would. Writing raw persisted JSON
   does not work here: the module-scoped Store instance was already built at
   boot, so replacing storage underneath it has no effect on what renders. */
await page.waitForTimeout(600);
const seeded = await page.evaluate(async () => {
  const KEY = 'physix.v1';
  const { QUIZ_BANK } = await import('/js/data-quiz-a.js');
  await import('/js/data-quiz-b.js');
  await import('/js/data-quiz-c.js');
  const { Store } = await import('/js/utils.js');

  const byId = {};
  QUIZ_BANK.forEach(q => { byId[q.id] = q; });

  /* Pick real questions across four topics, so every card can resolve and be
     retried. Includes one repeated miss, to prove repeats collapse. */
  const wanted = ['q-v1', 'q-v2', 'q-f1', 'q-e1', 'q-so1', 'q-ch1'];
  let n = 0;
  for (const id of wanted) {
    const q = byId[id];
    if (!q) continue;
    Store.recordAnswer(q, false, (q.answer + 1) % q.choices.length);
    n++;
  }
  /* q-v1 missed twice in a row, so it must collapse into one card showing 2x.
     This comes BEFORE the repeat below so the most recent entry is the miss. */
  const rep = byId['q-v1'];
  Store.recordAnswer(rep, false, (rep.answer + 1) % rep.choices.length);
  /* and one correct answer, which must not appear in the notebook */
  const okQ = byId['q-v3'];
  if (okQ) Store.recordAnswer(okQ, true, okQ.answer);

  await Store.flush();
  const mn = Store.mistakes({});
  return {
    n: n + 2,
    histLen: Store.data.quiz.history.length,
    mn: mn.length,
    times: mn.map(m => `${m.qid}:${m.times}`).join(' ')
  };
});
ok('seeded via the real Store', seeded.histLen === 8, `${seeded.n} answered, history=${seeded.histLen}, mistakes=${seeded.mn}`);
ok('a repeat collapses in the data layer', /q-v1:2/.test(seeded.times), seeded.times);

await page.reload({ waitUntil: 'networkidle' });
await page.goto(`${BASE}/#/mistakes`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);
txt = await page.textContent('body');

ok('missed questions are listed', /Your Physics Mistakes/i.test(txt));
ok('correct answers are excluded', !/Not quite/.test(txt));
ok('repeats collapse to one card with a count', /missed 2×/.test(txt),
  (txt.match(/missed \d+×/g) || ['none']).join(', '));
ok('it shows what you picked', /You picked/.test(txt));
ok('it shows the correct answer', /Correct answer/.test(txt));
ok('explanations are available', /Why/.test(txt));

const cards = await page.evaluate(() => document.querySelectorAll('.mistake-card').length);
ok('six distinct mistakes rendered (the repeat collapsed)', cards === 6, `cards=${cards}`);
const topics = await page.evaluate(() =>
  [...document.querySelectorAll('.sec-title h2')].map(e => e.textContent.trim()));
ok('grouped by topic', topics.length === 5, topics.join(' / '));
ok('questions from data-quiz-b/c resolve too',
  !/older version of the question bank/.test(txt), 'b/c ids found');
ok('cards state what is needed to clear',
  /in a row to clear/.test(txt), 'streak note shown');

/* ---------- retry, and the two-correct rule ---------- */
const target = await page.evaluate(async () => {
  const { QUIZ_BANK } = await import('/js/data-quiz-a.js');
  await import('/js/data-quiz-b.js');
  await import('/js/data-quiz-c.js');
  const byId = {}; QUIZ_BANK.forEach(q => { byId[q.id] = q; });
  const card = document.querySelector('.mistake-card');
  return { qid: card.dataset.qid, answer: byId[card.dataset.qid].answer };
});
ok('retry target resolved from the real bank', !!target, target.qid);

await page.click(`.mistake-card[data-qid="${target.qid}"] [data-retry]`);
await page.waitForTimeout(900);
const inline = await page.evaluate(() => {
  const s = document.querySelector('.retry-slot');
  return { opts: s.querySelectorAll('.opt').length };
});
ok('retry renders the real question inline', inline.opts >= 2, `${inline.opts} options`);

await page.evaluate((idx) => {
  [...document.querySelectorAll('.retry-slot .opt')][idx].click();
}, target.answer);
await page.waitForTimeout(1200);
let after = await page.evaluate(() => ({
  still: !!document.querySelector(`.mistake-card[data-qid="${window.__qid}"]`),
  note: (document.querySelector('.mistake-streak:last-of-type')?.textContent || '').trim(),
  qids: [...document.querySelectorAll('.mistake-card')].map(c => c.dataset.qid)
}));
ok('one correct answer does NOT clear it (a guess is not a fix)',
  after.qids.includes(target.qid), `still listed; note="${after.note.slice(0, 60)}"`);

/* second correct in a row -> clears */
const second = await page.evaluate(async (qid) => {
  const { QUIZ_BANK } = await import('/js/data-quiz-a.js');
  await import('/js/data-quiz-b.js'); await import('/js/data-quiz-c.js');
  const { Store } = await import('/js/utils.js');
  const q = QUIZ_BANK.find(x => x.id === qid);
  Store.recordAnswer(q, true, q.answer);
  await Store.flush();
  return { cleared: Store.clearedSinceMiss(qid), need: Store.CLEAN_STREAK };
}, target.qid);
ok('two correct in a row clears it', second.cleared, `streak requirement=${second.need}`);

await page.goto(`${BASE}/#/mistakes`, { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'networkidle' });
await page.goto(`${BASE}/#/mistakes`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1300);
after = await page.evaluate((qid) =>
  [...document.querySelectorAll('.mistake-card')].map(c => c.dataset.qid), target.qid);
ok('a cleared mistake leaves the notebook', !after.includes(target.qid), `cards=${after.length}`);

if (SHOTS) await page.screenshot({ path: path.join(OUT, 'mistakes.png'), fullPage: true });
ok('no uncaught page errors', errs.length === 0, errs.slice(0, 2).join(' | '));

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nmistake notebook  ${results.length - bad}/${results.length} ok`);
process.exit(bad ? 1 : 0);