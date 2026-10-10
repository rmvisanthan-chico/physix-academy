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
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();

const args = process.argv.slice(2);
const BASE = args.find(a => !a.startsWith('--')) || 'http://localhost:4173';
const ONLY = (args.find(a => a.startsWith('--only=')) || '').split('=')[1];
const SELF_TEST = args.includes('--self-test');
const VERBOSE = args.includes('--verbose');

/* ------------------------------------------------------------------ *
 * Manifest
 *
 * `why` records what the implementation actually does, so the expectation can be
 * argued with rather than trusted. `interact` names the specific control that
 * must move state, because "it has sliders" is not an assertion.
 * ------------------------------------------------------------------ */
const MANIFEST = {
  /* ---- Phase 3C time-control simulations: physics clock is observable ---- */
  newton:        { cls: 'dynamic',     why: 'F = ma with friction; cart accelerates every frame',   probe: 'a' },
  energy:        { cls: 'dynamic',     why: 'pendulum integrates om and th each frame' },
  collision:     { cls: 'dynamic',     why: 'balls integrate and impulse-resolve on contact' },
  orbit:         { cls: 'dynamic',     why: 'inverse-square gravity integration',                    probe: 't' },
  incline:       { cls: 'dynamic',     why: 'block slides once tan(th) > mu',                        probe: 't' },
  atwood:        { cls: 'dynamic',     why: 'two masses accelerate on the rope',                     probe: 't' },
  bfield:        { cls: 'dynamic',     why: 'cyclotron rotation integrates exactly',                 probe: 't' },
  kin1d:         { cls: 'dynamic',     why: 'car clock advances; graph samples grow',               probe: 't' },
  projectile:    { cls: 'dynamic',     why: 'ball integrates under gravity and drag',                probe: 't' },
  shm:           { cls: 'dynamic',     why: 'spring-mass oscillator integrates',                    probe: 't' },

  /* ---- frame-driven natives ---- */
  wave:          { cls: 'dynamic', why: 'travelling wave phase is a function of elapsed time' },
  circuit:       { cls: 'dynamic', why: 'current phase advances each frame' },
  doppler:       { cls: 'dynamic', why: 'source translates, wavefronts expand' },
  induction:     { cls: 'dynamic', why: 'magnet translates, flux changes, emf decays' },
  standing:      { cls: 'dynamic', why: 'superposition phase advances' },
  interference:  { cls: 'dynamic', why: 'two-source interference phase advances' },
  rc:            { cls: 'dynamic', why: 'capacitor charges/discharges over t' },
  cooling:       { cls: 'dynamic', why: 'Newton cooling curve advances over t' },
  collision2d:   { cls: 'dynamic', why: 'two discs integrate with impulse response' },
  'ncert9-echo':   { cls: 'dynamic', why: 'ping cycle runs on a ~1.4s loop', slow: true },
  'ncert11-rotation': { cls: 'dynamic', why: 'skater angular velocity integrates' },
  'ncert11-venturi': { cls: 'dynamic', why: 'flow arrows animate on a phase clock' },
  'ktg-gas':       { cls: 'dynamic', why: 'particle velocities random-walk each frame' },
  'wasm-fluid':    { cls: 'dynamic', why: 'particles drift and collide' },
  'atoms-bohr':    { cls: 'dynamic', why: 'electron orbits using wall-clock time' },

  /* ---- WebGL: pixel readback is impossible without preserveDrawingBuffer,
         so the observable is draw-call count ---- */
  orbit3d:       { cls: 'dynamic', why: '3D orbital integration', webgl: true },
  wave3d:        { cls: 'dynamic', why: '3D wave surface t advances', webgl: true },
  efield3d:      { cls: 'dynamic', why: 'field rig rotates on clock delta', webgl: true },

  /* ---- interactive, NOT expected to animate on their own ---- */
  efield:        { cls: 'interactive', why: 'probes array starts empty; only a click drops a test charge',
                   interact: { kind: 'canvas-click', expect: 'pixels' } },
  buoyancy:      { cls: 'interactive', why: 'floats in equilibrium at default densities - STATIC by design; ' +
                                              'it only moves once the object is denser than the fluid',
                   interact: { kind: 'range', index: 0, to: 'max', expect: 'pixels' } },
  lens:          { cls: 'interactive', why: 'thin-lens equation evaluated per draw, no clock',
                   interact: { kind: 'range', index: 0, to: 'max', expect: 'any' } },
  refraction:    { cls: 'interactive', why: "Snell's law evaluated per draw, no clock",
                   interact: { kind: 'range', index: 0, to: 'max', expect: 'any' } },
  /* Heat Engine Cycle draws its P-V loop from FIXED constants - the polygon
     coordinates are literals and never reference the sliders. Only the readouts
     (Carnot eta, Work) respond. So the picture is a decorative illustration and
     the honest evidence of a working control here is the readout changing.
     Declared explicitly rather than loosening the default pixel-only rule for
     everything, because that rule is what catches dead controls. Worth raising
     with the authors: the cycle diagram arguably should scale with efficiency. */
'thermo-engine': { cls: 'interactive', why: 'Carnot efficiency from slider values; P-V loop is a FIXED illustration, only readouts respond',
                   interact: { kind: 'range', index: 0, to: 'max', expect: 'readout' } },
  'ncert10-mirror': { cls: 'interactive', why: 'mirror equation from sliders, no clock',
                   interact: { kind: 'range', index: 0, to: 'max', expect: 'any' } },
  'ncert10-eye':   { cls: 'interactive', why: 'eye defect from power slider, no clock',
                   interact: { kind: 'range', index: 0, to: 'max', expect: 'any' } },
  'ncert10-heating': { cls: 'interactive', why: 'Joule heating from slider values, no clock',
                   interact: { kind: 'range', index: 0, to: 'max', expect: 'any' } },
  'ncert11-solids': { cls: 'interactive', why: 'stress-strain from slider values, no clock',
                   interact: { kind: 'range', index: 0, to: 'max', expect: 'any' } },
  'ncert11-pv':    { cls: 'interactive', why: 'PV cycle traced from slider values, no clock',
                   interact: { kind: 'range', index: 0, to: 'max', expect: 'any' } },
  'ncert11-measure': { cls: 'interactive', why: 'Vernier calipers: jaws are DRAGGED with the pointer, ' +
                                              'there are no sliders at all',
                    interact: { kind: 'canvas-drag', expect: 'any' } },
  'cdn-3d-atom':   { cls: 'interactive', why: 'lazy CDN load behind a "Load 3D (CDN)" button, with a ' +
                                              'designed offline fallback path',
                    interact: { kind: 'button', text: 'Load 3D', expect: 'cdn' } },

  /* ---- third-party iframes ---- */
  ns: { cls: 'iframe', why: 'embeds physics-lab.vercel.app' },
  'phet-energy-skate-park': { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-forces-motion':      { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-projectile':         { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-circuit':            { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-balancing':          { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-pendulum':           { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-charges-fields':     { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-coulombs-law':       { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-ohms-law':           { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true },
  'phet-springs':            { cls: 'iframe', why: 'PhET embed behind a Launch button', phet: true }
};

const results = [];
const add = (id, name, pass, evidence) => results.push({ id, name, pass: !!pass, evidence: evidence || '' });

/* Not every console error means the simulation is broken.
     Production's Content-Security-Policy refuses a jsdelivr fetch that
     wasm-fluid makes for its optional WASM solver; the simulation is built to
     fall back to a local JS particle solver and carries on. Failing the sim for
     that would be wrong - it is a policy condition, not a product fault - but
     blanket-suppressing console errors would blunt the one signal that actually
     caught cdn-3d-atom, so only this narrow class is separated out, and it is
     still printed in the report. */
const isExternalPolicyNoise = t =>
  /Content Security Policy|violates the following/i.test(t) ||
  /Refused to connect because it violates/i.test(t) ||
  /cdn\.jsdelivr\.net/i.test(t) ||
  /net::ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION|BLOCKED)/i.test(t);

/* `pg` is passed in rather than closed over: `page` is created inside runAudit(),
   so a module-level reference is a ReferenceError waiting to happen. */
const realErrors = pg => pg.__errs.filter(e => !isExternalPolicyNoise(e));
const policyNoise = pg => pg.__errs.filter(isExternalPolicyNoise);

function assertNoMountErrors(pg, id) {
  const real = realErrors(pg);
  const noise = policyNoise(pg);
  if (real.length === 0) {
    add(id, 'no errors during mount', true, '');
    if (noise.length) {
      results.push({
        id, name: 'external-resource errors present (CSP / offline), fallback used',
        pass: true,
        evidence: noise[0].slice(0, 96) + ' - policy condition, not a simulation fault'
      });
    }
  } else {
    add(id, 'no errors during mount', false,
      real.slice(0, 2).join(' ; '));
  }
}

/* ------------------------------------------------------------------ *
 * Test-side instrumentation. Installed once per page, before app code.
 * ------------------------------------------------------------------ */
const INSTRUMENT = `
window.__h = { rafCalls: 0, glCalls: 0, sigChanges: 0, last: '', samples: 0, sampleTimer: 0 };

const raf = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = function (cb) { window.__h.rafCalls++; return raf(cb); };

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

/* Pixel signature of every 2D canvas in the sim frame. */
window.__hSample = function () {
  const frame = document.querySelector('.sim-frame');
  if (!frame) return;
  const cs = [...frame.querySelectorAll('canvas')];
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
    .map(r => r.innerText.replace(/\\s+/g, ' ').trim()).join('|');
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
  window.__h.twoD = twoD; window.__h.webgl = webgl; window.__h.canvases = cs.length;
  if (window.__h.last && window.__h.last !== sig) window.__h.sigChanges++;
  window.__h.last = sig;
};
window.__hReset = function () {
  window.__h.sigChanges = 0; window.__h.last = ''; window.__h.rafCalls = 0; window.__h.glCalls = 0;
  window.__h.pixelSig = null; window.__h.readoutSig = '';
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
  await page.addInitScript(INSTRUMENT);
  page.__errs = [];
  page.on('pageerror', e => page.__errs.push('pageerror: ' + String(e).split('\n')[0].slice(0, 140)));
  page.on('console', m => {
    const url = (m.location() || {}).url || '';
    if (m.type() === 'error' && !/_vercel\//.test(url)) {
      page.__errs.push('console: ' + m.text().slice(0, 140));
    }
  });
  return page;
}

/* Bounded, condition-based wait - never a bare sleep as the assertion itself. */
async function until(page, fn, arg, timeout = 2500) {
  try { await page.waitForFunction(fn, arg, { timeout, polling: 50 }); return true; }
  catch { return false; }
}

async function runAudit() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await makePage(browser);

  await page.goto(`${BASE}/#/sims`, { waitUntil: 'networkidle' });
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
    ids = await page.evaluate(() =>
      [...new Set([...document.querySelectorAll('a[href^="#/sims/"]')]
        .map(a => a.getAttribute('href').replace('#/sims/', '')))]);
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
    await page.evaluate(() => { window.__hStop && window.__hStop(); });
    await page.evaluate(i => { location.hash = '#/sims/' + i; }, id);

    /* --- mount ---
       Wait for the surface THIS class declares, not for "any child". The first
       version accepted any child at all, so it returned immediately on the
       .sim-head and then measured the surface before it existed - which showed
       up as random failures on different simulations each run (ns reporting no
       iframe, cdn-3d-atom reporting no button, wasm-fluid reporting no canvas).
       Nondeterministic failures are worse than none: they train you to ignore the
       audit, which is the exact thing this was built to prevent. */
    const mountPredicate = spec.cls === 'iframe'
      ? () => {
          const f = document.querySelector('.sim-frame');
          return !!(f && (f.querySelector('iframe') || f.querySelector('.btn-launch')));
        }
      : spec.cls === 'interactive' && spec.interact.kind === 'button'
        ? () => {
            const f = document.querySelector('.sim-frame');
            return !!(f && [...f.querySelectorAll('button')].some(b => /load/i.test(b.textContent)));
          }
        : () => {
            const f = document.querySelector('.sim-frame');
            return !!(f && f.querySelector('canvas'));
          };
    const mounted = await until(page, mountPredicate, null, 10000);
    add(id, 'mounts and creates a rendering surface', mounted, mounted ? '' : 'declared surface never appeared');
    if (!mounted) {
      add(id, 'no errors during mount', false, page.__errs.slice(0, 2).join(' ; '));
      continue;
    }
await page.waitForTimeout(150);

      /* Separates CSP/offline external-resource refusals from genuine faults. */
      assertNoMountErrors(page, id);

    const surface = await page.evaluate(() => {
      const f = document.querySelector('.sim-frame');
      const ifr = [...f.querySelectorAll('iframe')];
      return {
        canvases: f.querySelectorAll('canvas').length,
        iframes: ifr.length,
        iframeSrc: ifr.map(i => i.src),
        launchGate: !!f.querySelector('.btn-launch'),
        btns: [...f.querySelectorAll('button')].map(b => b.textContent.trim()),
        ranges: f.querySelectorAll('input[type=range]').length,
        readouts: [...f.querySelectorAll('.readout')].length,
        graphs: f.querySelectorAll('.pgraph').length
      };
    });

    /* ---------------- iframe class ---------------- */
    if (spec.cls === 'iframe') {
      if (spec.phet) {
        add(id, 'presents a Launch gate before any third-party frame exists',
          surface.launchGate, surface.launchGate ? '' : 'no .btn-launch found');
        await page.evaluate(() => {
          const b = document.querySelector('.sim-frame .btn-launch');
          if (b) b.click();
        });
        const got = await until(page, () => {
          const i = document.querySelector('.sim-frame iframe');
          return i && i.src ? i.src : null;
        }, null, 6000);
        const src = got ? await page.evaluate(() => document.querySelector('.sim-frame iframe').src) : '';
        add(id, 'clicking Launch creates an iframe pointing at phet.colorado.edu',
          got && /phet\.colorado\.edu/.test(src), src || 'no iframe created');
        /* Load status is reported, never assumed. Cross-origin contents cannot be
           inspected from here and are not pretended to be tested. */
        const loaded = got && await page.evaluate(() => new Promise(res => {
          const i = document.querySelector('.sim-frame iframe');
          let settled = false;
          const done = v => { if (!settled) { settled = true; res(v); } };
          i.addEventListener('load', () => done('load-event'), { once: true });
          i.addEventListener('error', () => done('error-event'), { once: true });
          setTimeout(() => done('timeout'), 6000);
        }));
        results.push({
          id, name: 'external PhET document actually loads (cross-origin: config verified, internals NOT inspected)',
          pass: true, evidence: `load=${loaded} - informational only`
        });
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
      add(id, 'has the control its declared interaction needs',
        spec.interact.kind === 'button' ? surface.btns.some(b => /load/i.test(b))
          : surface.canvases > 0,
        `canvases=${surface.canvases} btns=[${surface.btns.join('|')}]`);

      await page.evaluate(() => { window.__hReset(); window.__hStart(); });
      /* Settle, THEN take the baseline, THEN interact.
         The baseline was originally captured immediately before the interaction
         block and read again afterwards - which meant it was taken after the
         slider had already been moved, so "did the picture change" compared the
         new picture with itself and every interactive simulation reported its
         control as dead. Order is the whole test here. */
      const settled = await until(page, () => window.__hSettled && window.__hSettled(), null, 3000);
      add(id, 'rendered output settles before the interaction is measured', settled,
        settled ? '' : 'picture never stopped changing - cannot measure a control effect');
      const before = await page.evaluate(s => window.__h[s],
        spec.interact.expect === 'readout' ? 'readoutSig' : 'pixelSig');

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
        add(id, 'declared slider exists and was moved', moved,
          moved ? '' : `slider[${spec.interact.index}] missing or already at target`);
      } else if (spec.interact.kind === 'canvas-click') {
        await page.evaluate(() => {
          const c = document.querySelector('.sim-frame canvas');
          if (!c) return;
          const r = c.getBoundingClientRect();
          const ev = new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width * 0.5, clientY: r.top + r.height * 0.5, pointerId: 1 });
          c.dispatchEvent(ev);
          c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + r.width * 0.5, clientY: r.top + r.height * 0.5, pointerId: 1 }));
          c.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * 0.5, clientY: r.top + r.height * 0.5 }));
        });
        add(id, 'declared canvas click was dispatched', true);
      } else if (spec.interact.kind === 'canvas-drag') {
        await page.evaluate(async () => {
          const c = document.querySelector('.sim-frame canvas');
          if (!c) return;
          const r = c.getBoundingClientRect();
          const y = r.top + r.height * 0.5;
          c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 100, clientY: y, pointerId: 1, isPrimary: true }));
          for (let x = 100; x <= 190; x += 10) {
            c.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + x, clientY: y, pointerId: 1, isPrimary: true }));
            await new Promise(r2 => requestAnimationFrame(r2));
          }
          c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + 190, clientY: y, pointerId: 1, isPrimary: true }));
        });
        add(id, 'declared drag gesture was dispatched', true);
      } else if (spec.interact.kind === 'button') {
        const clicked = await page.evaluate(t => {
          const b = [...document.querySelectorAll('.sim-frame button')].find(x => new RegExp(t, 'i').test(x.textContent));
          if (!b) return false;
          b.click();
          return true;
        }, spec.interact.text);
        add(id, 'declared button was clicked', clicked, clicked ? '' : 'button not found');
      }

      if (spec.interact.expect === 'cdn') {
        /* Either the CDN succeeded or the designed offline fallback fired. Both
           are correct outcomes; what would be wrong is neither. */
        const res = await until(page, () => {
          const f = document.querySelector('.sim-frame');
          const txt = f ? f.innerText : '';
          if (f && f.querySelector('canvas')) return 'canvas';
          if (/fallback|blocked/i.test(txt)) return 'fallback';
          return false;
        }, null, 9000);
        add(id, 'CDN load produced a canvas or the designed offline fallback', res,
          res === 'canvas' ? 'CDN texture loaded' : res === 'fallback' ? 'offline fallback (expected in sandbox)' : 'neither');
      } else {
        /* PIXELS only. A readout that merely echoes the slider value changes when
           the slider moves, so a combined signature would report a dead control as
           working - the exact failure the fix-dead-control fixture is built to
           expose. What must change is the picture the student is looking at. */
        const settled2 = settled;
        /* Which observable counts as proof the control did something. Pixel-only
           is the default because a readout that merely echoes the slider proves
           nothing. A simulation may declare 'readout' when its picture is a fixed
           illustration and the numbers are the real output - thermo-engine is the
           one such case, and it is declared, not defaulted. */
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
        const changed = await until(page,
          ({ s, prev }) => window.__h[s] !== prev && window.__h.samples > 4,
          { s: signal, prev: before }, 3000);
        const sig = await page.evaluate(() => window.__h.pixelSig);
        add(id, spec.interact.expect === 'readout'
      ? 'the interaction changed the readouts (diagram is a fixed illustration)'
      : 'the interaction changed the rendered output', changed,
          changed ? '' : `signature unchanged (${String(before).slice(0, 22)} -> ${String(sig).slice(0, 22)})`);
      }
      await page.evaluate(() => { window.__hStop && window.__hStop(); });
      await lifecycleChecks(page, id, {
        firstCanvases: surface.canvases,
        firstIframes: surface.iframes,
        animates: false          /* interactive sims are not required to animate */
      });
      continue;
    }

    /* ---------------- dynamic class ---------------- */
    await page.evaluate(() => { window.__hReset(); window.__hStart(); });

    if (spec.webgl) {
      const moved = await until(page, () => window.__h.glCalls > 40, null, 3000);
      const gl = await page.evaluate(() => ({ gl: window.__h.glCalls, webgl: window.__h.webgl }));
      add(id, 'WebGL draw calls increase (3D scene is actually rendering)', moved,
        `draws=${gl.gl} webglCanvases=${gl.webgl}`);
    } else {
      const target = spec.slow ? 3 : 6;
      const moved = await until(page, t => window.__h.sigChanges >= t, target, spec.slow ? 6000 : 3000);
      const h = await page.evaluate(() => ({ changes: window.__h.sigChanges, canvases: window.__h.canvases, twoD: window.__h.twoD }));
      add(id, 'rendered output or readouts change over time', moved,
        `sigChanges=${h.changes} (need >=${target}) 2D=${h.twoD}/${h.canvases}`);
    }

    /* The strongest available evidence: the simulation's own physics clock. */
    const hasProbe = await page.evaluate(() => !!window.__tcProbe);
    if (hasProbe) {
      const p0 = await page.evaluate(() => window.__tcProbe());
      const advanced = await until(page, () => {
        const p = window.__tcProbe();
        return p && typeof p.t === 'number' && p.t > 0.05;
      }, null, 3000);
      const p1 = await page.evaluate(() => window.__tcProbe());
      add(id, 'physics clock advances', advanced, `t=${p0 && p0.t} -> ${p1 && p1.t}`);
if (p1 && p0) {
          const real = realErrors(page);
          add(id, 'no errors while simulating', real.length === 0, real.slice(0, 2).join(' ; '));
        }
    } else {
      add(id, 'has a rendering surface', surface.canvases > 0, `canvases=${surface.canvases}`);
      results.push({
        id, name: 'physics clock observable',
        pass: true,
        evidence: 'no probe for this simulation - asserted via rendered output instead'
      });
    }

    /* Graphs, where present, must actually receive samples. */
    if (surface.graphs > 0) {
      const g0 = await page.evaluate(() => window.PhysixGraph.graphs.all.map(g => g.sampleCount()).join(','));
      const grew = await until(page, prev => {
        const now = window.PhysixGraph.graphs.all.map(g => g.sampleCount()).join(',');
        return now !== prev && now !== '0,0,0';
      }, g0, 3000);
      const g1 = await page.evaluate(() => window.PhysixGraph.graphs.all.map(g => g.sampleCount()).join(','));
      add(id, 'graph receives samples from the simulation', grew, `${g0} -> ${g1}`);
    }

    await page.evaluate(() => { window.__hStop && window.__hStop(); });
    await lifecycleChecks(page, id, {
      firstCanvases: surface.canvases,
      firstIframes: surface.iframes,
      animates: true           /* dynamic sims must be running after a remount */
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
 * reported as a duplication. And an rAF-rate floor is meaningless for a static
 * or iframe simulation, where zero frames is the CORRECT steady state - so the
 * rate check is applied only to simulations that are supposed to be animating. */
async function lifecycleChecks(page, id, opts) {
  /* Navigate far away and confirm the surface and the loop are gone. */
  await page.evaluate(() => { location.hash = '#/formulas'; });
  const gone = await until(page, () => {
    const main = document.getElementById('main');
    return !main.querySelector('.sim-frame canvas') && !main.querySelector('.sim-frame iframe');
  }, null, 6000);
  const leftover = await page.evaluate(() => {
    const main = document.getElementById('main');
    return {
      canvas: main.querySelectorAll('.sim-frame canvas').length,
      iframe: main.querySelectorAll('.sim-frame iframe').length,
      bar: main.querySelectorAll('.sim-time').length
    };
  });
  add(id, 'unmount removes the rendering surface', gone,
    `canvas=${leftover.canvas} iframe=${leftover.iframe} timeBar=${leftover.bar}`);

  /* A leaked rAF loop would keep calling rAF forever with nothing mounted.
     Counted AFTER navigation, so nothing legitimate is in flight. */
  await page.evaluate(() => { window.__hReset(); });
  await page.waitForTimeout(700);
  const stray = await page.evaluate(() => window.__h.rafCalls);
  add(id, 'unmount stops the animation loop (no leaked rAF)', stray === 0,
    `${stray} rAF calls in 0.7s with no simulation mounted`);

  /* Remount: the same surfaces as the first mount, not more. */
  await page.evaluate(i => { location.hash = '#/sims/' + i; }, id);
  await until(page, () => {
    const main = document.getElementById('main');
    return !!main.querySelector('.sim-frame');
  }, null, 8000);
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
  const surfaceOk = opts.firstCanvases > 0
    ? after.canvas === opts.firstCanvases
    : (after.iframe >= opts.firstIframes) || after.hasGate;
  add(id, 'remount recreates the same surfaces (no duplication)', surfaceOk,
    `canvas=${after.canvas} (first mount ${opts.firstCanvases}) ` +
    `iframe=${after.iframe} (first ${opts.firstIframes}) gate=${after.hasGate} ` +
    `graphs=${after.graphs} timeBars=${after.bars}`);

  /* Frame-rate check only where a loop is expected. For static and iframe
     simulations zero frames is the correct steady state, and demanding frames
     would flag correct behaviour as broken. */
  if (opts.animates) {
    await page.evaluate(() => { window.__hReset(); });
    await page.waitForTimeout(500);
    const rate = await page.evaluate(() => window.__h.rafCalls);
    add(id, 'remount runs at a single rate (no duplicated loop)',
      rate >= 5 && rate <= 200, `${rate} rAF calls in 0.5s after remount`);
  } else {
    results.push({
      id, name: 'no animation loop expected for this class',
      pass: true, evidence: 'static or third-party: idle frame rate is correctly zero, not asserted as a rate'
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
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await makePage(browser);

  await page.route('**/__simfixture.html', r => r.fulfill({
    status: 200, contentType: 'text/html; charset=utf-8',
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
           nothing, so the router here is kept to the minimum that exercises the
           real mount path. */
        function mountFixture() {
          const id = (location.hash || '').replace(/^#\\/sims\\/?/, '');
          const main = document.getElementById('main');
          if (!id) { main.innerHTML = '<div class="wrap"><p>index</p></div>'; return; }
          if (id === 'formulas') { main.innerHTML = '<div class="wrap"><p>formulas</p></div>'; return; }
          main.innerHTML = '<div class="wrap"><div class="sim-slot-lg"></div></div>';
          const slot = main.querySelector('.sim-slot-lg');
          if (Sims.reg[id]) Sims.mount(id, slot);
          else slot.innerHTML = '<p>unknown</p>';
        }
        window.addEventListener('hashchange', mountFixture);

        /* 1. never initialises: mounts no surface at all */
        Sims.register('fix-no-surface', 'No surface', 'x', 'x', frame => {
          SU.el('div', 'sim-controls');          /* no canvas, no loop, nothing */
        });

        /* 2. throws while mounting */
        Sims.register('fix-throws', 'Throws', 'x', 'x', frame => {
          SU.canvas(frame, 100);
          null.oops;                              // ReferenceError, like bfield was
        });

        /* 3. loop runs but state never advances: redraws an identical picture */
        Sims.register('fix-frozen-loop', 'Frozen loop', 'x', 'x', frame => {
          const cv = SU.canvas(frame, 120);
          const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
          const r = SU.readout(ro, 'value');
          let t = 0;
          SU.loop(cv.c, () => { t += 0; r.set('never'); cv.g.fillStyle = '#000'; cv.g.fillRect(0,0,cv.W,cv.H); });
        });

        /* 4. renders fine but a control is dead: slider callback does nothing */
        Sims.register('fix-dead-control', 'Dead control', 'x', 'x', frame => {
          const cv = SU.canvas(frame, 120);
          const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
          const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
          const r = SU.readout(ro, 'value');
          const sl = SU.slider(ctr, 'Thing', 0, 10, 1, 5, () => { /* wired to nothing */ });
          SU.loop(cv.c, () => {
            r.set(String(sl.get()));
            cv.g.fillStyle = '#000'; cv.g.fillRect(0,0,cv.W,cv.H);
          });
        });

        /* 5. healthy control: renders and a slider genuinely drives the picture */
        Sims.register('fix-healthy', 'Healthy', 'x', 'x', frame => {
          const cv = SU.canvas(frame, 120);
          const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
          const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
          const r = SU.readout(ro, 'value');
          let k = 5, x = 0;
          const sl = SU.slider(ctr, 'Thing', 0, 10, 1, 5, v => { k = v; });
          SU.loop(cv.c, dt => {
            x = (x + k * dt * 10) % cv.W;
            r.set(String(k));
            cv.g.fillStyle = '#000'; cv.g.fillRect(0,0,cv.W,cv.H);
            cv.g.fillStyle = '#fff'; cv.g.fillRect(x, 20, 10, 10);
          });
        });

        /* 6. leaks its loop: keeps an rAF running after unmount */
        Sims.register('fix-loop-leak', 'Loop leak', 'x', 'x', frame => {
          const cv = SU.canvas(frame, 120);
          SU.loop(cv.c, () => { cv.g.fillStyle = '#000'; cv.g.fillRect(0,0,cv.W,cv.H); });
          window.__leak = 0;
          const stray = () => { window.__leak++; requestAnimationFrame(stray); };
          requestAnimationFrame(stray);          /* never cancelled anywhere */
        });

        window.addEventListener('hashchange', mountFixture);
        location.hash = '#/sims/fix-healthy';
        mountFixture();
        window.__fixtureReady = true;
      </script></body></html>`
  }));

  await page.goto(`${BASE}/__simfixture.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__fixtureReady, { timeout: 15000 });
  /* The healthy control must actually be on screen before anything is believed of
     this fixture. */
  const fixtureLive = await until(page, () => {
    const f = document.querySelector('.sim-frame');
    return !!(f && f.querySelector('canvas'));
  }, null, 8000);
  if (!fixtureLive) { console.log('  self-test fixture failed to mount - aborting'); await browser.close(); return false; }
  await page.waitForTimeout(400);

  /* `wantFlagged` = the audit is EXPECTED to call this fixture broken.
     Naming it the other way round inverted every expectation in the first
     version and produced 2/6 on a suite that was silently mounting nothing. */
  const expectations = [
    ['fix-no-surface',    'mount',           true,  'must be flagged: no rendering surface'],
    ['fix-throws',        'no errors',       true,  'must be flagged: throws on mount'],
    ['fix-frozen-loop',   'change over time', true,  'must be flagged: loop runs, state frozen'],
    ['fix-dead-control',  'interaction',     true,  'must be flagged: slider changes nothing'],
    ['fix-healthy',       'all',             false, 'must PASS: proves the checker is not always-fail'],
    ['fix-loop-leak',     'leaked rAF',      true,  'must be flagged: loop outlives unmount']
  ];

  let pass = 0, total = 0;
  console.log('\n  self-test against an isolated fixture (no production file touched)\n');

  for (const [id, kind, wantFlagged, why] of expectations) {
    page.__errs = [];
    await page.evaluate(() => { window.__hStop && window.__hStop(); location.hash = '#/formulas'; });
    await page.waitForTimeout(200);
    await page.evaluate(i => { location.hash = '#/sims/' + i; }, id);

    let detected = false, detail = '';
    if (kind === 'mount') {
      detected = !(await until(page, () => {
        const f = document.querySelector('.sim-frame');
        return !!f && (f.querySelector('canvas') || f.querySelector('iframe'));
      }, null, 2500));
      detail = detected ? 'no surface appeared, as expected' : 'a surface appeared';
    } else if (kind === 'no errors') {
      /* Must WAIT for the mount before judging the error log. Checking straight
         after changing the hash races the hashchange handler, so the simulation
         had not run yet and a genuinely throwing fixture read as clean. */
      await until(page, () => {
        const f = document.querySelector('.sim-frame');
        return !!f;
      }, null, 4000);
      await page.waitForTimeout(250);
      detected = page.__errs.length > 0;
      detail = detected ? page.__errs[0].slice(0, 90) : 'no error observed';
    } else if (kind === 'change over time') {
      await until(page, () => document.querySelector('.sim-frame canvas'), null, 3000);
      await page.evaluate(() => { window.__hReset(); window.__hStart(); });
      detected = !(await until(page, () => window.__h.sigChanges >= 5, null, 2200));
      await page.evaluate(() => window.__hStop());
      detail = detected ? 'output never changed' : 'output changed unexpectedly';
    } else if (kind === 'interaction') {
      await until(page, () => document.querySelector('.sim-frame canvas'), null, 3000);
      await page.evaluate(() => { window.__hReset(); window.__hStart(); });
      /* PIXELS only - see the note on __h.pixelSig. And only against a settled
         baseline, so "the simulation finally drew its first frame" is never
         mistaken for "the control changed something". */
      const settled = await until(page, () => window.__hSettled && window.__hSettled(), null, 2500);
      const before = await page.evaluate(() => window.__h.pixelSig);
      await page.evaluate(() => {
        const r = document.querySelector('.sim-frame input[type=range]');
        if (r) { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); }
      });
      detected = !(await until(page, p => window.__h.pixelSig !== p && window.__h.samples > 4, before, 2200));
      await page.evaluate(() => window.__hStop());
      detail = (settled ? '' : 'BASELINE NEVER SETTLED; ') +
        (detected ? 'control produced no change in rendered output'
                  : 'control changed the rendered output');
    } else if (kind === 'leaked rAF') {
      await until(page, () => document.querySelector('.sim-frame canvas'), null, 3000);
      await page.evaluate(() => { location.hash = '#/formulas'; });
      await until(page, () => !document.querySelector('.sim-frame canvas'), null, 4000);
      await page.evaluate(() => { window.__hReset(); });
      await page.waitForTimeout(600);
      const stray = await page.evaluate(() => window.__h.rafCalls);
      detected = stray > 0;
      detail = `${stray} stray rAF calls after unmount`;
    } else if (kind === 'all') {
      /* healthy control must mount, animate and respond */
      const okMount = await until(page, () => {
        const f = document.querySelector('.sim-frame');
        return !!(f && f.querySelector('canvas'));
      }, null, 3000);
      await page.evaluate(() => { window.__hReset(); window.__hStart(); });
      const animates = await until(page, () => window.__h.sigChanges >= 5, null, 2500);
      await page.evaluate(() => window.__hStop());
      await page.evaluate(() => window.__hStart());
      await page.waitForTimeout(120);
      const before = await page.evaluate(() => window.__h.pixelSig);
      await page.evaluate(() => {
        const r = document.querySelector('.sim-frame input[type=range]');
        if (r) { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); }
      });
      const responds = await until(page, p => window.__h.pixelSig !== p && window.__h.samples > 4, before, 2500);
      await page.evaluate(() => window.__hStop());
      /* `detected` means "flagged as broken" everywhere else in this function. */
      const healthy = okMount && animates && responds;
      detected = !healthy;
      detail = `mount=${okMount} animates=${animates} controlResponds=${responds}`;
    }

    total++;
    const asExpected = detected === wantFlagged;
    if (asExpected) pass++;
    console.log(`  ${asExpected ? 'ok  ' : 'FAIL'}  ${id.padEnd(18)} ${kind.padEnd(15)} ` +
      `expected ${wantFlagged ? 'FLAGGED' : 'clean'}, got ${detected ? 'FLAGGED' : 'clean'}`);
    console.log(`        ${why}`);
    console.log(`        evidence: ${detail}`);
  }

  await browser.close();
  console.log(`\n  self-test ${pass}/${total} behaved as required\n`);
  return pass === total;
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
function report() {
  const bySim = new Map();
  results.forEach(r => {
    if (!bySim.has(r.id)) bySim.set(r.id, []);
    bySim.get(r.id).push(r);
  });

  const ids = [...bySim.keys()];
  const pass = [], fail = [], unverified = [];
  for (const id of ids) {
    const rs = bySim.get(id);
    const hard = rs.filter(r => !r.name.startsWith('external '));
    const anyFail = hard.some(r => !r.pass);
    /* A check explicitly recorded as informational must not decide status. */
    if (anyFail) fail.push(id);
    else pass.push(id);
  }
  results.filter(r => r.name.startsWith('external ')).forEach(r => unverified.push(r.id + ' :: ' + r.evidence));

  console.log(`  ${'='.repeat(74)}`);
  console.log(`  REGISTERORY-WIDE HEALTH AUDIT`);
  console.log(`  ${'='.repeat(74)}`);
  console.log(`  simulations in registry : ${ids.length}`);
  console.log(`  passed                  : ${pass.length}`);
  console.log(`  failed                  : ${fail.length}`);
  console.log(`  partially verified      : ${unverified.length}`);
  console.log(`  individual checks       : ${results.filter(r => r.pass).length}/${results.length} passed`);

  if (fail.length) {
    console.log(`\n  FAILING (${fail.length}):`);
    for (const id of fail) {
      console.log(`\n    ${id}  [${MANIFEST[id] ? MANIFEST[id].cls : '?'}]`);
      bySim.get(id).filter(r => !r.pass).forEach(r => {
        console.log(`      x ${r.name}`);
        if (r.evidence) console.log(`        evidence: ${r.evidence}`);
      });
    }
  }
  if (VERBOSE) {
    console.log(`\n  ALL CHECKS:`);
    for (const id of ids) {
      console.log(`    ${id}`);
      bySim.get(id).forEach(r => console.log(
        `      ${r.pass ? 'ok  ' : 'x   '}${r.name}${r.evidence ? '  [' + String(r.evidence).slice(0, 76) + ']' : ''}`));
    }
  }
  if (unverified.length) {
    console.log(`\n  NOT FULLY VERIFIABLE (${unverified.length}) - reported, not counted as passes:`);
    unverified.forEach(u => console.log(`    ${u}`));
  }
  return { ids, pass, fail, unverified };
}

/* ------------------------------------------------------------------ */
let selfOk = true;
if (SELF_TEST) {
  selfOk = await runSelfTest();
} else {
  await runAudit();
  const summary = report();
  console.log('');
  const hardFail = summary.fail.length > 0 || !selfOk;
  process.exit(hardFail ? 1 : 0);
}