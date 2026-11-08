/* PhysiX Academy — Simulation Design System (sim-transform, Phase B)
   ------------------------------------------------------------
   The shared "research workstation" chrome that every transformed simulation
   adopts in Phase C/D. One file owns three things:

     1. SimApps    — the real-world application behind each of the 40
                     PhysiX-built simulations (the "application engine":
                     every sim is anchored to where the physics actually
                     works in the real world), plus its intended rendering
                     class ('3d' real apparatus / '2d' premium instrument /
                     'hybrid' both).
     2. SimQuality — device-aware rendering policy (LOW / MED / HIGH / AUTO).
                     Pure heuristics, no dependencies: display density, CPU
                     count and mobile detection decide the tier; each tier
                     maps to concrete rendering settings (shadows,
                     antialias, environment resolution, particle budget).
     3. Workstation— the chrome builder. It owns the header (title, topic,
                     level, real-world application chip), the main viewport,
                     the side panel (presets / controls / live measurements /
                     rendering quality), the transport (play, pause, step,
                     reset, speed) and the bottom strip (graphs from the
                     existing Graph engine + the Predict → Observe → Reason
                     slot from the existing prediction system).

   Physics lives in the simulation, not here. Workstation only moves the
   clock: it advances a sim time `t` by dt * speed while playing, then asks
   the scene to `update(dt, t)` and `draw()`. A scene that needs its own
   fixed-timestep integrator does it inside `update`, exactly like today's
   simulations — the workstation never touches the physics state directly
   (only via the scene's `reset()`).

   This file is UI + policy only. It imports nothing that is not already in
   the app: core.js, utils.js, graph-engine.js, prediction.js.
*/
import { SU, pxArrow, pxLabel } from './core.js';
import { esc } from './utils.js';
import { Graph } from './graph-engine.js';

'use strict';

/* ============================================================
   1. REAL-WORLD APPLICATION MAP
   ------------------------------------------------------------
   One entry per in-app simulation id (40 after the PhET/ns removal).
   `mode` is the intended rendering treatment from the hybrid decision:
     '3d'    — a real apparatus exists (track, tank, cylinder, orbit);
               build it as a 3D scene the student can fly around.
     '2d'    — the concept is inherently planar (a diagram, a profile,
               a field on paper); give it a premium 2D instrument.
     'hybrid'— both views earn their place (real scene + cutaway).
   Phase C/D uses this map for the header chip, the view switcher and the
   environment design; it is data, not behaviour.
   ============================================================ */
export const SimApps = {
  newton: { app: 'EV acceleration test track', icon: '⚡', mode: 'hybrid' },
  energy: { app: 'Swing-ride & coaster energy rig', icon: '🎢', mode: 'hybrid' },
  collision: { app: 'Highway crash-test barrier', icon: '🚗', mode: '2d' },
  orbit: { app: 'ISS & satellite operations', icon: '🛰️', mode: '3d' },

  wave: { app: 'Ripple tank', icon: '🌊', mode: '2d' },
  circuit: { app: 'Grid substation bench', icon: '🔌', mode: '2d' },
  bfield: { app: 'Cyclotron / particle accelerator', icon: '🧲', mode: '3d' },
  kin1d: { app: 'Radar speed-tracking lab', icon: '📡', mode: '2d' },

  projectile: { app: 'Rocket trajectory test range', icon: '🚀', mode: '3d' },
  shm: { app: 'Car suspension tuning', icon: '🚙', mode: '2d' },
  doppler: { app: 'Medical ultrasound & police radar', icon: '🚑', mode: '2d' },

  efield: { app: 'Charged-particle beam line', icon: '⚛️', mode: '2d' },
  induction: { app: 'Industrial generator stator', icon: '🏭', mode: '3d' },
  lens: { app: 'Camera optics bench', icon: '📷', mode: '2d' },

  incline: { app: 'Cargo ramp & construction site', icon: '🏗️', mode: '3d' },
  atwood: { app: 'Crane & elevator cable', icon: '🏢', mode: '2d' },
  standing: { app: 'Guitar string & instrument design', icon: '🎸', mode: '2d' },
  interference: { app: 'Noise-cancelling headphones', icon: '🎧', mode: '2d' },
  refraction: { app: 'Fibre-optic cable (total internal reflection)', icon: '🔦', mode: '2d' },
  buoyancy: { app: 'Ship & submarine design', icon: '🚢', mode: '3d' },
  rc: { app: 'Camera flash & power electronics', icon: '📸', mode: '2d' },
  cooling: { app: 'CPU heat-sink design', icon: '💻', mode: '2d' },
  collision2d: { app: 'Billiards sports physics', icon: '🎱', mode: '3d' },

  'thermo-engine': { app: 'Power-plant cylinder (Carnot limit)', icon: '♨️', mode: '3d' },
  'ktg-gas': { app: 'Engine cylinder & tyre pressure', icon: '🔧', mode: '3d' },
  'atoms-bohr': { app: 'Hydrogen lamp emission lines', icon: '💡', mode: '3d' },

  'cdn-3d-atom': { app: 'Nuclear physics visualisation', icon: '☢️', mode: '3d' },
  'wasm-fluid': { app: 'Hydraulic machinery', icon: '🛢️', mode: '3d' },

  'ncert9-echo': { app: 'Sonar & ultrasound imaging', icon: '🐋', mode: '2d' },
  'ncert10-mirror': { app: 'Telescope & satellite dish', icon: '🔭', mode: '2d' },
  'ncert10-eye': { app: 'Ophthalmic lens design', icon: '👁️', mode: '2d' },
  'ncert10-heating': { app: 'Household kettle & heating', icon: '🫖', mode: '2d' },
  'ncert11-measure': { app: 'Workshop metrology', icon: '📏', mode: '2d' },
  'ncert11-rotation': { app: 'Figure skater & flywheel', icon: '⛸️', mode: '3d' },
  'ncert11-solids': { app: 'Bridge & building material testing', icon: '🌉', mode: '2d' },
  'ncert11-venturi': { app: 'Aerofoil wind tunnel', icon: '✈️', mode: '3d' },
  'ncert11-pv': { app: 'Gas-turbine power plant (Brayton)', icon: '🔥', mode: '3d' },

  orbit3d: { app: 'Low-Earth-orbit insertion', icon: '🌍', mode: '3d' },
  wave3d: { app: 'Ocean wave basin (harbour design)', icon: '⚓', mode: '3d' },
  efield3d: { app: 'HV transmission line field study', icon: '🗼', mode: '3d' }
};

/* Lookup with a graceful fallback so a not-yet-mapped sim still gets a
   chip ("PhysiX simulation") instead of a blank. */
export function simApp(id) {
  return SimApps[id] || { app: 'PhysiX simulation', icon: '🧪', mode: '2d' };
}

/* ============================================================
   2. RENDERING QUALITY POLICY
   ------------------------------------------------------------
   Device-aware tiers per the transformation brief: LOW / MED / HIGH with
   AUTO resolving per-device. The detection is deliberately conservative:
   when in doubt, render less. `cfg()` turns a tier into concrete settings a
   scene can consume — 3D scenes use the full set, 2D scenes use what
   applies (e.g. particleScale, shadows → glow).
   ============================================================ */
export const SimQuality = {
  /* 'low' | 'med' | 'high' — best guess for THIS device. */
  detect() {
    if (typeof navigator === 'undefined') return 'med';
    const dpr = window.devicePixelRatio || 1;
    const cores = navigator.hardwareConcurrency || 4;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    if (mobile) return cores >= 8 && dpr >= 2.5 ? 'med' : 'low';
    if (cores <= 4) return 'low';
    if (cores >= 8 && dpr >= 1.5) return 'high';
    return 'med';
  },
  /* mode: 'auto' | 'low' | 'med' | 'high' (user override) */
  resolve(mode) {
    if (mode === 'auto') return this.detect();
    return mode === 'low' || mode === 'med' || mode === 'high' ? mode : 'med';
  },
  cfg(tier) {
    switch (tier) {
      case 'low':
        return { shadows: false, antialias: false, envRes: 64, particleScale: 0.5, maxDpr: 1 };
      case 'high':
        return { shadows: true, antialias: true, envRes: 256, particleScale: 1.5, maxDpr: 2 };
      default:
        return { shadows: true, antialias: true, envRes: 128, particleScale: 1, maxDpr: 2 };
    }
  }
};

/* ============================================================
   3. WORKSTATION CHROME
   ------------------------------------------------------------
   Workstation.mount(host, spec) → handle

   spec:
     id, title, desc, icon          (required; same as Sims.register)
     topic, level                   header chips
     appKey                         SimApps key for the application chip
     height                         viewport height (default 340)
     quality                        'auto' | 'low' | 'med' | 'high'
     layers                         [{ id, label }] — view switcher
     presets                        [{ label, apply(state) }]
     graphs                         [{ title, xLabel, xUnit, height,
                                       series: [{ id, label, unit, color }] }]
     setup(api) → scene             REQUIRED. Returns:
                                       update(dt, t)   advance + record
                                       draw()          render current state
                                       reset()         restore initial state
                                       onLayer(id)?    react to view switch
                                       onQuality(t)?  react to tier change
                                       onPreset(p)?   react to preset load
                                       destroy()?      scene teardown
     predict(api) → Prediction?     optional POR slot (uses createPrediction)

   api (given to setup/predict):
     SU, pxArrow, pxLabel           the shared kernel + vector helpers
     cv, g, W, H                    the viewport canvas (dpr-transformed)
     state {}                       sim-owned scratch object (survives frames)
     tier, cfg                      current quality tier + settings
     layer                          current layer id (live: use api.getLayer())
     setLayer(id)
     panel, readouts                side-panel DOM to build controls / readouts
     graphs[]                       Graph instances (series pre-added)
     transport                      { playing(), play(), pause(), step(),
                                      reset(), setSpeed(s), speed(), time() }

   handle: everything on `transport` plus { root, destroy }.
   ============================================================ */
export const Workstation = {
  mount(host, spec) {
    const app = simApp(spec.appKey || spec.id);
    const root = SU.el('div', 'ws-root');
    /* Attach early: SU.canvas measures the container's real width, which is
       only non-zero once the tree is in the document. */
    host.appendChild(root);

    /* ---------- header ---------- */
    const head = SU.el(
      'header',
      'ws-head',
      '<span class="ws-icon" aria-hidden="true">' +
        esc(spec.icon || app.icon) +
        '</span>' +
        '<div class="ws-head-text">' +
        '<b class="ws-title">' +
        esc(spec.title) +
        '</b>' +
        '<div class="ws-chips">' +
        (spec.topic ? '<span class="ws-chip ws-chip-topic">' + esc(spec.topic) + '</span>' : '') +
        (spec.level ? '<span class="ws-chip ws-chip-level">' + esc(spec.level) + '</span>' : '') +
        '<span class="ws-chip ws-chip-app" title="' +
        esc(app.app) +
        '">' +
        app.icon +
        ' ' +
        esc(app.app) +
        '</span>' +
        '<span class="ws-chip ws-chip-mode">' +
        esc(app.mode === '2d' ? '2D instrument' : app.mode === '3d' ? '3D apparatus' : 'Hybrid view') +
        '</span>' +
        '</div>' +
        '<span class="ws-desc">' +
        esc(spec.desc) +
        '</span>' +
        '</div>'
    );
    root.appendChild(head);

    /* ---------- body: stage + side ---------- */
    const body = SU.el('div', 'ws-body');
    root.appendChild(body);

    const stageWrap = SU.el('div', 'ws-stage-wrap');
    body.appendChild(stageWrap);
    const cvr = SU.canvas(stageWrap, spec.height || 340);
    const cv = cvr.c,
      g = cvr.g,
      W = cvr.W,
      H = cvr.H;

    /* transport bar (floating, bottom-left) */
    const bar = SU.el('div', 'ws-stagebar');
    stageWrap.appendChild(bar);
    const transportEl = SU.el('div', 'ws-transport');
    bar.appendChild(transportEl);

    /* layer switcher (top-right) */
    let layersEl = null;
    if (spec.layers && spec.layers.length) {
      layersEl = SU.el('div', 'ws-layers');
      layersEl.setAttribute('role', 'tablist');
      layersEl.setAttribute('aria-label', 'View');
      spec.layers.forEach((l, i) => {
        const b = SU.el('button', 'ws-layerbtn' + (i === 0 ? ' ws-layerbtn-on' : ''), esc(l.label));
        b.setAttribute('role', 'tab');
        b.addEventListener('click', () => ws.setLayer(l.id));
        layersEl.appendChild(b);
      });
      /* positioned against the stage wrap (top-right), not the transport bar */
      stageWrap.appendChild(layersEl);
    }

    /* side panel */
    const side = SU.el('aside', 'ws-side');
    body.appendChild(side);
    const addSec = (title, bodyCls) => {
      const s = SU.el('section', 'ws-sec');
      s.innerHTML = '<h4 class="ws-sec-title">' + esc(title) + '</h4>';
      const b = SU.el('div', 'ws-sec-body ' + (bodyCls || ''));
      s.appendChild(b);
      side.appendChild(s);
      return b;
    };
    const presetsEl = addSec('Presets', 'ws-presets');
    /* `sim-controls` is kept alongside `ws-controls` so tools that drive the
       legacy `.sim-controls input[type=range]` selector (verify-physics.mjs
       setRange) keep working on converted simulations. */
    const panel = addSec('Controls', 'ws-controls sim-controls');
    const readouts = addSec('Measurements', 'ws-readouts');

    /* rendering section */
    const renderSec = SU.el('section', 'ws-sec');
    renderSec.innerHTML = '<h4 class="ws-sec-title">Rendering</h4>';
    const renderBody = SU.el('div', 'ws-sec-body');
    const qSel = document.createElement('select');
    qSel.className = 'ws-qsel';
    qSel.setAttribute('aria-label', 'Rendering quality');
    ['auto', 'low', 'med', 'high'].forEach((m) => {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = m === 'auto' ? 'Auto' : m.toUpperCase();
      qSel.appendChild(o);
    });
    const qMode = spec.quality || 'auto';
    qSel.value = qMode;
    const tierNote = SU.el('div', 'ws-tier', 'tier: …');
    renderBody.appendChild(qSel);
    renderBody.appendChild(tierNote);
    renderSec.appendChild(renderBody);
    side.appendChild(renderSec);

    /* ---------- foot: graphs + POR ---------- */
    const foot = SU.el('footer', 'ws-foot');
    root.appendChild(foot);
    const graphsEl = SU.el('div', 'ws-graphs');
    const porEl = SU.el('div', 'ws-por');
    foot.appendChild(graphsEl);
    foot.appendChild(porEl);

    /* ---------- graphs (existing engine) ---------- */
    const graphs = (spec.graphs || []).map((gd) => {
      const G = new Graph({
        xLabel: gd.xLabel || 'Time',
        xUnit: gd.xUnit || 's',
        /* Workstation graphs plot against sim time, so the sample's horizontal
           key defaults to 't' — a series may legitimately be named 'x'
           (position) without colliding with the axis key. */
        xKey: gd.xKey || 't',
        title: gd.title || '',
        height: gd.height || 150,
        /* Sample buffer size. Some simulations need a longer record than the
           engine's default 600 (a 14 s run at 60 Hz is 840 samples), so a
           simulation can ask for its own capacity. */
        capacity: gd.capacity || 600,
        yLabel: gd.yLabel,
        yUnit: gd.yUnit
      });
      (gd.series || []).forEach((s) => G.addSeries(s));
      graphsEl.appendChild(G.el);
      return G;
    });

    /* ---------- quality state ---------- */
    let qualityMode = qMode;
    let tier = SimQuality.resolve(qualityMode);
    let cfg = SimQuality.cfg(tier);
    const syncTier = () => {
      tier = SimQuality.resolve(qualityMode);
      cfg = SimQuality.cfg(tier);
      tierNote.textContent = 'tier: ' + tier.toUpperCase() + (qualityMode === 'auto' ? ' (auto)' : '');
    };
    syncTier();
    qSel.addEventListener('change', () => {
      qualityMode = qSel.value;
      syncTier();
      /* keep the scene-facing api snapshot current (scenes read api.cfg) */
      api.tier = tier;
      api.cfg = cfg;
      if (scene && scene.onQuality) scene.onQuality(tier);
    });

    /* ---------- api + scene ---------- */
    const api = {
      SU,
      pxArrow,
      pxLabel,
      cv,
      g,
      W,
      H,
      state: {},
      tier,
      cfg,
      layer: spec.layers && spec.layers.length ? spec.layers[0].id : 'real',
      getLayer() {
        return api.layer;
      },
      setLayer: (id) => ws.setLayer(id),
      panel,
      readouts,
      por: porEl /* POR host — spec.predict does createPrediction(api.por, cfg) */,
      graphs,
      transport: null /* wired below */
    };

    let scene = null;
    try {
      scene = spec.setup(api) || {};
    } catch (err) {
      console.error('[Workstation] scene setup failed:', spec.id, err);
      stageWrap.insertAdjacentHTML('beforeend', '<div class="ws-stage-error">Simulation failed to start.</div>');
      scene = null;
    }

    /* ---------- transport ---------- */
    let t = 0,
      speed = 1,
      playing = true;

    const playBtn = SU.el('button', 'ws-tbtn ws-tplay', '⏸');
    playBtn.setAttribute('aria-label', 'Pause');
    const stepBtn = SU.el('button', 'ws-tbtn', '⏭');
    stepBtn.setAttribute('aria-label', 'Step one frame (1/60 s)');
    stepBtn.title = 'Step one frame (1/60 s)';
    const resetBtn = SU.el('button', 'ws-tbtn', '↺');
    resetBtn.setAttribute('aria-label', 'Reset');
    resetBtn.title = 'Reset';
    const speedSel = document.createElement('select');
    speedSel.className = 'ws-speed';
    speedSel.setAttribute('aria-label', 'Simulation speed');
    [0.25, 0.5, 1, 2, 4].forEach((s) => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s + '×';
      speedSel.appendChild(o);
    });
    speedSel.value = '1';
    transportEl.appendChild(playBtn);
    transportEl.appendChild(stepBtn);
    transportEl.appendChild(resetBtn);
    transportEl.appendChild(speedSel);

    /* transport. play/pause are plain closures — the methods that reference
       them (toggle, reset) are attached as bare event handlers, where `this`
       is the button, not the transport object. */
    const playFn = () => {
      playing = true;
      playBtn.textContent = '⏸';
      playBtn.setAttribute('aria-label', 'Pause');
    };
    const pauseFn = () => {
      playing = false;
      playBtn.textContent = '▶';
      playBtn.setAttribute('aria-label', 'Play');
    };

    const transport = {
      playing: () => playing,
      play: playFn,
      pause: pauseFn,
      toggle() {
        if (playing) pauseFn();
        else playFn();
      },
      step() {
        if (playing) pauseFn();
        const h = 1 / 60;
        t += h;
        if (scene && scene.update) scene.update(h, t);
      },
      reset() {
        t = 0;
        graphs.forEach((G) => G.reset());
        if (scene && scene.reset) scene.reset();
        playFn();
      },
      speed: () => speed,
      setSpeed(s) {
        speed = +s;
        speedSel.value = String(+s);
      },
      time: () => t
    };
    api.transport = transport;

    playBtn.addEventListener('click', transport.toggle);
    stepBtn.addEventListener('click', transport.step);
    resetBtn.addEventListener('click', transport.reset);
    speedSel.addEventListener('change', () => transport.setSpeed(speedSel.value));

    /* ---------- presets ---------- */
    (spec.presets || []).forEach((p, i) => {
      const b = SU.el('button', 'ws-preset' + (i === 0 ? ' ws-preset-on' : ''), esc(p.label));
      b.addEventListener('click', () => {
        [...presetsEl.children].forEach((c) => c.classList.remove('ws-preset-on'));
        b.classList.add('ws-preset-on');
        if (p.apply) p.apply(api.state);
        if (scene && scene.onPreset) scene.onPreset(p);
      });
      presetsEl.appendChild(b);
    });
    if (!spec.presets || !spec.presets.length) {
      presetsEl.closest('.ws-sec').remove();
    }

    /* ---------- layer switching ---------- */
    const setLayer = (id) => {
      api.layer = id;
      if (layersEl) {
        [...layersEl.children].forEach((c, i) => {
          const on = spec.layers[i] && spec.layers[i].id === id;
          c.classList.toggle('ws-layerbtn-on', !!on);
          c.setAttribute('aria-selected', on ? 'true' : 'false');
        });
      }
      if (scene && scene.onLayer) scene.onLayer(id);
    };

    /* ---------- POR (optional) ---------- */
    let pred = null;
    if (typeof spec.predict === 'function') {
      try {
        /* spec.predict is expected to build the Prediction on api.por, which
           the Prediction constructor appends to itself. We only keep the
           reference for the handle + reveal wiring. */
        pred = spec.predict(api) || null;
      } catch (err) {
        console.error('[Workstation] prediction setup failed:', spec.id, err);
        pred = null;
      }
      if (pred && pred.el && pred.el.parentNode !== porEl) {
        /* defensive: a predict() that returned a Prediction built on a
           different host still lands in the POR slot */
        porEl.appendChild(pred.el);
      }
    }
    if (!pred) {
      foot.removeChild(porEl);
    }

    /* ---------- main pump ----------
       The workstation owns the wall clock. SU.loop clamps dt to 33 ms (it was
       written for short animation frames), which makes a simulation advance
       several times slower than real time whenever the browser throttles rAF.
       The shared time-control layer accepts frame deltas up to 250 ms, so the
       pump measures its own delta and applies the same 0.25 s ceiling. SU.loop
       is still used for its lifecycle: tab-hidden pause and self-stop when the
       canvas leaves the document. */
    let lastNow = null;
    let advanceCalls = 0;
    SU.loop(cv, () => {
      if (!scene) return;
      const now = performance.now();
      const real = lastNow == null ? 0 : (now - lastNow) / 1000;
      lastNow = now;
      if (playing) {
        const d = Math.min(real, 0.25) * speed;
        if (d > 0) {
          t += d;
          advanceCalls++;
          if (scene.update) scene.update(d, t);
        }
      }
      if (scene.draw) scene.draw();
    });

    /* ---------- probe ----------
       tools/verify-physics.mjs reads window.__tcProbe. A converted simulation
       hands Workstation its raw measurements via spec.probe(); the workstation
       adds the clock bookkeeping the shared time controls used to provide
       (calls / paused) and owns the lifetime, clearing the slot on unmount. */
    let probeFn = null;
    if (typeof spec.probe === 'function') {
      probeFn = () => {
        let p;
        try {
          p = spec.probe(api) || {};
        } catch (e) {
          p = {};
        }
        p.calls = advanceCalls;
        p.paused = !playing;
        return p;
      };
      /* only claim the slot if it is free, matching attachTimeControls */
      if (!window.__tcProbe || !window.__tcOwner || !window.__tcOwner.isConnected) {
        window.__tcProbe = probeFn;
        window.__tcOwner = host;
      }
    }

    /* ---------- teardown ----------
       SU.loop self-stops when the canvas leaves the DOM (route change). The
       Graph engine, however, keeps its own rAF + ResizeObserver alive until
       destroy() is called, so detect unmount the same way the registry does:
       watch #main (the node the router replaces) for the frame going away. */
    let destroyed = false;
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (probeFn && window.__tcProbe === probeFn) {
        window.__tcProbe = null;
        window.__tcOwner = null;
      }
      graphs.forEach((G) => G.destroy());
      if (scene && scene.destroy) scene.destroy();
      if (mo) mo.disconnect();
    }
    let mo = null;
    const rootMain = document.getElementById('main') || host;
    if (window.MutationObserver) {
      mo = new MutationObserver(() => {
        if (!root.isConnected) destroy();
      });
      mo.observe(rootMain, { childList: true, subtree: true });
    }
    window.addEventListener('pagehide', destroy, { once: true });

    const ws = {
      root,
      cv,
      g,
      W,
      H,
      graphs,
      prediction: pred,
      api,
      setLayer,
      setQuality(m) {
        qualityMode = m;
        qSel.value = m;
        syncTier();
        api.tier = tier;
        api.cfg = cfg;
        if (scene && scene.onQuality) scene.onQuality(tier);
      },
      tier: () => tier,
      destroy,
      ...transport
    };

    return ws;
  }
};

/* Expose for tooling / console inspection (verify tools probe __tcProbe;
   this mirrors that convention for the workstation itself). */
if (typeof window !== 'undefined') {
  window.PhysixWorkstation = { SimApps, SimQuality, Workstation, simApp };
}
