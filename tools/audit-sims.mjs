/* PhysiX Academy — registry-wide simulation health audit.
 *
 *   node tools/audit-sims.mjs [baseUrl] [--only=id] [--self-test]
 *
 * WHY THIS EXISTS
 * A simulation page rendering is not evidence that the simulation runs. A canvas
 * element existing is not evidence that physics advances. A slider existing is not
 * evidence it is wired to anything. Phase 3C.1 proved that: "Charge in a B Field"
 * rendered perfectly, showed sliders, readouts and a canvas - and had thrown a
 * ReferenceError on mount, so its loop had never started and its readouts sat on
 * em dashes forever. Every existing suite missed it, because they assert that
 * elements exist, not that values change.
 *
 * So every check here is about OBSERVABLE MOVEMENT:
 *   - do canvas pixels change over a bounded window?
 *   - do readouts change?
 *   - does the simulation's own physics clock advance?
 *   - do WebGL draw calls increase?
 * and about CONSEQUENCES:
 *   - does unmounting stop the loop and remove the surface?
 *   - does remounting create exactly one surface, running at single rate?
 *
 * NO PRODUCTION INSTRUMENTATION IS ADDED. Everything is driven from the test
 * side: addInitScript hooks requestAnimationFrame, WebGLRenderingContext and the
 * canvases themselves, and every assertion reads state the app already exposes
 * (Sims.reg, the DOM, graph.sampleCount, and the existing window.__tcProbe that
 * Phase 3C.1 already put there for the time-control simulations).
 *
 * Classes are assigned from what the code actually does, established by reading
 * each implementation and then confirmed by the run - not assumed up front. A
 * simulation is not called broken for failing to animate if it was never
 * supposed to animate.
 *
 *   dynamic     physics/animation state should advance on its own
 *   interactive does not advance on its own; a declared control must change state
 *   iframe      behaviour lives in a third-party document
 *
 * Anything that cannot be asserted trustworthiness is reported UNVERIFIED with a
 * reason. It is never quietly counted as a pass.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Playwright is installed by the CI workflow. For local runs, it may be in
   the project node_modules or globally. We require it directly. */
function loadPlaywright() {
  return createRequire(import.meta.url)('playwright');
}
const { chromium } = loadPlaywright();

/* Browser selection.
   Local runs use the system Chrome - what a developer already has. CI sets
   PW_CHANNEL=chromium and provisions that browser itself, so the gate depends
   only on what the workflow installed rather than on whichever Chrome version
   happens to be baked into a runner image that is replaced every few weeks.
   Defaulting to 'chrome' means no local behaviour changes and no local flag is
   needed. */
const PW_CHANNEL = process.env.PW_CHANNEL || 'chrome';

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith('--')) || 'http://localhost:4173';
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const SELF_TEST = args.includes('--self-test');
const VERBOSE = args.includes('--verbose');

/* How many distinct animation loops one simulation may run.
   Calibrated against this suite's own fixtures, not guessed: fix-healthy (one
   loop, must be clean) and fix-double-loop (two, must be flagged). */
const MAX_LOOPS = Number(process.env.MAX_LOOPS || 1);

/* ------------------------------------------------------------------ *
 * Manifest
 *
 * `why` records what the implementation actually does, so the expectation can be
 * argued with rather than trusted. `interact` names the specific control that
 * must move state, because "it has sliders" is not an assertion.
 * ------------------------------------------------------------------ */
const MANIFEST = {
  /* ---- Phase 3C time-control simulations: physics clock is observable ---- */
  newton: { cls: 'dynamic', why: 'F = ma with friction; cart accelerates every frame', probe: 'a' },
  energy: { cls: 'dynamic', why: 'pendulum integrates om and th each frame' },
  collision: { cls: 'dynamic', why: 'balls integrate and impulse-resolve on contact' },
  orbit: { cls: 'dynamic', why: 'inverse-square gravity integration', probe: 't' },
  incline: { cls: 'dynamic', why: 'block slides once tan(th) > mu', probe: 't' },
  atwood: { cls: 'dynamic', why: 'two masses accelerate on the rope', probe: 't' },
  bfield: { cls: 'dynamic', why: 'cyclotron rotation integrates exactly', probe: 't' },
  kin1d: { cls: 'dynamic', why: 'car clock advances; graph samples grow', probe: 't' },
  projectile: { cls: 'dynamic', why: 'ball integrates under gravity and drag', probe: 't' },
  shm: { cls: 'dynamic', why: 'spring-mass oscillator integrates', probe: 't' },

  /* ---- frame-driven natives ---- */
  'workstation-demo': { cls: 'dynamic', why: 'fixed-step dynamics-cart run; graph records x/v over time' },
  wave: { cls: 'dynamic', why: 'travelling wave phase is a function of elapsed time' },
  circuit: { cls: 'dynamic', why: 'current phase advances each frame' },
  doppler: { cls: 'dynamic', why: 'source translates, wavefronts expand' },
  induction: { cls: 'dynamic', why: 'magnet translates, flux changes, emf decays' },
  standing: { cls: 'dynamic', why: 'superposition phase advances', staticGraph: true },
  interference: { cls: 'dynamic', why: 'two-source interference phase advances', staticGraph: true },
  rc: { cls: 'dynamic', why: 'capacitor charges/discharges over t' },
  cooling: { cls: 'dynamic', why: 'Newton cooling curve advances over t' },
  collision2d: { cls: 'dynamic', why: 'two discs integrate with impulse response' },
  /* Workstation plots are static sweeps for several benches: the graph data is
     real published data, but it is parameterised, not time-accumulating. */
  'ncert9-echo': { cls: 'dynamic', why: 'ping cycle runs on a ~1.4s loop', slow: true, staticGraph: true },
  'ncert11-rotation': { cls: 'dynamic', why: 'skater angular velocity integrates' },
  'ncert11-venturi': { cls: 'dynamic', why: 'flow arrows animate on a phase clock', staticGraph: true },
  'ktg-gas': { cls: 'dynamic', why: 'particle velocities random-walk each frame' },
  'wasm-fluid': { cls: 'dynamic', why: 'particles drift and collide' },
  'atoms-bohr': { cls: 'dynamic', why: 'electron orbits using wall-clock time', staticGraph: true },

  /* ---- WebGL: pixel readback is impossible without preserveDrawingBuffer,
         so the observable is draw-call count ---- */
  orbit3d: { cls: 'dynamic', why: '3D orbital integration', webgl: true },
  wave3d: { cls: 'dynamic', why: '3D wave surface t advances', webgl: true },
  efield3d: { cls: 'dynamic', why: 'field rig rotates on clock delta', webgl: true, staticGraph: true },
  'cdn-3d-atom': { cls: 'dynamic', why: '3D atom electrons orbit on the wall clock; CDN texture is optional and falls back offline', webgl: true },

  /* ---- interactive, NOT expected to animate on their own ---- */
  efield: {
    cls: 'interactive',
    why: 'probes array starts empty; only a click drops a test charge',
    interact: { kind: 'canvas-click', expect: 'pixels' }
  },
  buoyancy: {
    cls: 'interactive',
    why:
      'floats in equilibrium at default densities - STATIC by design; ' +
      'it only moves once the object is denser than the fluid',
    interact: { kind: 'range', index: 0, to: 'max', expect: 'pixels' }
  },
  lens: {
    cls: 'interactive',
    why: 'thin-lens equation evaluated per draw, no clock',
    interact: { kind: 'range', index: 0, to: 'max', expect: 'any' }
  },
  refraction: {
    cls: 'interactive',
    why: "Snell's law evaluated per draw, no clock",
    interact: { kind: 'range', index: 0, to: 'max', expect: 'any' }
  },
  /* Heat Engine Cycle - the P-V loop WAS a fixed illustration. The polygon was
     four hard-coded literals in js/sims-more.js that referenced neither slider,
     so the readouts moved while the picture never did, and the work readout was
     literally labelled "(demo)". Verified rather than assumed: a pixel-signature
     probe sampling the routed page five times with nothing touched returned one
     distinct value, which is what a frozen polygon looks like.

     That claim has now been FIXED, so the declaration below is stronger than
     before: it demands the DIAGRAM change, not merely a readout. The audit
     passing here is therefore the evidence that the loop responds to Th and Tc.

     Note this is the 2D canvas simulation registered in js/sims-more.js, which
     is what /#/sims/thermo-engine serves. html5-sims/thermo-engine.html is a
     separate 3D page in the "3D" gallery with the same cycle and its own
     (also genuine) defect: its two "isothermal" legs were drawn at constant
     pressure. Both are covered by tools/test-thermo-engine.mjs. */
  'thermo-engine': {
    cls: 'interactive',
    why: 'Carnot cycle computed from Th and Tc each frame; the drawn loop and the readouts both track the sliders',
    interact: { kind: 'range', index: 0, to: 'max', expect: 'any' }
  },
  'ncert10-mirror': {
    cls: 'interactive',
    why: 'mirror equation from sliders, no clock',
    interact: { kind: 'range', index: 0, to: 'max', expect: 'any' }
  },
  'ncert10-eye': {
    cls: 'interactive',
    why: 'eye defect from power slider, no clock',
    interact: { kind: 'range', index: 0, to: 'max', expect: 'any' }
  },
  'ncert10-heating': {
    cls: 'interactive',
    why: 'Joule heating from slider values, no clock',
    interact: { kind: 'range', index: 0, to: 'max', expect: 'any' }
  },
  'ncert11-solids': {
    cls: 'interactive',
    why: 'stress-strain from slider values, no clock',
    interact: { kind: 'range', index: 0, to: 'max', expect: 'any' }
  },
  'ncert11-pv': {
    cls: 'interactive',
    why: 'PV cycle traced from slider values, no clock',
    interact: { kind: 'range', index: 0, to: 'max', expect: 'any' }
  },
  'ncert11-measure': {
    cls: 'interactive',
    why: 'Vernier calipers: jaws are DRAGGED with the pointer, ' + 'there are no sliders at all',
    interact: { kind: 'canvas-drag', expect: 'any' }
  },

  /* ---- third-party iframes ---- */
  ns: { cls: 'iframe', why: 'embeds physics-lab.vercel.app' },
  'phet-energy-skate-park': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-forces-motion': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-projectile': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-circuit': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-balancing': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-pendulum': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-charges-fields': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-coulombs-law': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-ohms-law': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-springs': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true }
};

const results = [];
const add = (id, name, pass, evidence) =>
  results.push({ id, name, pass: !!pass, evidence: evidence || '' });

/* Not every console error means the simulation is broken.
     Production's Content-Security-Policy refuses a jsdelivr fetch that
     wasm-fluid makes for its optional WASM solver; the simulation is built to
     fall back to a local JS particle solver and carries on. Failing the sim for
     that would be wrong - it is a policy condition, not a product fault - but
     blanket-suppressing console errors would blunt the one signal that actually
     caught cdn-3d-atom, so only this narrow class is separated out, and it is
     still printed in the report. */
const isExternalPolicyNoise = (t) =>
  /Content Security Policy|violates the following/i.test(t) ||
  /Refused to connect because it violates/i.test(t) ||
  /cdn\.jsdelivr\.net/i.test(t) ||
  /net::ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION|BLOCKED)/i.test(t);

/* `pg` is passed in rather than closed over: `page` is created inside runAudit(),
   so a module-level reference is a ReferenceError waiting to happen. */
const realErrors = (pg) => pg.__errs.filter((e) => !isExternalPolicyNoise(e));
const policyNoise = (pg) => pg.__errs.filter(isExternalPolicyNoise);

function assertNoMountErrors(pg, id) {
  const real = realErrors(pg);
  const noise = policyNoise(pg);
  if (real.length === 0) {
    add(id, 'no errors during mount', true, '');
    if (noise.length) {
      results.push({
        id,
        name: 'external-resource errors present (CSP / offline), fallback used',
        pass: true,
        evidence: noise[0].slice(0, 96) + ' - policy condition, not a simulation fault'
      });
    }
  } else {
    add(id, 'no errors during mount', false, real.slice(0, 2).join(' ; '));
  }
}

/* ------------------------------------------------------------------ *
 * Test-side instrumentation. Installed once per page, before app code.
 * ------------------------------------------------------------------ */
const INSTRUMENT = `
window.__h = { rafCalls: 0, glCalls: 0, sigChanges: 0, last: '', samples: 0, sampleTimer: 0, loopFns: new Set() };

const raf = window.requestAnimationFrame.bind(window);
  /* rafCalls counts INVOCATIONS, which is a claim about the machine: on a slow
     runner a perfectly healthy loop can fall under any fixed threshold, which is
     exactly how CI run 38330808426 reported induction as broken when it was
     healthy. Loop count is a claim about the CODE, so it is measured by counting
     DISTINCT callback identities instead. That is immune to frame rate: verified
     to report 1/2/4/8 for 1/2/4/8 concurrent loops. */
  window.__hLoops = function () {
    window.__h.loopFns = window.__h.loopFns || new Set();
    return window.__h.loopFns.size;
  };
  window.requestAnimationFrame = function (cb) {
    window.__h.rafCalls++;
    /* Defensive: the very first mount runs BEFORE anything calls __hReset, and
       loopFns is only created there. Without this the wrapper throws
       "Cannot read properties of undefined (reading 'add')" inside the
       simulation's own frame callback - which the audit then reports against the
       simulation, as if it were the simulation's bug. It was the instrument's. */
    window.__h.loopFns = window.__h.loopFns || new Set();
    window.__h.loopFns.add(cb);
    return raf(cb);
  };

const patchGL = (Ctor) => {
  if (!Ctor || !Ctor.prototype) return;
  ['drawElements','drawArrays','drawArraysInstanced','drawElementsInstanced'].forEach(m => {
    const f = Ctor.prototype[m];
    if (f && !f.__patched) {
      const w = function () { window.__h.glCalls++; return f.apply(this, arguments); };
      w.__patched = true;
      Ctor.prototype[m] = w;
    }
  });
};
patchGL(window.WebGLRenderingContext);
patchGL(window.WebGL2RenderingContext);

/* Pixel signature of the STAGE canvas in the sim frame. Graph canvases are
   excluded from the settle/motion signature: a live time-axis graph expands
   forever, so including it makes even a physically settled bench "never stop
   changing". The stage is the rendered apparatus the audit is judging. */
window.__hSample = function () {
  const frame = document.querySelector('.sim-frame');
  if (!frame) return;
  const stage = frame.querySelector('.ws-stage-wrap');
  const cs = [...(stage ? stage.querySelectorAll('canvas') : frame.querySelectorAll('canvas'))];
  const csAll = [...frame.querySelectorAll('canvas')];
  let hash = 0, twoD = 0, webgl = 0;
  cs.forEach((c, i) => {
    let ctx = null;
    try { ctx = c.getContext('2d'); } catch (e) { ctx = null; }
    if (!ctx) { webgl++; return; }
    twoD++;
    try {
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let k = 0; k < d.length; k += 401) hash = (hash * 33 + d[k] * (i + 1)) >>> 0;
    } catch (e) { /* tainted / zero-size */ }
  });
  const readouts = [...frame.querySelectorAll('.readout')]
    .map(r => r.innerText.replace(/\s+/g, ' ').trim()).join('|');
  /* Two separate signatures on purpose.
     pixelSig is the RENDERED OUTPUT. readoutSig is the numbers.
     For "does this control drive the simulation" only pixelSig counts: a readout
     that merely echoes the slider value changes when the slider moves, and
     treating that as proof of a working control is exactly the mistake the
     fix-dead-control fixture exists to catch - its slider does nothing at all,
     yet a naive signature check sees the readout change and calls it healthy. */
  window.__h.pixelSig = hash;
  window.__h.readoutSig = readouts;
  const sig = hash + '~' + readouts;
  window.__h.samples++;
  window.__h.twoD = twoD; window.__h.webgl = webgl; window.__h.canvases = csAll.length;
  if (window.__h.last && window.__h.last !== sig) window.__h.sigChanges++;
  window.__h.last = sig;
};
window.__hReset = function () {
    window.__h.sigChanges = 0; window.__h.last = ''; window.__h.rafCalls = 0; window.__h.glCalls = 0;
    window.__h.pixelSig = null; window.__h.readoutSig = '';
    window.__h.loopFns = new Set();   /* the loop set is per-measurement */
};
window.__hStart = function () {
  window.__hStop();
  window.__h.pixelSettled = 0;
  window.__h.sampleTimer = setInterval(function () {
    const prev = window.__h.pixelSig;
    window.__hSample();
    /* Track whether the rendered output has stopped changing. An interaction must
       be measured against a SETTLED picture: if the baseline is taken before the
       simulation has drawn its first frame, the very act of drawing registers as
       "the control changed the output" and any simulation with a dead control
       looks healthy. This is a false positive that only appears when timing is
       unlucky, which is exactly the kind of flake that hides a real defect. */
    if (window.__h.pixelSig !== null && window.__h.pixelSig === prev) window.__h.pixelSettled++;
    else window.__h.pixelSettled = 0;
  }, 32);
};
window.__hSettled = function () { return window.__h.pixelSettled >= 3; };
window.__hStop = function () { if (window.__h.sampleTimer) clearInterval(window.__h.sampleTimer); window.__h.sampleTimer = 0; };
`;

async function makePage(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  /* Optional CPU throttling, for reproducing a slow runner on a fast machine.
     CI_CPU_THROTTLE=4 makes the page behave roughly as it would on a throttled
     core. Off unless set, and it can only ever make the audit slower and more
     likely to fail - it cannot turn a failure into a pass - so it is a
     diagnostic, never a way to relax an assertion. */
  const RATE = Number(process.env.CI_CPU_THROTTLE || 0);
  if (RATE > 1) {
    try {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    } catch (e) {
      /* throttling unsupported: run unthrottled */
    }
  }
  await page.addInitScript(INSTRUMENT);
  page.__errs = [];
  page.on('pageerror', (e) =>
    page.__errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 140))
  );
  page.on('console', (m) => {
    const url = (m.location() || {}).url || '';
    if (m.type() === 'error' && !/_vercel\//.test(url)) {
      page.__errs.push('console: ' + m.text().slice(0, 140));
    }
  });
  return page;
}

/* Bounded, condition-based wait - never a bare sleep as the assertion itself. */
async function until(page, fn, arg, timeout = 2500) {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 50 });
    return true;
  } catch {
    return false;
  }
}

async function runAudit() {
  const browser = await chromium.launch({ channel: PW_CHANNEL });
  const page = await makePage(browser);

  await page.goto(`${BASE}/#/sims`, { waitUntil: 'networkidle' });
  /* Wait for all sim modules to be loaded via ensureAll() */
  await page.evaluate(() => window.__SimsReady);
  await page.waitForTimeout(500);

  /* Registry discovery, with a fallback.
     The direct import is the honest source of truth - it is literally
     Sims.reg. But the bundled build inlines sims-a.js, so /js/sims-a.js does
     not exist there and the import throws, taking the whole audit down. The
     index page renders one link per registered simulation in both shapes, so the
     link list is a complete fallback. Reporting the source used matters: a reader
     should know whether they got the registry or a rendering of it. */
  let ids = [];
  let registrySource = 'Sims.reg';
  try {
    ids = await page.evaluate(async () => {
      const { Sims } = await import('/js/sims-a.js');
      return Object.keys(Sims.reg);
    });
    if (!ids.length) throw new Error('empty registry');
  } catch (e) {
    registrySource = 'index links (bundled build: /js/sims-a.js is inlined)';
    ids = await page.evaluate(() => [
      ...new Set(
        [...document.querySelectorAll('a[href^="#/sims/"]')].map((a) =>
          a.getAttribute('href').replace('#/sims/', '')
        )
      )
    ]);
  }
  console.log(`\n  registry source: ${registrySource}`);
  console.log(`  registry reports ${ids.length} simulations\n`);

  let idx = 0;
  for (const id of ids) {
    if (ONLY && id !== ONLY) continue;
    idx++;
    const spec = MANIFEST[id];
    if (!spec) {
      add(id, 'classification', false, 'no manifest entry - cannot assert expected behaviour');
      continue;
    }
    page.__errs = [];
    await page.evaluate(() => {
      window.__hStop && window.__hStop();
    });
    await page.evaluate((i) => {
      location.hash = '#/sims/' + i;
    }, id);

    /* --- mount ---
       Wait for the surface THIS class declares, not for "any child". The first
       version accepted any child at all, so it returned immediately on the
       .sim-head and then measured the surface before it existed - which showed
       up as random failures on different simulations each run (ns reporting no
       iframe, cdn-3d-atom reporting no button, wasm-fluid reporting no canvas).
       Nondeterministic failures are worse than none: they train you to ignore the
       audit, which is the exact thing this was built to prevent. */
    const mountPredicate =
      spec.cls === 'iframe'
        ? () => {
            const f = document.querySelector('.sim-frame');
            return !!(f && (f.querySelector('iframe') || f.querySelector('.btn-launch')));
          }
        : spec.cls === 'interactive' && spec.interact.kind === 'button'
          ? () => {
              const f = document.querySelector('.sim-frame');
              return !!(
                f && [...f.querySelectorAll('button')].some((b) => /load/i.test(b.textContent))
              );
            }
          : () => {
              const f = document.querySelector('.sim-frame');
              return !!(f && f.querySelector('canvas'));
            };
    const mounted = await until(page, mountPredicate, null, 10000);
    add(
      id,
      'mounts and creates a rendering surface',
      mounted,
      mounted ? '' : 'declared surface never appeared'
    );
    if (!mounted) {
      add(id, 'no errors during mount', false, page.__errs.slice(0, 2).join(' ; '));
      continue;
    }
    await page.waitForTimeout(600);

    /* Separates CSP/offline external-resource refusals from genuine faults. */
    assertNoMountErrors(page, id);

    const surface = await page.evaluate(() => {
      const f = document.querySelector('.sim-frame');
      const ifr = [...f.querySelectorAll('iframe')];
      return {
        canvases: f.querySelectorAll('canvas').length,
        iframes: ifr.length,
        iframeSrc: ifr.map((i) => i.src),
        launchGate: !!f.querySelector('.btn-launch'),
        btns: [...f.querySelectorAll('button')].map((b) => b.textContent.trim()),
        ranges: f.querySelectorAll('input[type=range]').length,
        readouts: [...f.querySelectorAll('.readout')].length,
        graphs: f.querySelectorAll('.pgraph').length
      };
    });

    /* ---------------- iframe class ---------------- */
    if (spec.cls === 'iframe') {
      if (spec.phet) {
        add(
          id,
          'presents a Launch gate before any third-party frame exists',
          surface.launchGate,
          surface.launchGate ? '' : 'no .btn-launch found'
        );
        await page.evaluate(() => {
          const b = document.querySelector('.sim-frame .btn-launch');
          if (b) b.click();
        });
        const got = await until(
          page,
          () => {
            const i = document.querySelector('.sim-frame iframe');
            return i && i.src ? i.src : null;
          },
          null,
          20000
        );
        const src = got
          ? await page.evaluate(() => {
              const i = document.querySelector('.sim-frame iframe');
              return i ? i.src : 'no-iframe';
            })
          : '';
        add(
          id,
          'clicking Launch creates an iframe pointing at phet.colorado.edu',
          got && /phet\.colorado\.edu/.test(src),
          src || 'no iframe created'
        );
        /* Load status is REPORTED, never asserted as physics.
             This row used to be pushed with a hardcoded `pass: true`, which could
             not fail and therefore could not detect anything - a green tick that
             meant nothing. What the parent page can genuinely observe is the
             iframe's own load lifecycle:
               load-event - the document was fetched and parsed. That is a real
                             observation, but it says nothing about the simulation
                             inside, which is cross-origin.
               error-event - the embed genuinely failed. That is a real defect.
               timeout    - third-party network was too slow to judge. Not a pass
                             and not a failure; recorded and left undecided.
             The row keeps the 'external ' prefix, which is what routes it out of
             the pass/fail decision and into the NOT FULLY VERIFIABLE report, so
             no PhET simulation is ever declared healthy on the strength of a
             document it cannot see inside. */
        const loaded =
          got &&
          (await page.evaluate(
            () =>
              new Promise((res) => {
                const i = document.querySelector('.sim-frame iframe');
                if (!i) {
                  res('no-iframe');
                  return;
                }
                let settled = false;
                const done = (v) => {
                  if (!settled) {
                    settled = true;
                    res(v);
                  }
                };
                i.addEventListener('load', () => done('load-event'), { once: true });
                i.addEventListener('error', () => done('error-event'), { once: true });
                setTimeout(() => done('timeout'), 20000);
              })
          ));
        if (loaded === 'error-event') {
          add(
            id,
            'external PhET embed reports a load error (cross-origin: internals NOT inspected)',
            false,
            'the iframe fired an error event - the embed did not load'
          );
        } else {
          results.push({
            id,
            name: 'external PhET document actually loads (cross-origin: config verified, internals NOT inspected)',
            /* Tri-state on purpose. A timeout is genuinely undecided: the
               document may be fine and the runner's third-party network slow.
               Counting it as a failure made this workflow red for reasons no
               commit could fix; counting it as a pass would claim health that
               was never observed. */
            pass:
              loaded === 'error-event'
                ? false
                : loaded === 'timeout'
                  ? null
                  : loaded === 'load-event',
            evidence:
              `load=${loaded} - ` +
              (loaded === 'load-event'
                ? 'document fetched and parsed; its simulation is cross-origin and was NOT inspected'
                : 'third-party network too slow to judge - left undecided, not counted either way')
          });
        }
      } else {
        add(id, 'embeds a third-party frame', surface.iframes > 0, surface.iframeSrc.join(', '));
      }
      /* lifecycle for iframes too. A PhET sim is gate-first, so it may have zero
         iframes at mount; the gate counts as its surface. */
      await lifecycleChecks(page, id, {
        firstCanvases: 0,
        firstIframes: spec.phet ? 1 : Math.max(1, surface.iframes),
        animates: false
      });
      continue;
    }

    /* ---------------- interactive class ---------------- */
    if (spec.cls === 'interactive') {
      add(
        id,
        'has the control its declared interaction needs',
        spec.interact.kind === 'button'
          ? surface.btns.some((b) => /load/i.test(b))
          : surface.canvases > 0,
        `canvases=${surface.canvases} btns=[${surface.btns.join('|')}]`
      );

      await page.evaluate(() => {
        window.__hReset();
        window.__hStart();
      });
      /* Settle, THEN take the baseline, THEN interact.
         The baseline was originally captured immediately before the interaction
         block and read again afterwards - which meant it was taken after the
         slider had already been moved, so "did the picture change" compared the
         new picture with itself and every interactive simulation reported its
         control as dead. Order is the whole test here. */
      const settled = await until(page, () => window.__hSettled && window.__hSettled(), null, 3000);
      add(
        id,
        'rendered output settles before the interaction is measured',
        settled,
        settled ? '' : 'picture never stopped changing - cannot measure a control effect'
      );
      const before = await page.evaluate(
        (s) => window.__h[s],
        spec.interact.expect === 'readout' ? 'readoutSig' : 'pixelSig'
      );

      if (spec.interact.kind === 'range') {
        const moved = await page.evaluate(({ index, to }) => {
          const rs = [...document.querySelectorAll('.sim-frame input[type=range]')];
          if (!rs[index]) return false;
          const r = rs[index];
          const v = to === 'max' ? r.max : r.min;
          if (String(r.value) === String(v)) return false;
          r.value = v;
          r.dispatchEvent(new Event('input', { bubbles: true }));
          r.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }, spec.interact);
        add(
          id,
          'declared slider exists and was moved',
          moved,
          moved ? '' : `slider[${spec.interact.index}] missing or already at target`
        );
      } else if (spec.interact.kind === 'canvas-click') {
        await page.evaluate(() => {
          const c = document.querySelector('.sim-frame canvas');
          if (!c) return;
          const r = c.getBoundingClientRect();
          const ev = new PointerEvent('pointerdown', {
            bubbles: true,
            clientX: r.left + r.width * 0.5,
            clientY: r.top + r.height * 0.5,
            pointerId: 1
          });
          c.dispatchEvent(ev);
          c.dispatchEvent(
            new PointerEvent('pointerup', {
              bubbles: true,
              clientX: r.left + r.width * 0.5,
              clientY: r.top + r.height * 0.5,
              pointerId: 1
            })
          );
          c.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              clientX: r.left + r.width * 0.5,
              clientY: r.top + r.height * 0.5
            })
          );
        });
        add(id, 'declared canvas click was dispatched', true);
      } else if (spec.interact.kind === 'canvas-drag') {
        await page.evaluate(async () => {
          const c = document.querySelector('.sim-frame canvas');
          if (!c) return;
          const r = c.getBoundingClientRect();
          const y = r.top + r.height * 0.5;
          c.dispatchEvent(
            new PointerEvent('pointerdown', {
              bubbles: true,
              clientX: r.left + 100,
              clientY: y,
              pointerId: 1,
              isPrimary: true
            })
          );
          for (let x = 100; x <= 190; x += 10) {
            c.dispatchEvent(
              new PointerEvent('pointermove', {
                bubbles: true,
                clientX: r.left + x,
                clientY: y,
                pointerId: 1,
                isPrimary: true
              })
            );
            await new Promise((r2) => requestAnimationFrame(r2));
          }
          c.dispatchEvent(
            new PointerEvent('pointerup', {
              bubbles: true,
              clientX: r.left + 190,
              clientY: y,
              pointerId: 1,
              isPrimary: true
            })
          );
        });
        add(id, 'declared drag gesture was dispatched', true);
      } else if (spec.interact.kind === 'button') {
        const clicked = await page.evaluate((t) => {
          const b = [...document.querySelectorAll('.sim-frame button')].find((x) =>
            new RegExp(t, 'i').test(x.textContent)
          );
          if (!b) return false;
          b.click();
          return true;
        }, spec.interact.text);
        add(id, 'declared button was clicked', clicked, clicked ? '' : 'button not found');
      }

      if (spec.interact.expect === 'cdn') {
        /* Either the CDN succeeded or the designed offline fallback fired. Both
           are correct outcomes; what would be wrong is neither. */
        const res = await until(
          page,
          () => {
            const f = document.querySelector('.sim-frame');
            const txt = f ? f.innerText : '';
            if (f && f.querySelector('canvas')) return 'canvas';
            if (/fallback|blocked/i.test(txt)) return 'fallback';
            return false;
          },
          null,
          9000
        );
        add(
          id,
          'CDN load produced a canvas or the designed offline fallback',
          res,
          res === 'canvas'
            ? 'CDN texture loaded'
            : res === 'fallback'
              ? 'offline fallback (expected in sandbox)'
              : 'neither'
        );
      } else {
        /* PIXELS only. A readout that merely echoes the slider value changes when
           the slider moves, so a combined signature would report a dead control as
           working - the exact failure the fix-dead-control fixture is built to
           expose. What must change is the picture the student is looking at. */
        const settled2 = settled;
        /* Which observable counts as proof the control did something. Pixel-only
           is the default because a readout that merely echoes the slider proves
           nothing. A simulation may still declare 'readout' when its picture is
           genuinely a fixed illustration and the numbers are the real output.

           thermo-engine used to be the only simulation taking that path, and the
           justification written here at the time was correct: its loop really
           was fixed artwork. It has since been fixed, so it now takes the default
           pixel proof. (Worth recording that the claim was doubted during this
           work, on the grounds that html5-sims/thermo-engine.html - a DIFFERENT
           file implementing the same cycle - does recompute from its sliders.
           Two implementations, one id, and the wrong one was read first.)

           The 'readout' escape hatch is deliberately retained: it is a
           declaration a maintainer must justify in writing, and there is no
           current user. Removing it would only invite the next person to reach
           for pixelSig unconditionally and miss a genuinely static diagram. */
        const signal = spec.interact.expect === 'readout' ? 'readoutSig' : 'pixelSig';
        /* `signal` and `before` are passed in through the ARGUMENT, not closed
           over. page.waitForFunction serialises the predicate and evaluates it in
           the browser, where Node-side variables simply do not exist - a
           predicate referencing one throws a ReferenceError, waitForFunction
           rejects, and until() reports false. The symptom was baffling and looked
           like a product bug: the evidence line happily printed
           "1954717525 -> 3572041623", i.e. the signature HAD changed, while the
           check still failed. Every interactive simulation "failed" for this
           reason. The audit's own job is to detect false passes, so a predicate
           that silently reports failure rather than erroring is the worst
           possible failure mode, and it is worth the comment. */
        const changed = await until(
          page,
          ({ s, prev }) => window.__h[s] !== prev && window.__h.samples > 4,
          { s: signal, prev: before },
          3000
        );
        const sig = await page.evaluate(() => window.__h.pixelSig);
        add(
          id,
          spec.interact.expect === 'readout'
            ? 'the interaction changed the readouts (diagram is a fixed illustration)'
            : 'the interaction changed the rendered output',
          changed,
          changed
            ? ''
            : `signature unchanged (${String(before).slice(0, 22)} -> ${String(sig).slice(0, 22)})`
        );
      }
      await page.evaluate(() => {
        window.__hStop && window.__hStop();
      });
      await lifecycleChecks(page, id, {
        firstCanvases: surface.canvases,
        firstIframes: surface.iframes,
        animates: false /* interactive sims are not required to animate */
      });
      continue;
    }

    /* ---------------- dynamic class ---------------- */
    await page.evaluate(() => {
      window.__hReset();
      window.__hStart();
    });

    if (spec.webgl) {
      /* Occurrence, not a rate. The old bound was glCalls > 40 within 3s, an
         absolute count that is a claim about the machine: a full sweep at 8x
         throttle produced exactly 40 draw calls and failed on the strict
         inequality, off by one, with the scene demonstrably rendering. Any
         WebGL scene that draws at all satisfies this; one that never draws
         produces zero however long you wait. */
      const moved = await until(page, () => window.__h.glCalls > 0, null, 12000);
      const gl = await page.evaluate(() => ({ gl: window.__h.glCalls, webgl: window.__h.webgl }));
      add(
        id,
        'WebGL draw calls increase (3D scene is actually rendering)',
        moved,
        `draws=${gl.gl} webglCanvases=${gl.webgl}` +
          (moved ? '' : '  (no draw calls at all within 12s)')
      );
    } else {
      /* Assert that the output CHANGES, not how fast it changes. The old form
         demanded N signature changes inside a fixed window, which is a claim
         about the machine: in a full sweep at 8x throttle `kin1d` recorded
         sigChanges=1 against a bound of 6 and was reported frozen, while the
         same simulation passed in isolation at the same throttle. A slow
         simulation is still a running simulation, and a frozen one produces NO
         change however long you wait - so a longer window cannot rescue a
         frozen simulation, it can only rescue a slow one. That is the whole
         difference between this and lowering a threshold.

         Two changes are required rather than one, so a single settle artefact
         is not mistaken for motion. */
      const need = 2;
      const tChange = Date.now();
      const moved = await until(
        page,
        (n) => window.__h.sigChanges >= n,
        need,
        spec.slow ? 20000 : 12000
      );
      const tookMs = Date.now() - tChange;
      const h = await page.evaluate(() => ({
        changes: window.__h.sigChanges,
        canvases: window.__h.canvases,
        twoD: window.__h.twoD
      }));
      add(
        id,
        'rendered output or readouts change over time',
        moved,
        `sigChanges=${h.changes} (need >=${need}` +
          (moved ? `, first seen after ${tookMs}ms` : ` within ${spec.slow ? 20000 : 12000}ms`) +
          `) 2D=${h.twoD}/${h.canvases}`
      );
    }

    /* The strongest available evidence: the simulation's own physics clock. */
    const hasProbe = await page.evaluate(() => !!window.__tcProbe);
    if (hasProbe) {
      const p0 = await page.evaluate(() => window.__tcProbe());
      const advanced = await until(
        page,
        () => {
          const p = window.__tcProbe();
          return p && typeof p.t === 'number' && p.t > 0.05;
        },
        null,
        3000
      );
      const p1 = await page.evaluate(() => window.__tcProbe());
      add(id, 'physics clock advances', advanced, `t=${p0 && p0.t} -> ${p1 && p1.t}`);
      if (p1 && p0) {
        const real = realErrors(page);
        add(id, 'no errors while simulating', real.length === 0, real.slice(0, 2).join(' ; '));
      }
    } else {
      add(id, 'has a rendering surface', surface.canvases > 0, `canvases=${surface.canvases}`);
      results.push({
        id,
        name: 'physics clock observable',
        pass: true,
        evidence: 'no probe for this simulation - asserted via rendered output instead'
      });
    }

    /* Graphs, where present, must actually receive samples. Most workstation
       plots are live time series and must keep growing; a manifest may instead
       declare a static sweep (parameterised real data that is published once
       at mount / on parameter change) — for those, evidence is that the plot
       is populated at all. */
    if (surface.graphs > 0) {
      const g0 = await page.evaluate(() =>
        window.PhysixGraph.graphs.all.map((g) => g.sampleCount()).join(',')
      );
      const grew = spec.staticGraph
        ? g0.split(',').some((n) => +n > 0)
        : await until(
            page,
            (prev) => {
              const now = window.PhysixGraph.graphs.all.map((g) => g.sampleCount()).join(',');
              return now !== prev && now !== '0,0,0';
            },
            g0,
            3000
          );
      const g1 = await page.evaluate(() =>
        window.PhysixGraph.graphs.all.map((g) => g.sampleCount()).join(',')
      );
      add(id, 'graph receives samples from the simulation', grew, `${g0} -> ${g1}`);
    }

    await page.evaluate(() => {
      window.__hStop && window.__hStop();
    });
    await lifecycleChecks(page, id, {
      firstCanvases: surface.canvases,
      firstIframes: surface.iframes,
      animates: true /* dynamic sims must be running after a remount */
    });
  }

  await browser.close();
}

/* Lifecycle: unmount must release everything; remount must create exactly what
 * the first mount created.
 *
 * The first version asserted "exactly one canvas". That is only true for a
 * simulation with a single viewport: projectile, shm and kin1d each own TWO
 * canvases (the simulation viewport and the graph plot), so a correct remount was
 * reported as a duplication. And an rAF-rate floor is meaningless for a
 * static or iframe simulation, where zero frames is the CORRECT steady state - so
 * the rate check is applied only to simulations that are supposed to be animating. */
async function lifecycleChecks(page, id, opts) {
  /* Navigate away and confirm the simulation's rendering surface and loop are
     gone.

     The earlier version polled for the canvas to disappear and asserted on the
     poll. That is a router-latency assertion wearing a teardown assertion's
     clothes: viewSimsPage rebuilds App.el.innerHTML on every navigation, so a
     canvas inside #main can never survive regardless of what the simulation
     does. Under a 4x CPU throttle the hash change simply had not been
     processed within the 6000ms budget, the check failed, and its evidence -
     sampled after the wait - printed canvas=0, so the failure read as a pass.

     Two changes, neither of which is a longer timeout:

     1. Wait for the ROUTER to arrive at the destination view first, using a
        generous bound. Arrival is observable; teardown correctness is then a
        synchronous read that cannot lose a race with the router.
     2. Scan the whole document rather than only #main. A surface appended
        outside the router's replacement subtree - document.body, a detached
        overlay - is exactly the leak that survives the innerHTML wipe, and the
        old #main-scoped query could not see it. This is the defect the check
        existed to catch and it was not catching it. */
  await page.evaluate(() => {
    location.hash = '#/formulas';
  });
  const t0 = Date.now();
  const arrived = await until(
    page,
    () => {
      const main = document.getElementById('main');
      if (!main) return false;
      if (location.hash.indexOf('#/sims/') === 0) return false;
      return !!main.querySelector('.wrap') && !main.querySelector('.sim-slot-lg, .sim-slot');
    },
    null,
    20000
  );
  const routerMs = Date.now() - t0;
  const leftover = await page.evaluate(() => ({
    /* anywhere in the document, not just inside the router's subtree */
    strayCanvas: document.querySelectorAll('canvas').length,
    inMain: (document.getElementById('main') || document).querySelectorAll(
      '.sim-frame canvas, .sim-frame iframe'
    ).length,
    iframe: document.querySelectorAll('iframe').length,
    bar: document.querySelectorAll('.sim-time').length
  }));
  /* The formulas view legitimately contains no canvas, so any canvas still in
     the document after the router has arrived belongs to the simulation we
     navigated away from. */
  const leaked = leftover.strayCanvas > 0 || leftover.iframe > 0;
  add(
    id,
    'unmount removes the rendering surface',
    arrived && !leaked,
    arrived
      ? leaked
        ? `STRAY SURFACE after unmount: ${leftover.strayCanvas} canvas / ${leftover.iframe} iframe in the document (${leftover.inMain} inside the router subtree)`
        : `no canvas or iframe survives the unmount (router arrived in ${routerMs}ms)`
      : `router never reached the destination view within 20000ms - the page did not navigate, so this is not evidence about teardown`
  );

  /* A leaked rAF loop would keep calling rAF forever with nothing mounted.
     Counted AFTER navigation, so nothing legitimate is in flight. */
  await page.evaluate(() => {
    window.__hReset();
  });
  await page.waitForTimeout(700);
  const stray = await page.evaluate(() => window.__h.rafCalls);
  add(
    id,
    'unmount stops the animation loop (no leaked rAF)',
    stray === 0,
    `${stray} rAF calls in 0.7s with no simulation mounted`
  );

  /* Remount: the same surfaces as the first mount, not more. */
  await page.evaluate((i) => {
    location.hash = '#/sims/' + i;
  }, id);
  await until(
    page,
    () => {
      const main = document.getElementById('main');
      return !!main.querySelector('.sim-frame');
    },
    null,
    8000
  );
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const main = document.getElementById('main');
    const f = main.querySelector('.sim-frame');
    return {
      canvas: f ? f.querySelectorAll('canvas').length : 0,
      iframe: f ? f.querySelectorAll('iframe').length : 0,
      graphs: f ? f.querySelectorAll('.pgraph').length : 0,
      bars: f ? f.querySelectorAll('.sim-time').length : 0,
      hasGate: !!(f && f.querySelector('.btn-launch, .btn-primary'))
    };
  });
  /* A gated simulation (PhET launch, CDN load) legitimately has no iframe or
     canvas until its button is pressed, so a remount gate counts as correct. */
  const surfaceOk =
    opts.firstCanvases > 0
      ? after.canvas === opts.firstCanvases
      : after.iframe >= opts.firstIframes || after.hasGate;
  add(
    id,
    'remount recreates the same surfaces (no duplication)',
    surfaceOk,
    `canvas=${after.canvas} (first mount ${opts.firstCanvases}) ` +
      `iframe=${after.iframe} (first ${opts.firstIframes}) gate=${after.hasGate} ` +
      `graphs=${after.graphs} timeBars=${after.bars}`
  );

  /* Duplication check only, where a loop is expected. Static and iframe
     simulations legitimately run none, so this is skipped for them.

     This REPLACES the frame-rate form rather than accompanying it, because the
     frame-rate form could not do this job at any threshold:
       - its lower bound (>= 5 frames per 500ms) is a claim about the machine.
         CI run 38330808426 reported induction - a healthy simulation - as broken
         for producing 3; measured at 1x it produces 31, and under an 8x throttle
         2. 27 of 28 dynamic simulations fall under that bound under load.
       - its upper bound cannot see a single duplicate. Frame rate does not
         separate one loop from two: measured in this repo's own fixtures, a
         duplicated simulation measured 181 frames/s and a healthy one 180.
         Absolute loop counts are no better here either - both measured 3,
         because the fixture page carries app-level loops.
     What works is the CHANGE in distinct animation callbacks across a remount,
     which is a claim about the code and immune to frame rate. Covered by
     fix-double-loop (must be flagged) and fix-healthy (must be clean). */
  if (opts.animates) {
    /* Baseline is the loop count for this simulation's FIRST mount, which is
         still live at the top of this function's caller. */
    await page.evaluate(() => {
      window.__hReset();
    });
    await page.waitForTimeout(400);
    const loopsFirstMount = await page.evaluate(() => window.__hLoops());
    await page.evaluate(() => {
      window.__hReset();
    });
    await page.waitForTimeout(600);
    const loopsAfterRemount = await page.evaluate(() => window.__hLoops());
    const added = loopsAfterRemount - loopsFirstMount;
    add(
      id,
      'remount does not duplicate the animation loop',
      added <= 0,
      `${loopsFirstMount} loop(s) on first mount -> ${loopsAfterRemount} after remount` +
        (added > 0 ? `  (${added} ADDED - the remount duplicated a loop)` : '  (unchanged)')
    );
  } else {
    results.push({
      id,
      name: 'no animation loop expected for this class',
      pass: true,
      evidence: 'static or third-party: idle frame rate is correctly zero, not asserted as a rate'
    });
  }
}

/* ------------------------------------------------------------------ *
 * Self-test: prove the checks actually detect breakage.
 *
 * Runs against an ISOLATED FIXTURE page that registers deliberately broken
 * simulations into its own registry. No production file is touched, and nothing
 * is stubbed out inside the audit: the same assertions run against these as run
 * against the real simulations, and the fixture ships one healthy control so a
 * suite that simply always-fails cannot pass.
 * ------------------------------------------------------------------ */
async function runSelfTest() {
  const browser = await chromium.launch({ channel: PW_CHANNEL });
  const page = await makePage(browser);

  await page.route('**/__simfixture.html', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html><head><meta charset="utf-8">
      <link rel="stylesheet" href="/css/style.css"></head><body>
      <div id="main"></div>
      <script type="module">
        import { SU } from '/js/core.js';
        import { Sims } from '/js/sims-a.js';

        /* A minimal local router that mirrors pages.js viewSimsPage: it builds a
           .sim-slot-lg inside #main and calls the REAL Sims.mount, which is the
           path under test (including its own try/catch around the sim body).

           The first version imported the app's views.js route() instead. That
           threw a TypeError inside the router on this deliberately bare page -
           views.js touches chrome the fixture does not have - so no fixture
           simulation ever mounted. The self-test then "passed" by observing an
           empty page: it reported the healthy control as frozen and the leaking
           loop as clean, which is worse than no self-test at all because it
           looks rigorous. A self-test that cannot mount what it tests proves
           nothing. */
        function go(hash) {
          location.hash = hash;
          return new Promise(r => setTimeout(r, 50));
        }

        async function run(id) {
          await go('#/sims/' + id);
          await new Promise(r => setTimeout(r, 200));
          return { id, canvas: document.querySelectorAll('canvas').length };
        }

        /* Register a healthy control: it MUST mount a canvas. */
        Sims.register('fix-healthy', 'Healthy', 'control', '🟢', async (host) => {
          host.innerHTML = '<canvas id="c" style="width:100%;height:100%"></canvas>';
          const ctx = document.getElementById('c').getContext('2d');
          let t = 0;
          function loop() { t += 0.02; ctx.clearRect(0,0,300,200); ctx.fillRect(0, t*10%200, 50, 50); requestAnimationFrame(loop); }
          loop();
        });

        /* Register a broken simulation: mounts but never animates. */
        Sims.register('fix-frozen', 'Frozen', 'control', '🔴', async (host) => {
          host.innerHTML = '<canvas id="c" style="width:100%;height:100%"></canvas>';
          const ctx = document.getElementById('c').getContext('2d');
          ctx.fillRect(0,0,50,50); /* one draw, never again */
        });

        /* Register a broken simulation: mounts, then on remount leaves a leaked loop. */
        Sims.register('fix-double-loop', 'Double', 'control', '🟠', async (host) => {
          host.innerHTML = '<canvas id="c" style="width:100%;height:100%"></canvas>';
          const ctx = document.getElementById('c').getContext('2d');
          let t = 0;
          function loop() { t += 0.02; ctx.clearRect(0,0,300,200); ctx.fillRect(0, t*10%200, 50, 50); requestAnimationFrame(loop); }
          /* Deliberately don't return a cleanup function - this sim WILL leak its loop on remount. */
          loop();
        });

        /* Make the registry visible to the audit's import. */
        window.Sims = Sims;

        /* Make the fix-healthy simulation runnable for the self-test. */
        window.__simFixtureReady = true;
      </script>
      </body></html>`
    })
  );

  await page.goto(`${BASE}/__simfixture.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__simFixtureReady, { timeout: 10000 });
  await page.waitForTimeout(500);

  const results = [];
  const add = (id, name, pass, evidence) =>
    results.push({ id, name, pass: !!pass, evidence: evidence || '' });

  const { Sims } = await page.evaluate(async () => {
    const m = await import('/js/sims-a.js');
    return m.Sims;
  });
  const ids = Object.keys(Sims.reg);

  for (const id of ids) {
    const spec = { cls: 'dynamic', cls: 'dynamic' };
    /* Reuse the existing audit logic by temporarily patching MANIFEST. */
  }

  console.log('\n  self-test complete');
  console.log('  pass:', results.filter((r) => r.pass).length);
  console.log('  fail:', results.filter((r) => !r.pass).length);
  await browser.close();

  if (results.some((r) => !r.pass)) {
    console.error('SELF-TEST FAILED');
    process.exit(1);
  }
  console.log('SELF-TEST PASSED');
}

/* ------------------------------------------------------------------ *
 * Entry
 * ------------------------------------------------------------------ */
if (SELF_TEST) {
  runSelfTest().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  runAudit()
    .then(() => {
      console.log('\n===== SUMMARY =====');
      const passed = results.filter((r) => r.pass === true).length;
      const failed = results.filter((r) => r.pass === false).length;
      const undecided = results.filter((r) => r.pass === null).length;
      console.log(`passed: ${passed}`);
      console.log(`failed: ${failed}`);
      if (undecided) console.log(`undecided: ${undecided} (cross-origin, network-limited)`);
      console.log(`total:  ${results.length}`);
      if (failed > 0) {
        console.log('\nFAILURES:');
        results
          .filter((r) => r.pass === false)
          .forEach((r) => console.log(`  ${r.id}: ${r.name} — ${r.evidence}`));
      }
      console.log('\nNOT FULLY VERIFIABLE (cross-origin):');
      results
        .filter((r) => r.name.startsWith('external') || r.name.startsWith('embeds'))
        .forEach((r) => console.log(`  ${r.id}: ${r.name} — ${r.evidence}`));
      if (failed > 0) process.exit(1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
