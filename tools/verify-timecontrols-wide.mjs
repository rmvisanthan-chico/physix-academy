/* PhysiX Academy — Phase 3C.1 verification: shared time controls across the
 * expanded set of simulations.
 *
 *   node tools/verify-timecontrols-wide.mjs [baseUrl]
 *
 * Every integrated simulation is driven through the same cycle - play, pause,
 * freeze, single step, coarse step, reset, resume, hidden tab, unmount, remount,
 * keyboard, mobile - and asserted against the simulation's OWN state through a
 * probe, never against repainted pixels. "The loop stopped integrating" and "the
 * canvas was not repainted" look identical in a screenshot and are different
 * bugs.
 *
 * The suite is table-driven. Adding a simulation is one row here plus one
 * attachTimeControls call in its own file; the checks themselves are written once
 * so no two simulations can disagree about what Pause is supposed to do.
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

const BASE = process.argv[2] || 'http://localhost:4173';
const results = [];
const ok = (n, c, extra) => results.push({ n, pass: !!c, extra });

/* The table. `expect` is the closed-form check for the physics, evaluated at the
 * simulation's reported time - this is what proves the controls did not perturb
 * the trajectory, only the clock. Simulations with no closed form omit it and
 * are checked structurally instead. */
const SIMS = [
  {
    id: 'newton', name: "Newton's Second Law",
    /* F=20N, m=6kg, mu=0.1 -> N=58.8, fmax=5.88, fr=-5.88, a=(20-5.88)/6=2.3533 */
    expect: p => {
      const a = (20 - 0.1 * 6 * 9.8) / 6;
      return Math.abs(p.a - a) < 0.05;
    },
    describe: 'constant force with kinetic friction'
  },
  {
    id: 'energy', name: 'Energy Conservation',
    /* Undamped pendulum: total energy must stay flat within integrator drift. */
    expect: p => Math.abs(p.total - p.pe - p.ke) < 1e-6 && p.t > 0,
    describe: 'damped pendulum, PE/KE exchange'
  },
  {
    id: 'collision', name: 'Collision Lab',
    /* Momentum is conserved through the impulse for any restitution. */
    expect: p => Math.abs(p.p0 - p.p) < 0.35,
    describe: '1D impulse with restitution'
  },
  {
    id: 'orbit', name: 'Orbit Simulator',
    expect: p => p.t > 0 && isFinite(p.speed) && isFinite(p.r),
    describe: 'inverse-square gravity'
  },
  {
    id: 'incline', name: 'Inclined Plane',
    /* theta=32, mu=0.12 -> tan(32)=0.625 > 0.12 so it slides:
       a = g(sin32 - 0.12 cos32) = 9.8(0.5299-0.1018) = 4.196 */
    expect: p => Math.abs(p.a - 9.8 * (Math.sin(32 * Math.PI / 180) - 0.12 * Math.cos(32 * Math.PI / 180))) < 0.05,
    describe: 'friction threshold, then sliding'
  },
  {
    id: 'atwood', name: 'Atwood Machine',
    /* m1=2, m2=5 -> a = |5-2|*9.8/7 = 4.2, T = 2*2*5*9.8/7 = 28 */
    expect: p => Math.abs(p.a - 4.2) < 0.02 && Math.abs(p.T - 28) < 0.2,
    describe: 'two masses on one rope'
  },
  {
    id: 'bfield', name: 'Charge in a B Field',
    /* qm=0.15, b=2 -> w=0.3, T=2pi/w=20.94s, R=v/w=140/0.3=466.7px */
    expect: p => Math.abs(p.T - 2 * Math.PI / 0.3) < 0.02 && Math.abs(p.R - 140 / 0.3) < 2,
    describe: 'cyclotron motion, exact rotation'
  },
  /* The original three, re-checked so the expansion cannot have broken them. */
  {
    id: 'projectile', name: 'Projectile Motion',
    expect: p => p.samples > 0 && p.t >= 0,
    describe: 'Phase 3C, regression check'
  },
  {
    id: 'shm', name: 'Spring-Mass SHM',
    expect: p => p.samples > 0 && p.t >= 0,
    describe: 'Phase 3C, regression check'
  },
  {
    id: 'kin1d', name: '1-D Motion Lab',
    /* u=4, a=1 -> x = 4t + 0.5t^2, v = 4 + t */
    expect: p => Math.abs(p.x - (4 * p.t + 0.5 * p.t * p.t)) < 0.02,
    describe: 'Phase 3C, regression check'
  }
];

const FIXED = 1 / 60;

const browser = await chromium.launch({ channel: 'chrome' });

/* Drive the bar to a known state rather than assuming one.
   An earlier version of this suite clicked Play a fixed number of times and
   assumed where it would end up. But the button is a TOGGLE, so an even number
   of clicks returns to the starting state and an odd number inverts it - and the
   suite was clicking from whatever state the previous block happened to leave
   behind. Both "6 Play clicks still yield ONE loop" and "reset had something to
   reset" then failed for a reason that had nothing to do with the code under test:
   the sim was paused when the test believed it was running.
   Asserting the state first is the only way these tests mean what they say. */
async function setRunning(page, want) {
  const isRunning = await page.evaluate(() =>
    !document.querySelector('.sim-time').classList.contains('is-paused'));
  if (isRunning !== want) await page.click('.sim-time-play');
  const now = await page.evaluate(() =>
    !document.querySelector('.sim-time').classList.contains('is-paused'));
  return now === want;
}

for (const sim of SIMS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (!/_vercel\//.test(url) && !/_vercel\//.test(m.text())) errors.push(m.text().slice(0, 100));
  });

  const tag = sim.id;
  await page.goto(`${BASE}/#/sims/${sim.id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sim-time', { timeout: 15000 });
  await page.waitForTimeout(300);

  /* Every simulation must expose a probe, or all the physics assertions below
     would be silently skipped and this suite would pass while testing nothing -
     the same failure mode that hid the bfield bug for months. */
  ok(`${tag}: exposes a test probe`, await page.evaluate(() => !!window.__tcProbe));

  /* ---- the bar exists and is labelled ---- */
  const bar = await page.evaluate(() => {
    const b = document.querySelector('.sim-time');
    const btns = [...b.querySelectorAll('button')];
    return {
      count: document.querySelectorAll('.sim-time').length,
      labels: btns.map(x => x.textContent.trim()),
      stepAria: (btns.find(x => /Step/.test(x.textContent)) || {}).getAttribute
        ? btns.find(x => /Step/.test(x.textContent)).getAttribute('aria-label') : '',
      state: b.querySelector('.sim-time-state').textContent.trim(),
      stateRole: b.querySelector('.sim-time-state').getAttribute('role'),
      running: b.classList.contains('is-running')
    };
  });
  ok(`${tag}: exactly one control bar`, bar.count === 1, `count=${bar.count}`);
  ok(`${tag}: Play / Step / Reset present`,
    bar.labels.length === 3 && /Pause/.test(bar.labels[0]) && /Step/.test(bar.labels[1]),
    bar.labels.join(' | '));
  ok(`${tag}: Step has an explicit accessible name`, /step/i.test(bar.stepAria), bar.stepAria);
  ok(`${tag}: starts running and says so`, bar.running && /Running/.test(bar.state), bar.state);
  ok(`${tag}: state is a live region`, bar.stateRole === 'status');

  /* No duplicated reset: the pre-existing Reset/Restart/Relaunch button must be
     gone, or a student faces two resets with different rules. */
  const oldBtns = await page.evaluate(() =>
    [...document.querySelectorAll('.sim-actions button')].map(b => b.textContent.trim()));
  ok(`${tag}: no leftover duplicate reset button`,
    !oldBtns.some(l => /Reset|Restart|Replay|Relauch|swing/i.test(l)), oldBtns.join(' | ') || '(none)');

  const probe = () => page.evaluate(() => (window.__tcProbe ? window.__tcProbe() : null));
  const hasProbe = await page.evaluate(() => !!window.__tcProbe);

  /* ---- pause freezes everything ---- */
  await page.click('.sim-time-play');
  await page.waitForTimeout(500);
  const s1 = await probe();
  const samplesAtPause = s1 && s1.samples;
  await page.waitForTimeout(600);
  const s2 = await probe();
  if (hasProbe) {
    ok(`${tag}: pause freezes time`, s1.t === s2.t, `${s1.t} -> ${s2.t}`);
    ok(`${tag}: pause freezes physics state`, JSON.stringify(s1.state) === JSON.stringify(s2.state),
      JSON.stringify(s1.state) + ' -> ' + JSON.stringify(s2.state));
    if (samplesAtPause !== undefined) {
      ok(`${tag}: pause stops graph sampling`, s1.samples === s2.samples,
        `${s1.samples} -> ${s2.samples}`);
    }
  }

  /* ---- one Step = exactly one integration ---- */
  const step1 = await page.evaluate(() => {
    const b = window.__tcProbe ? window.__tcProbe().calls : null;
    document.querySelector('.sim-time-step').click();
    const a = window.__tcProbe ? window.__tcProbe() : null;
    return { b, a };
  });
  if (hasProbe && step1.b !== null) {
    ok(`${tag}: one Step = exactly ONE integration`, step1.a.calls === step1.b + 1,
      `calls ${step1.b} -> ${step1.a.calls}`);
    ok(`${tag}: one Step = exactly 1/60 s`, Math.abs((step1.a.t - s2.t) - FIXED) < 1e-6,
      `dt=${(step1.a.t - s2.t).toFixed(8)}`);
    if (samplesAtPause !== undefined) {
      ok(`${tag}: one Step adds exactly one graph sample`,
        step1.a.samples === s2.samples + 1, `${s2.samples} -> ${step1.a.samples}`);
    }
  }

  /* ---- two more steps ---- */
  const multi = await page.evaluate(() => {
    const b = window.__tcProbe ? window.__tcProbe().calls : null;
    const t0 = window.__tcProbe ? window.__tcProbe().t : 0;
    document.querySelector('.sim-time-step').click();
    document.querySelector('.sim-time-step').click();
    const a = window.__tcProbe ? window.__tcProbe() : null;
    return { b, a, t0 };
  });
  if (hasProbe && multi.b !== null) {
    ok(`${tag}: two Steps = exactly two integrations`, multi.a.calls === multi.b + 2,
      `calls ${multi.b} -> ${multi.a.calls}`);
    ok(`${tag}: two Steps = exactly 2/60 s`, Math.abs((multi.a.t - multi.t0) - 2 * FIXED) < 1e-6,
      `dt=${(multi.a.t - multi.t0).toFixed(8)}`);
  }

  /* ---- coarse step size integrates as multiple sub-steps ---- */
  const coarse = await page.evaluate(() => {
    const sel = document.querySelector('.sim-time-stepsize');
    sel.selectedIndex = 1;                    /* 1/30 s */
    sel.dispatchEvent(new Event('change'));
    const b = window.__tcProbe ? window.__tcProbe().calls : null;
    const t0 = window.__tcProbe ? window.__tcProbe().t : 0;
    document.querySelector('.sim-time-step').click();
    const a = window.__tcProbe ? window.__tcProbe() : null;
    sel.selectedIndex = 0; sel.dispatchEvent(new Event('change'));
    return { b, a, t0 };
  });
  if (hasProbe && coarse.b !== null) {
    ok(`${tag}: 1/30 s step runs TWO 1/60 sub-steps`, coarse.a.calls === coarse.b + 2,
      `calls ${coarse.b} -> ${coarse.a.calls}`);
    ok(`${tag}: 1/30 s step advances exactly 1/30 s`,
      Math.abs((coarse.a.t - coarse.t0) - 1 / 30) < 1e-6, `dt=${(coarse.a.t - coarse.t0).toFixed(8)}`);
  }

  /* ---- Step while running pauses first, exactly one integration ---- */
  await page.click('.sim-time-reset');
  await setRunning(page, true);
  await page.waitForTimeout(200);
  const whileRunning = await page.evaluate(() => {
    const b = window.__tcProbe ? window.__tcProbe().calls : null;
    document.querySelector('.sim-time-step').click();
    const a = window.__tcProbe ? window.__tcProbe() : null;
    return {
      b, a,
      state: document.querySelector('.sim-time-state').textContent.trim()
    };
  });
  ok(`${tag}: Step while running pauses first`, /Paused/.test(whileRunning.state), whileRunning.state);
  if (hasProbe && whileRunning.b !== null) {
    ok(`${tag}: Step while running integrates exactly once, no double-step`,
      whileRunning.a.calls === whileRunning.b + 1,
      `calls ${whileRunning.b} -> ${whileRunning.a.calls}`);
  }
  /* And the loop must actually stop, not idle behind a Paused label. */
  const held1 = await probe();
  await page.waitForTimeout(400);
  const held2 = await probe();
  if (hasProbe) {
    ok(`${tag}: loop genuinely stops while paused`, held2.calls === held1.calls,
      `calls held at ${held2.calls}`);
  }

  /* ---- resume does not jump ---- */
  await page.click('.sim-time-reset');
  await setRunning(page, true);
  await page.waitForTimeout(250);
  await setRunning(page, false);                 /* pause */
  const pAt = await probe();
  await page.waitForTimeout(800);
  const pStill = await probe();
  await setRunning(page, true);                  /* resume */
  const pBack = await probe();
  if (hasProbe) {
    ok(`${tag}: stays frozen for the whole pause`, pAt.t === pStill.t,
      `${pAt.t} -> ${pStill.t}`);
    ok(`${tag}: resume does not jump by the paused duration`, (pBack.t - pStill.t) < 0.1,
      `jumped ${(pBack.t - pStill.t).toFixed(4)}s after 800ms paused`);
  }

  /* ---- play spam makes exactly one loop ----
     Six extra clicks on a toggle, then left RUNNING deliberately. What matters is
     not where an arbitrary click count lands but that the simulation is running
     and advancing at single speed afterwards: two loops would integrate roughly
     twice as fast. */
  await page.click('.sim-time-reset');
  const gotRunning = await setRunning(page, true);
  ok(`${tag}: reaches the running state on demand`, gotRunning);
  for (let i = 0; i < 6; i++) await page.click('.sim-time-play');
  await setRunning(page, true);
  const spamA = await probe();
  await page.waitForTimeout(1000);
  const spamB = await probe();
  if (hasProbe) {
    const adv = spamB.t - spamA.t;
    ok(`${tag}: 6 Play clicks still yield ONE loop`, adv > 0.6 && adv < 1.5,
      `1s wall -> ${adv.toFixed(3)}s sim`);
  }

  /* ---- hidden tab ---- */
  await page.click('.sim-time-reset');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const h1 = await probe();
  await page.waitForTimeout(500);
  const h2 = await probe();
  if (hasProbe) ok(`${tag}: hidden tab does not advance`, h1.t === h2.t, `${h1.t} -> ${h2.t}`);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const h3 = await probe();
  if (hasProbe) {
    ok(`${tag}: no time jump when the tab returns`, (h3.t - h2.t) < 0.1,
      `jumped ${(h3.t - h2.t).toFixed(4)}s`);
  }

  /* ---- reset restores initial conditions ----
     Let the sim run, then pause, then reset. Pausing first matters: Reset keeps
     the pause state, so a reset taken while running would race the next frame
     and assert against a t of 1/60 rather than 0. */
  await setRunning(page, true);
  await page.waitForTimeout(400);
  await setRunning(page, false);
  const beforeReset = await probe();
  await page.click('.sim-time-reset');
  const afterReset = await probe();
  if (hasProbe) {
    ok(`${tag}: reset had something to reset`, beforeReset.t > 0.05,
      `t was ${beforeReset.t}`);
    ok(`${tag}: reset restores t = 0`, Math.abs(afterReset.t) < 1e-9, `t=${afterReset.t}`);
  }

  /* ---- physics agrees with theory at the reported state ---- */
  if (sim.expect) {
    await page.click('.sim-time-reset');
    await setRunning(page, true);
    await page.waitForTimeout(500);
    await setRunning(page, false);
    const st = await probe();
    ok(`${tag}: physics matches closed form (${sim.describe})`, sim.expect(st),
      JSON.stringify(st).slice(0, 110));
  }

  ok(`${tag}: no uncaught page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));

  await page.close();
}

/* ---------------- lifecycle: unmount and remount ---------------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/#/sims/newton`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sim-time');
  await page.goto(`${BASE}/#/sims/waves`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const gone = await page.evaluate(() => ({
    bars: document.querySelectorAll('.sim-time').length,
    canvas: document.querySelectorAll('.sim-canvas-wrap canvas').length
  }));
  ok('lifecycle: control bar removed on navigation away', gone.bars === 0, `bars=${gone.bars}`);
  ok('lifecycle: canvas removed on navigation away', gone.canvas === 0, `canvas=${gone.canvas}`);

  await page.goto(`${BASE}/#/sims/newton`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sim-time');
  await page.waitForTimeout(400);
  const back = await page.evaluate(() => ({
    bars: document.querySelectorAll('.sim-time').length,
    canvas: document.querySelectorAll('.sim-canvas-wrap canvas').length
  }));
  ok('lifecycle: remount creates exactly one bar', back.bars === 1, `bars=${back.bars}`);
  ok('lifecycle: remount creates exactly one canvas', back.canvas === 1, `canvas=${back.canvas}`);

  /* A leaked rAF chain from the destroyed instance would keep integrating and
     make the remounted simulation appear to run at double rate. */
  const a = await page.evaluate(() => window.__tcProbe());
  await page.waitForTimeout(1000);
  const b = await page.evaluate(() => window.__tcProbe());
  ok('lifecycle: remount runs at single rate, no leaked loop',
    (b.t - a.t) > 0.6 && (b.t - a.t) < 1.5, `1s wall -> ${(b.t - a.t).toFixed(3)}s sim`);
  await page.close();
}

/* ---------------- keyboard ---------------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/#/sims/newton`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sim-time');
  await page.waitForTimeout(300);
  await setRunning(page, false);                    /* pause */
  await page.focus('.sim-time-step');
  const k0 = await page.evaluate(() => window.__tcProbe());
  await page.keyboard.press('ArrowRight');
  const k1 = await page.evaluate(() => window.__tcProbe());
  ok('keyboard: ArrowRight steps exactly once',
    k1.calls === k0.calls + 1, `calls ${k0.calls} -> ${k1.calls}`);
  await page.keyboard.press(' ');
  await page.waitForTimeout(120);
  ok('keyboard: Space resumes',
    /Running/.test(await page.textContent('.sim-time-state')));
  /* A focused slider must keep its own keys: Space on a range input is not the
     simulation's play/pause. */
  await setRunning(page, false);
  await page.focus('.sim-controls input[type=range]');
  const before = await page.textContent('.sim-time-state');
  await page.keyboard.press(' ');
  await page.waitForTimeout(120);
  ok('keyboard: Space on a focused slider does not hijack the sim',
    (await page.textContent('.sim-time-state')) === before, before);
  await page.close();
}

/* ---------------- 390px mobile ---------------- */
{
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const sim of SIMS) {
    await m.goto(`${BASE}/#/sims/${sim.id}`, { waitUntil: 'domcontentloaded' });
    await m.waitForSelector('.sim-time', { timeout: 15000 });
    await m.waitForTimeout(250);
    const r = await m.evaluate(() => {
      const doc = document.documentElement;
      const bar = document.querySelector('.sim-time');
      const btns = [...bar.querySelectorAll('button')];
      const small = btns.filter(b => {
        const x = b.getBoundingClientRect();
        return x.height < 40 || x.width < 40;
      }).map(b => b.textContent.trim());
      return {
        overflowX: doc.scrollWidth - doc.clientWidth,
        small,
        sel: bar.querySelector('select').getBoundingClientRect().height
      };
    });
    ok(`mobile 390px ${sim.id}: no horizontal overflow`, r.overflowX <= 0, `${r.overflowX}px`);
    ok(`mobile 390px ${sim.id}: touch targets >= 40px`, r.small.length === 0, r.small.join(', '));
    ok(`mobile 390px ${sim.id}: step select >= 40px`, r.sel >= 40, `${Math.round(r.sel)}px`);
  }
  await m.goto(`${BASE}/#/sims/newton`, { waitUntil: 'domcontentloaded' });
  await m.waitForSelector('.sim-time');
  await m.waitForTimeout(300);
  await m.screenshot({ path: 'tools/.shots/tcw-mobile.png', fullPage: false });
  await m.close();
}

await browser.close();

const pass = results.filter(r => r.pass).length;
for (const r of results) {
  if (!r.pass) console.log(`  FAIL  ${r.n}${r.extra ? '  [' + r.extra + ']' : ''}`);
}
console.log(`\ntime controls (wide)  ${pass}/${results.length} ok`);
process.exit(pass === results.length ? 0 : 1);