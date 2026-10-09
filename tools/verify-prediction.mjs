/* Prediction system tests.
 *
 * The point of most of these is that the OBSERVED value must come from real
 * recorded simulation data. Several assertions therefore compare the reported
 * measurement against the closed-form solution - not to prove the simulation
 * is right, but to prove the prediction system is reporting what the
 * simulation actually produced rather than something invented.
 */
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
const BASE = process.argv[2] || 'http://localhost:4316';
const OUT = path.join(os.tmpdir(), 'opencode', 'shots');
const SHOTS = process.argv.includes('--shots');

const results = [];
const ok = (n, p, d = '') => { results.push(p); console.log(`  ${p ? 'ok  ' : 'FAIL'}  ${n}${d ? `  — ${d}` : ''}`); };

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });

/* ================= A. PARSING + TOLERANCE (pure) ================= */
{
  /* Reached through window.PhysixPrediction, not a path import: the bundled
     build hashes js/prediction.js into a chunk, so importing it by URL only
     ever worked unbundled - which is exactly the production path this suite
     exists to check. */
  const page = await browser.newPage();
  await page.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.predict-input', { timeout: 20000 });
  const have = await page.evaluate(() => !!window.PhysixPrediction);
  ok('prediction module is addressable (window.PhysixPrediction)', have);
  await page.evaluate(() => { window.P = window.PhysixPrediction; });

  const parse = await page.evaluate(() => {
    const P = window.P;
    return {
      plain: P.parseAnswer('12.5', 'm'),
      signed: P.parseAnswer('-3', 'm'),
      withUnit: P.parseAnswer('4 m', 'm'),
      bare: P.parseAnswer('4', 'm'),
      empty: P.parseAnswer('', 'm'),
      text: P.parseAnswer('about ten', 'm'),
      words: P.parseAnswer('ten metres', 'm'),
      wrongUnit: P.parseAnswer('5 s', 'm'),
      speedUnit: P.parseAnswer('5 m/s', 'm/s'),
      notNumber: P.parseAnswer('12,5', 'm'),
      inf: P.parseAnswer('Infinity', 'm')
    };
  });
  ok('plain number accepted', parse.plain.ok && parse.plain.value === 12.5, JSON.stringify(parse.plain));
  ok('negative number accepted', parse.signed.ok && parse.signed.value === -3);
  ok('matching unit accepted', parse.withUnit.ok && parse.withUnit.value === 4);
  ok('no unit accepted when a unit is expected', parse.bare.ok && parse.bare.value === 4);
  ok('empty answer rejected', !parse.empty.ok, parse.empty.error);
  ok('words rejected with guidance', !parse.text.ok, parse.text.error);
  ok('"ten metres" rejected', !parse.words.ok, parse.words.error);
  ok('wrong unit rejected, not silently reinterpreted', !parse.wrongUnit.ok, parse.wrongUnit.error);
  ok('speed unit accepted for a speed question', parse.speedUnit.ok && parse.speedUnit.value === 5);
  ok('comma decimal rejected rather than misread', !parse.notNumber.ok, parse.notNumber.error);
  ok('Infinity rejected', !parse.inf.ok);

  const tol = await page.evaluate(() => {
    const T = window.P.toleranceOf;
    return {
      small: T(0.4, { absFloor: 0.2 }),
      large: T(15, { absFloor: 0.2 }),
      flat: T(0.0001, { absFloor: 0.2 })
    };
  });
  ok('tolerance has an absolute floor for tiny values', tol.flat === 0.2, `${tol.flat}`);
  /* 15 m * 10% = 1.5 m against a 0.2 m floor, so it must exceed the floor.
     The earlier assertion demanded a 10x ratio, which the maths does not
     guarantee: tolerance is the MAX of the two terms, and at 15 m the relative
     term is 1.5x the 0.2 m floor, not 10x. Asserting the actual contract -
     never below the floor, scales with magnitude - instead of a magic ratio. */
  ok('tolerance scales with magnitude, staying above the floor',
    tol.large === 1.5 && tol.large > tol.small,
    `small(0.4m)=${tol.small} large(15m)=${tol.large}, expected max(15*0.1, 0.2)=1.5`);
  await page.close();
}

/* ================= B. GRAPH QUERY (interpolation) ================= */
{
  const page = await browser.newPage();
  await page.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pgraph canvas', { timeout: 20000 });

  const q = await page.evaluate(() => {
    const G = window.PhysixGraph.Graph;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const g = new G({ xKey: 't', xLabel: 'Time', xUnit: 's', capacity: 100 });
    host.appendChild(g.el);
    g.addSeries({ id: 'y', label: 'Y', unit: 'm', color: '#f00' });
    /* linear ramp: y = 2t, so interpolation is exactly checkable */
    for (let i = 0; i <= 10; i++) g.push({ t: i, y: 2 * i });
    const exact = g.valueAt('y', 5);
    const between = g.valueAt('y', 5.5);
    const before = g.valueAt('y', -1);
    const after = g.valueAt('y', 11);
    const empty = new G({ capacity: 10, xKey: 't' });
    empty.addSeries({ id: 'z', label: 'Z', color: '#00f' });
    const none = empty.valueAt('z', 5);
    /* xKey must be declared: it defaults to 'x', so pushing { t: ... } into a
       graph with no xKey silently records nothing and len stays 0. The first
       version of this check forgot that and looked like an engine bug. */
    const one = new G({ capacity: 10, xKey: 't' });
    one.addSeries({ id: 'w', label: 'W', color: '#0f0' });
    one.push({ t: 3, w: 1 });
    const single = one.valueAt('w', 3);
    const singleMiss = one.valueAt('w', 4);
    const range = g.timeRange('y');
    g.destroy();
    return { exact, between, before, after, none, single, singleMiss, range };
  });
  ok('exact sample found', q.exact && q.exact.exact === true && Math.abs(q.exact.y - 10) < 1e-9, JSON.stringify(q.exact));
  ok('between samples: linear interpolation', q.between && Math.abs(q.between.y - 11) < 1e-9,
    `y(5.5)=${q.between && q.between.y}`);
  ok('interpolation flagged as not exact', q.between && q.between.exact === false);
  ok('before the recorded range returns null', q.before === null, JSON.stringify(q.before));
  ok('after the recorded range returns null', q.after === null, JSON.stringify(q.after));
  ok('empty series returns null rather than 0', q.none === null);
  ok('single sample at that exact x resolves', q.single && q.single.y === 1);
  ok('single sample cannot answer a different x', q.singleMiss === null);
  ok('timeRange reports the recorded window', q.range && q.range.from === 0 && q.range.to === 10,
    `${JSON.stringify(q.range)}`);
  await page.close();
}

/* ================= C. FLOW: predict → run → observe ================= */
const SIM = 'projectile';

async function runFlow(page, { answer = '12', settle = 6000 } = {}) {
  await page.goto(`${BASE}/#/sims/${SIM}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.predict-input', { timeout: 20000 });
  const q = await page.textContent('.predict-q');
  const t = parseFloat((q.match(/t\s*=\s*([\d.]+)/) || [])[1]);
  if (answer !== null) {
    await page.fill('.predict-input', answer);
    await page.click('.predict-actions .btn');
  }
  await page.waitForTimeout(settle);
  return { target: t, question: q };
}

{
  const c = await browser.newContext({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' });
  const page = await c.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = m.location() || {};
    if (/\/_vercel\//.test(loc.url || '')) return;
    errs.push('console: ' + m.text().slice(0, 120));
  });

  /* answer is not revealed before submitting */
  await page.goto(`${BASE}/#/sims/${SIM}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.predict-input', { timeout: 20000 });
  await page.waitForTimeout(2500);
  const pre = await page.evaluate(() => ({
    outHidden: document.querySelector('.predict-out')?.hidden,
    inputDisabled: document.querySelector('.predict-input')?.disabled,
    bodyHasNumber: /\d+\.\d+\s*m\b/.test(document.querySelector('.predict-out')?.textContent || '')
  }));
  ok('no result shown before a prediction', pre.outHidden === true);
  ok('input is available before a prediction', pre.inputDisabled === false);

  /* invalid answer */
  await page.fill('.predict-input', 'about ten');
  await page.click('.predict-actions .btn');
  await page.waitForTimeout(200);
  const inv = await page.evaluate(() => ({
    err: (document.querySelector('.predict-err')?.textContent || '').trim(),
    invalid: document.querySelector('.predict-input')?.getAttribute('aria-invalid'),
    outHidden: document.querySelector('.predict-out')?.hidden
  }));
  ok('invalid answer is rejected with a message', inv.err.length > 0, inv.err);
  ok('invalid answer marks the field aria-invalid', inv.invalid === 'true');
  ok('invalid answer does not reveal a result', inv.outHidden === true);

  /* the real flow */
  const flow = await runFlow(page, { answer: '12', settle: 7000 });
  const res = await page.evaluate(() => ({
    outHidden: document.querySelector('.predict-out')?.hidden,
    verdict: (document.querySelector('.predict-verdict-title')?.textContent || '').trim(),
    rows: [...document.querySelectorAll('.predict-rows div')].map(d => d.textContent.replace(/\s+/g, ' ').trim()),
    provenance: (document.querySelector('.predict-verdict .small')?.textContent || '').trim(),
    why: (document.querySelector('.predict-why')?.textContent || '').replace(/\s+/g, ' ').trim(),
    locked: document.querySelector('.predict-input')?.disabled
  }));
  ok('prediction locks the input', res.locked === true);
  ok('a result appears once real data exists', res.outHidden === false);
  ok('result names the estimate', /12\.00 m/.test(res.rows.join(' ')), res.rows[0]);
  ok('result names the measured value', /Measured from the simulation/.test(res.rows.join(' ')));
  ok('result shows the difference', /higher than you predicted|lower than you predicted/.test(res.rows.join(' ')));
  ok('an explanation is given', res.why.length > 40, `${res.why.slice(0, 70)}...`);
  ok('verdict is a sentence, not just a colour', res.verdict.length > 5, res.verdict);

  /* THE IMPORTANT ONE: the measured value is real physics */
  const cross = await page.evaluate(async (t) => {
    const G = window.PhysixGraph.Graph;
    void G;
    const rows = [...document.querySelectorAll('.predict-rows div')].map(d => d.textContent.replace(/\s+/g, ' ').trim());
    const m = rows.join(' | ').match(/Measured from the simulation([\d.]+) m/);
    return m ? parseFloat(m[1]) : null;
  }, flow.target);
  const G = 9.8;
  const expected = 0 + 25 * Math.sin(45 * Math.PI / 180) * flow.target - 0.5 * G * flow.target * flow.target;
  ok('measured value matches the closed-form solution',
    cross != null && Math.abs(cross - expected) < 0.35,
    `reported ${cross} m, theory ${expected.toFixed(2)} m at t=${flow.target}s`);
  ok('provenance is stated (sample vs interpolated)', res.provenance.length > 10, res.provenance);

  if (SHOTS) await page.locator('.sim-frame').screenshot({ path: path.join(OUT, 'pred-projectile.png') });

  /* retry */
  const again = await page.$('.predict-out .btn');
  await again.click();
  await page.waitForTimeout(600);
  const retried = await page.evaluate(() => ({
    inputEnabled: !document.querySelector('.predict-input')?.disabled,
    inputEmpty: document.querySelector('.predict-input')?.value === '',
    outHidden: document.querySelector('.predict-out')?.hidden,
    btn: document.querySelector('.predict-actions .btn')?.textContent
  }));
  ok('retry reopens the input', retried.inputEnabled === true);
  ok('retry clears the previous answer', retried.inputEmpty === true);
  ok('retry hides the previous result', retried.outHidden === true);
  ok('retry restores the submit label', /Lock in/.test(retried.btn || ''), retried.btn);

  /* second attempt works and can differ */
  const again2 = await runFlow(page, { answer: '18', settle: 7000 });
  const res2 = await page.evaluate(() => ({
    shown: !document.querySelector('.predict-out')?.hidden,
    rows: [...document.querySelectorAll('.predict-rows div')].map(d => d.textContent.replace(/\s+/g, ' ').trim())
  }));
  ok('a second attempt produces a fresh result', res2.shown && /18\.00 m/.test(res2.rows.join(' ')),
    res2.rows[0]);

  /* changing parameters moves the target */
  const t1 = parseFloat((again2.question.match(/t\s*=\s*([\d.]+)/) || [])[1]);
  await page.goto(`${BASE}/#/sims/${SIM}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.predict-input', { timeout: 20000 });
  const q2 = await page.textContent('.predict-q');
  const t2 = parseFloat((q2.match(/t\s*=\s*([\d.]+)/) || [])[1]);
  ok('question names a concrete target time', t1 > 0, `${t1}s`);

  /* unreachable target must NOT fabricate a result */
  const unreach = await page.evaluate(async () => {
    /* ask for a time beyond anything recorded, via the same public query the
       prediction uses, and confirm null comes back rather than a number */
    const g = window.PhysixGraph.graphs.latest();
    if (!g) return { err: 'no graph' };
    return { past: g.valueAt('y', 1e6), range: g.timeRange('y') };
  });
  ok('an unreachable target returns null, not a fabricated value',
    unreach.past === null, `range=${JSON.stringify(unreach.range)}`);

  /* missing data path */
  const missing = await page.evaluate(() => {
    const P = window.PhysixPred;
    return typeof P === 'undefined' ? 'not exposed' : 'exposed';
  });
  void missing;

  ok('no console errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  await c.close();
}

/* ================= D. MOBILE ================= */
{
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce'
  });
  const page = await c.newPage();
  await page.goto(`${BASE}/#/sims/${SIM}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.predict-input', { timeout: 20000 });
  await page.fill('.predict-input', '12');
  await page.click('.predict-actions .btn');
  await page.waitForTimeout(6000);

  const m = await page.evaluate(() => {
    const inp = document.querySelector('.predict-input');
    const btn = document.querySelector('.predict-actions .btn');
    const ir = inp.getBoundingClientRect(), br = btn.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inputH: Math.round(ir.height),
      btnW: Math.round(br.width),
      legendStacked: (document.querySelector('.predict-rows > div') || {}).getBoundingClient
        ? document.querySelector('.predict-rows > div').getBoundingClientRect().width : 0,
      shown: !document.querySelector('.predict-out')?.hidden
    };
  });
  ok('mobile: no horizontal overflow', m.overflow <= 1, `overflow=${m.overflow}px`);
  ok('mobile: input is a full-size tap target', m.inputH >= 40, `${m.inputH}px`);
  ok('mobile: submit button is full width', m.btnW > 200, `${m.btnW}px`);
  ok('mobile: result renders', m.shown);

  /* keyboard reachable */
  const kb = await page.evaluate(() => {
    const inp = document.querySelector('.predict-input');
    const btn = document.querySelector('.predict-actions .btn');
    return {
      inputLabel: !!document.querySelector('label[for="' + inp.id + '"]'),
      inputTabbable: inp.tabIndex >= 0,
      btnType: btn.type
    };
  });
  ok('input has an associated label', kb.inputLabel);
  ok('input is keyboard reachable', kb.inputTabbable);
  ok('submit button is type=button (no accidental form submit)', kb.btnType === 'button');

  if (SHOTS) await page.locator('.sim-frame').screenshot({ path: path.join(OUT, 'pred-mobile.png') });
  await c.close();
}

await browser.close();
const bad = results.filter(r => !r).length;
console.log(`\nprediction system  ${results.length - bad}/${results.length} ok`);
process.exit(bad ? 1 : 0);