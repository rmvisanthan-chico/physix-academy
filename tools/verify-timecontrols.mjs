/* PhysiX Academy — Phase 3C verification: Play / Pause / Step / Reset.
 *
 * These tests exist because the failure modes are subtle and invisible in a
 * screenshot. A duplicated rAF loop still looks perfect; it just makes the
 * simulation run twice as fast. A Step that double-integrates still looks
 * plausible. Only the numbers catch them.
 *
 * Run:  node tools/verify-timecontrols.mjs [baseUrl]
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Playwright is resolved the same way the existing suites resolve it: local
   node_modules first, then the global install. Same fallback, same reason. */
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();

const BASE = process.argv[2] || 'http://localhost:4173';
const results = [];
const ok = (n, c, extra) => results.push({ n, pass: !!c, extra });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
/* Vercel injects two analytics scripts that 404 outside Vercel. They are not part
   of this codebase and failing on them would make the suite unrunnable locally,
   so they are filtered rather than reported. */
const benign = t => /_vercel\/(insights|speed-insights)/.test(t);
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => {
  if (m.type() !== 'error') return;
  /* The console text for a failed request is the generic
     "Failed to load resource: ... 404" with no URL in it, so the URL has to come
     from the message location - filtering on the text alone does not work. */
  const url = (m.location() && m.location().url) || '';
  if (!benign(url) && !benign(m.text())) errors.push(`${m.text()} <${url}>`);
});

/* ---------- pure helpers, read straight from the source ---------- */
const src = (await import('node:fs')).readFileSync('js/sim-controls.js', 'utf8');
const pure = {
  fixedDt: /const FIXED_DT = 1 \/ 60;/.test(src),
  maxSub: /MAX_SUBSTEPS_PER_FRAME = 10/.test(src),
  hidden: /document\.hidden/.test(src),
  windowExport: /window\.PhysixTimeControls/.test(src),
  clearsAcc: /acc = 0/.test(src),
  noNewLoopInPlay: !/function play\(\)\s*\{\s*requestAnimationFrame/.test(src)
};
ok('module: FIXED_DT is exactly 1/60 s', pure.fixedDt);
ok('module: sub-steps per frame are capped', pure.maxSub);
ok('module: preserves the hidden-tab guard', pure.hidden);
ok('module: exposes window.PhysixTimeControls', pure.windowExport);
ok('module: pause/resume clears the accumulator', pure.clearsAcc);
ok('module: Play does NOT start a new rAF loop', pure.noNewLoopInPlay);

/* Play() must not call requestAnimationFrame - that is the duplicated-loop bug.
   frame() has two call sites (the hidden branch and the normal branch) plus one
   bootstrap at the bottom: three total, and none of them inside play(). */
ok('module: rAF appears only in the loop and its bootstrap',
  (src.match(/requestAnimationFrame\(/g) || []).length === 3,
  (src.match(/requestAnimationFrame\(/g) || []).length + ' call sites');
ok('module: play() contains no requestAnimationFrame',
  !/function play\(\)\s*\{[^}]*requestAnimationFrame/.test(src));

/* ---------- helper: open a simulation and return its control handles ---------- */
async function openSim(hash, waitFor = '.sim-time') {
  await page.goto(`${BASE}/#/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(waitFor, { timeout: 15000 });
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const bar = document.querySelector('.sim-time');
    const btns = [...bar.querySelectorAll('button')];
    const play = btns.find(b => /Play|Pause/.test(b.textContent));
    const step = btns.find(b => /Step/.test(b.textContent));
    const reset = btns.find(b => /Reset/i.test(b.textContent));
    return {
      labels: btns.map(b => b.textContent.trim()),
      playLabel: play.textContent.trim(),
      playAria: play.getAttribute('aria-label'),
      stepAria: step.getAttribute('aria-label'),
      state: bar.querySelector('.sim-time-state').textContent.trim(),
      clock: bar.querySelector('.sim-time-clock').textContent.trim(),
      roleStatus: bar.querySelector('.sim-time-state').getAttribute('role') === 'status',
      barCount: document.querySelectorAll('.sim-time').length
    };
  });
}

/* The probe reads the simulation's OWN state and the graph's OWN sample count,
   not a DOM shadow. A DOM assertion cannot tell "the loop stopped integrating"
   from "the canvas was not repainted", and those are different bugs. Each sim
   registers its probe at mount; a sim that forgets to would silently make every
   probe-based assertion below vacuous, so that is asserted too. */
const probe = () => page.evaluate(() => (window.__tcProbe ? window.__tcProbe() : null));

/* ---------------- Projectile Motion ---------------- */
{
  const h = await openSim('sims/projectile');
  ok('projectile: control bar present', h.barCount === 1, `count=${h.barCount}`);
  ok('projectile: Play/Pause toggle reads "Pause" while running', h.playLabel === '⏸ Pause', h.playLabel);
  ok('projectile: running state announced as text', /Running/.test(h.state), h.state);
  ok('projectile: state is a live region (role=status)', h.roleStatus);
  ok('projectile: clock shows t in seconds', /t = \d+\.\d\d s/.test(h.clock), h.clock);
  ok('projectile: Step has an explicit accessible name', /step/i.test(h.stepAria || ''), h.stepAria);
  ok('projectile: three controls (play/pause, step, reset)', h.labels.length === 3, h.labels.join(' | '));
}

/* Freeze test: read time, wait, read again. Paused time must not move. */
{
  await page.click('.sim-time-play');
  const s1 = await probe();
  await page.waitForTimeout(700);
  const s2 = await probe();
  ok('pause: freezes simulation time', s1 && s2 && s1.t === s2.t, `t ${s1?.t} -> ${s2?.t}`);
  ok('pause: freezes position', s1 && s2 && s1.y === s2.y, `y ${s1?.y} -> ${s2?.y}`);
  ok('pause: freezes velocity', s1 && s2 && s1.vy === s2.vy, `vy ${s1?.vy} -> ${s2?.vy}`);
  ok('pause: graph receives NO new samples', s1 && s2 && s1.samples === s2.samples,
    `samples ${s1?.samples} -> ${s2?.samples}`);
  ok('pause: UI shows paused, not just a colour',
    /Paused/.test(await page.textContent('.sim-time-state')));
}

/* Step test: one click = exactly one configured sub-step, exactly one sample.

   Asserted against advanceCalls, not elapsed time. Elapsed time is the weaker
   check and would pass a real bug: a double integration and an unusually slow
   frame produce the same t delta, so only a count of actual integration calls
   distinguishes them. The time delta is still asserted separately, because the
   count alone would not catch a wrong FIXED_DT. */
{
  const before = await probe();
  await page.click('.sim-time-step');
  const after = await probe();
  const dt = +(after.t - before.t).toFixed(6);
  ok('step: runs exactly ONE integration', after.calls === before.calls + 1,
    `calls ${before.calls} -> ${after.calls}`);
  ok('step: advances exactly 1/60 s', Math.abs(dt - 1 / 60) < 1e-6, `dt=${dt}`);
  ok('step: adds exactly ONE graph sample', after.samples === before.samples + 1,
    `${before.samples} -> ${after.samples}`);

  const b2 = await probe();
  await page.click('.sim-time-step');
  await page.click('.sim-time-step');
  const a2 = await probe();
  ok('step: two clicks run exactly two integrations',
    a2.calls === b2.calls + 2, `calls ${b2.calls} -> ${a2.calls}`);
  ok('step: two clicks advance exactly two steps',
    Math.abs((a2.t - b2.t) - 2 / 60) < 1e-6, `dt=${(a2.t - b2.t).toFixed(6)}`);
  ok('step: two clicks add exactly two samples',
    a2.samples === b2.samples + 2, `${b2.samples} -> ${a2.samples}`);
}

/* Coarser step sizes integrate as multiple FIXED_DT sub-steps, so the physics
   never sees a bigger step - only more of them. */
{
  await page.click('.sim-time-reset');
  const b = await probe();
  await page.selectOption('.sim-time-stepsize', { index: 1 });   /* 1/30 s */
  await page.click('.sim-time-step');
  const a = await probe();
  ok('step size 1/30: advances exactly 1/30 s',
    Math.abs((a.t - b.t) - 1 / 30) < 1e-6, `dt=${(a.t - b.t).toFixed(6)}`);
  ok('step size 1/30: integrated as TWO 1/60 sub-steps',
    a.calls === b.calls + 2, `calls ${b.calls} -> ${a.calls}`);
  ok('step size 1/30: adds exactly two samples',
    a.samples === b.samples + 2, `${b.samples} -> ${a.samples}`);
  await page.selectOption('.sim-time-stepsize', { index: 0 });   /* back to 1/60 */
}

/* Stepping while running must pause first, then step once - never integrate the
   same instant twice. */
{
  await page.click('.sim-time-reset');
  await page.click('.sim-time-play');           /* ensure running */
  await page.waitForTimeout(120);

  /* The click and both counter reads happen inside ONE JS turn.
     Playwright's page.click() involves a mouse move and a delay, during which
     rAF frames legitimately integrate - an earlier version of this test counted
     3 calls for one click and looked like a double-integrate when it was really
     just two loop frames landing during the click. Dispatching the click and
     reading the counter synchronously removes that window entirely: a rAF
     callback cannot interleave with a running JS turn. */
  const r = await page.evaluate(() => {
    const before = window.__tcProbe().calls;
    document.querySelector('.sim-time-step').click();
    const after = window.__tcProbe().calls;
    return { before, after, paused: window.__tcProbe().paused,
             state: document.querySelector('.sim-time-state').textContent };
  });
  ok('step while running: pauses first', /Paused/.test(r.state), r.state);
  /* Exactly one call, no more. This is the assertion that actually matters: a
     loop frame firing between the pause and the step would show as +2 here, and
     the resulting teleport would be invisible in a screenshot. */
  ok('step while running: exactly ONE integration, no double-integrate',
    r.after === r.before + 1, `calls ${r.before} -> ${r.after}`);

  /* And the loop must genuinely stop afterwards, not keep integrating in the
     background while claiming to be paused. */
  const p1 = await probe();
  await page.waitForTimeout(400);
  const p2 = await probe();
  ok('step while running: loop actually stops after the step',
    p2.calls === p1.calls, `calls held at ${p2.calls}`);
}

/* Resume must not time-jump.

   Probed IMMEDIATELY after resuming. An earlier version of this test waited
   100ms first and then asserted the advance was under one frame - which failed
   at 0.1s, correctly: 100ms of running legitimately advances 100ms. The test was
   wrong, not the code. The real risk being guarded against is the paused
   duration (900ms) being handed over as a single catch-up step, so that is the
   bound that matters. */
{
  await page.click('.sim-time-reset');
  await page.click('.sim-time-play');
  await page.waitForTimeout(300);
  await page.click('.sim-time-play');           /* pause */
  const pausedAt = await probe();
  await page.waitForTimeout(900);              /* sit paused a while */
  const stillPaused = await probe();
  ok('resume: paused sim really was frozen for 900ms',
    Math.abs(stillPaused.t - pausedAt.t) < 1e-9, `${pausedAt.t} -> ${stillPaused.t}`);
  await page.click('.sim-time-play');           /* resume */
  const resumed = await probe();
  const jump = resumed.t - stillPaused.t;
  ok('resume: does NOT jump by the paused duration', jump < 0.1,
    `jumped ${jump.toFixed(4)}s after 900ms paused`);
  ok('resume: time does move forward once playing',
    (await (async () => { await page.waitForTimeout(120); return probe(); })()).t > resumed.t,
    `${resumed.t} then advances`);
}

/* Reset restores initial conditions and clears history. */
{
  await page.waitForTimeout(400);
  /* Pause first. Reset deliberately preserves the play/pause state, so if the sim
     were left running a rAF frame could land between the click and the read and
     t would legitimately be 1/60 rather than 0. Pausing first makes this assert
     the reset itself rather than a race with the loop. */
  await page.click('.sim-time-play');
  const before = await probe();
  ok('reset precondition: sim was mid-flight', before.t > 0.1 && before.samples > 5,
    `t=${before.t} samples=${before.samples}`);
  await page.click('.sim-time-reset');
  const after = await probe();
  ok('reset: restores t = 0', Math.abs(after.t) < 1e-9, `t=${after.t}`);
  ok('reset: restores initial launch conditions', Math.abs(after.y - after.y0) < 1e-9,
    `y=${after.y} y0=${after.y0}`);
  ok('reset: clears graph history', after.samples <= 1,
    `samples=${after.samples}`);
  ok('reset: initial sample represents real initial state',
    after.samples <= 1 && Math.abs(after.y - after.y0) < 1e-9);
  /* Reset preserves the pause state on purpose: a student who paused and stepped
     to an interesting moment, then hits Reset, wants to stay paused at t = 0 so
     they can step forward again - not be launched. */
  ok('reset: preserves the paused state', after.paused === true,
    `paused=${after.paused}`);
  await page.click('.sim-time-play');
  await page.waitForTimeout(150);
  ok('reset: resumes normally afterwards', (await probe()).t > 0.01);
}

/* Repeated Play must not duplicate the loop. Run for a known wall time and
   check the simulated time advanced by roughly that much, once. */
{
  await page.click('.sim-time-reset');
  for (let i = 0; i < 6; i++) await page.click('.sim-time-play');   /* spam it */
  const a = await probe();
  await page.waitForTimeout(1000);
  const b = await probe();
  const advanced = b.t - a.t;
  /* One loop for ~1s of wall clock. Two loops would integrate ~2s. */
  ok('play spam: 6 clicks still produce ONE loop', advanced > 0.6 && advanced < 1.5,
    `1s of wall clock advanced ${advanced.toFixed(3)}s of sim time`);
}

/* Keyboard parity. */
{
  await page.click('.sim-time-reset');
  await page.click('.sim-time-play');       /* pause */
  await page.focus('.sim-time-step');
  const b = await probe();
  await page.keyboard.press('ArrowRight');
  const a = await probe();
  ok('keyboard: ArrowRight steps once',
    Math.abs((a.t - b.t) - 1 / 60) < 1e-6, `dt=${(a.t - b.t).toFixed(6)}`);
  await page.keyboard.press(' ');
  ok('keyboard: Space resumes', /Running/.test(await page.textContent('.sim-time-state')));
}

/* Hidden tab must not advance the sim, and must not cause a jump on return.

   Same correction as the resume test above: probe on return immediately, because
   waiting before probing measures how long we waited, not whether a jump
   happened. */
{
  await page.click('.sim-time-reset');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const a = await probe();
  await page.waitForTimeout(600);
  const b = await probe();
  ok('hidden tab: simulation does not advance', Math.abs(b.t - a.t) < 1e-9,
    `t ${a.t} -> ${b.t}`);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const c = await probe();
  ok('hidden tab: no time jump on return', (c.t - b.t) < 0.1,
    `jumped ${(c.t - b.t).toFixed(4)}s on return (600ms was hidden)`);
  await page.waitForTimeout(120);
  ok('hidden tab: resumes advancing after return', (await probe()).t > c.t);
}

/* Prediction still works, and stepping can reach the target. */
{
  await page.click('.sim-time-reset');
  const q = await page.textContent('.predict-q').catch(() => '');
  ok('prediction: question still rendered', q.trim().length > 5, q.trim().slice(0, 70));
  const input = await page.$('.predict-input');
  if (input) {
    await input.fill('12');
    await page.click('.sim-time-step');       /* step while paused */
    await page.click('.sim-time-play');       /* resume the run */
    await page.waitForTimeout(2500);
    const done = await page.$('.predict-out');
    ok('prediction: reveal still fires after resuming', !!done);
  } else {
    ok('prediction: reveal still fires after resuming', false, '.predict-input not found');
  }
}

/* ---------------- SHM + Kinematics 1D ---------------- */
for (const [name, hash] of [['shm', 'sims/shm'], ['kin1d', 'sims/kin1d']]) {
  const h = await openSim(hash);
  if (!h) {
    ok(`${name}: control bar present`, false, `route #/${hash} did not mount a control bar`);
    continue;
  }
  ok(`${name}: control bar present`, h.barCount === 1, `count=${h.barCount}`);
  await page.click('.sim-time-play');
  const s1 = await probe();
  await page.waitForTimeout(500);
  const s2 = await probe();
  ok(`${name}: pause freezes time`, s1 && s2 && s1.t === s2.t, `t ${s1?.t} -> ${s2?.t}`);
  ok(`${name}: pause stops graph sampling`, s1 && s2 && s1.samples === s2.samples,
    `${s1?.samples} -> ${s2?.samples}`);
  const b = await probe();
  await page.click('.sim-time-step');
  const a = await probe();
  ok(`${name}: step advances one sub-step`, Math.abs((a.t - b.t) - 1 / 60) < 1e-6,
    `dt=${(a.t - b.t).toFixed(6)}`);
  ok(`${name}: step adds exactly one sample`, a.samples === b.samples + 1,
    `${b.samples} -> ${a.samples}`);
  await page.click('.sim-time-reset');
  const r = await probe();
  ok(`${name}: reset restores t = 0`, Math.abs(r.t) < 1e-9, `t=${r.t}`);
}

/* ---------------- lifecycle: unmount / remount ---------------- */
/* Canvas count must exclude the graph's own canvas: the projectile frame has
   two canvases by design - the simulation viewport and the graph plot. Counting
   all of them and expecting 1 fails on a correct page. */
{
  await openSim('sims/projectile');
  const first = await page.evaluate(() => ({
    simCanvas: document.querySelectorAll('.sim-canvas-wrap canvas').length,
    graphs: document.querySelectorAll('.pgraph').length
  }));
  await page.goto(`${BASE}/#/sims/waves`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const gone = await page.evaluate(() => ({
    simCanvas: document.querySelectorAll('.sim-canvas-wrap canvas').length,
    bars: document.querySelectorAll('.sim-time').length,
    graphs: document.querySelectorAll('.pgraph').length
  }));
  ok('lifecycle: no canvas left behind after navigating away', gone.simCanvas === 0,
    `canvases=${gone.simCanvas}`);
  ok('lifecycle: no control bar left behind', gone.bars === 0, `bars=${gone.bars}`);
  ok('lifecycle: no graph left behind', gone.graphs === 0, `graphs=${gone.graphs}`);

  await openSim('sims/projectile');
  const second = await page.evaluate(() => ({
    simCanvas: document.querySelectorAll('.sim-canvas-wrap canvas').length,
    bars: document.querySelectorAll('.sim-time').length,
    graphs: document.querySelectorAll('.pgraph').length
  }));
  ok('lifecycle: remount creates exactly ONE simulation canvas', second.simCanvas === 1,
    `canvases=${second.simCanvas} (first mount ${first.simCanvas})`);
  ok('lifecycle: remount creates exactly ONE control bar', second.bars === 1,
    `bars=${second.bars}`);
  ok('lifecycle: remount creates exactly ONE graph', second.graphs === 1,
    `graphs=${second.graphs}`);

  /* If a stale loop survived, the sim would run at double rate after remount. */
  const a = await probe();
  await page.waitForTimeout(1000);
  const b = await probe();
  const adv = b.t - a.t;
  ok('lifecycle: remount has ONE loop (no duplicate rate)', adv > 0.6 && adv < 1.5,
    `1s wall -> ${adv.toFixed(3)}s sim`);
}

/* ---------------- 390px mobile ---------------- */
{
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'domcontentloaded' });
  await m.waitForSelector('.sim-time', { timeout: 15000 });
  await m.waitForTimeout(400);
  const r = await m.evaluate(() => {
    const doc = document.documentElement;
    const bar = document.querySelector('.sim-time');
    const btns = [...bar.querySelectorAll('button')];
    const small = btns.filter(b => {
      const r = b.getBoundingClientRect();
      return r.height < 40 || r.width < 40;
    }).map(b => b.textContent.trim() + ` ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`);
    const gr = document.querySelector('.pgraph').getBoundingClientRect();
    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      small,
      barBottom: bar.getBoundingClientRect().bottom,
      graphTop: gr.top,
      selH: bar.querySelector('select').getBoundingClientRect().height
    };
  });
  ok('mobile 390px: no horizontal overflow', r.overflowX <= 0, `overflow=${r.overflowX}px`);
  ok('mobile 390px: all buttons are >= 40px touch targets', r.small.length === 0,
    r.small.join(', ') || 'all ok');
  ok('mobile 390px: step-size select is >= 40px', r.selH >= 40, `${Math.round(r.selH)}px`);
  ok('mobile 390px: controls do not overlap the graph', r.barBottom <= r.graphTop + 1,
    `bar ends ${Math.round(r.barBottom)}, graph starts ${Math.round(r.graphTop)}`);
  await m.screenshot({ path: 'tools/.shots/tc-mobile.png' });
  await m.close();
}

await page.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.sim-time');
await page.waitForTimeout(500);
await page.click('.sim-time-play');
await page.waitForTimeout(200);
await page.screenshot({ path: 'tools/.shots/tc-desktop-paused.png' });

ok('no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();

const pass = results.filter(r => r.pass).length;
for (const r of results) {
  if (!r.pass) console.log(`  FAIL  ${r.n}${r.extra ? '  [' + r.extra + ']' : ''}`);
}
console.log(`\ntime controls  ${pass}/${results.length} ok`);
process.exit(pass === results.length ? 0 : 1);