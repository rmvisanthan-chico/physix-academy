/* PhysiX Academy — Virtual Physics Lab: experiment selection + workspace.
 *
 * DATA comes from js/lab-experiments.js (Phase 1 registry). Simulations are
 * mounted through the shared Sims.mount API — this file never touches physics,
 * never builds a second physics engine, never duplicates controls, graph, or
 * prediction, and never redefines an experiment's parameters.
 *
 * Phase 3 adds:
 *   • Measurement capture — read real samples from the sim's graph engine
 *   • Parameter sweeps — sweep a parameter, run, record results
 *   • Observations — notes persisted to Store.data.lab
 *   • Lifecycle — destroy sim controls/graph on navigation away
 *
 * DATA ONLY at module level: nothing is rendered until viewLab() is called by
 * the router, so this module is safe to import even before the DOM is ready.
 */
import { $, $$, esc, debounce } from './utils.js';
import { App } from './core.js';
import { Sims } from './sims-a.js';
import { LAB_EXPERIMENTS, getLabExperiment } from './lab-experiments.js';
import { Store } from './utils.js';

/* ---- Lab session state --------------------------------------------------- */

let lab = null; /* { exp, simId, controls, graph, slot, measurements, observations } */

/* Clean up any mounted simulation: destroy its controls (kills the rAF loop)
 * and its graph (kills the graph renderer and observers). */
export function cleanupLab() {
  if (lab) {
    try {
      lab.controls.destroy();
    } catch (e) {
      /* ignore */
    }
    try {
      lab.graph.destroy();
    } catch (e) {
      /* ignore */
    }
    lab = null;
  }
}

/* ---------- Router entry point ------------------------------------------- */

export function viewLab(id) {
  cleanupLab();
  if (!id) {
    viewLabSelection();
    return;
  }
  const exp = getLabExperiment(id);
  if (!exp) {
    viewLabNotFound(id);
    return;
  }
  viewLabExperiment(exp);
}

/* ---------- Experiment selection ----------------------------------------- */

function viewLabSelection() {
  App.el.innerHTML = `
    <div class="wrap lab-root">
      <div class="page-head">
        <h1>Experiments</h1>
        <p class="sub">Choose a simulation to open in the lab.</p>
      </div>
      <div class="lab-grid">
        ${LAB_EXPERIMENTS.map(
          (e) => `
          <a class="card lab-card" href="#/lab/${esc(e.id)}">
            <h3>${esc(e.title)}</h3>
            <p class="muted">${esc(e.summary)}</p>
            <div class="topic-meta">${e.topics.map((t) => `<span class="chip plain">${esc(t)}</span>`).join('')}</div>
          </a>
        `
        ).join('')}
      </div>
    </div>`;
  $$('.lab-card', App.el).forEach((card) => {
    card.addEventListener('click', (ev) => {
      ev.preventDefault();
      /* card.href is the browser-resolved ABSOLUTE url; setting location.hash to
         it mangles the route into "#http://…" and route() lands on home. The
         hash needs the raw attribute string ("#/lab/<id>"). */
      location.hash = card.getAttribute('href');
    });
  });
}

/* ---------- Experiment workspace ----------------------------------------- */

function viewLabExperiment(exp) {
  App.el.innerHTML = `
    <div class="wrap lab-root">
      <div class="page-head">
        <h1>${esc(exp.title)}</h1>
        <p class="sub">${esc(exp.summary)}</p>
        <div class="topic-meta">${exp.topics.map((t) => `<span class="chip plain">${esc(t)}</span>`).join('')}</div>
      </div>
      <div class="lab-stage">
        <nav class="lab-nav">
          <a class="btn btn-sm" href="#/lab">← Back to experiments</a>
        </nav>
        <div class="lab-mount">
          <div class="sim-slot" data-sim="${esc(exp.simId)}"></div>
        </div>
        <aside class="lab-sidebar">
          <div class="card lab-panel" id="lab-measure">
            <h3 class="panel-title">Measure</h3>
            <p class="small muted">Capture real values from the running simulation.</p>
            <div class="lab-btn-row">
              <button class="btn btn-sm btn-primary" id="btn-cap">Capture trial</button>
              <button class="btn btn-sm" id="btn-clear">Clear</button>
            </div>
            <div class="measure-table-wrap">
              <table class="measure-table">
                <thead><tr><th>t (s)</th><th>x</th><th>v</th></tr></thead>
                <tbody id="measure-body"></tbody>
              </table>
            </div>
          </div>
          <div class="card lab-panel">
            <h3 class="panel-title">Parameter sweep</h3>
            <p class="small muted">Sweep one parameter, run, record results.</p>
            <div class="sweep-controls">
              <label class="sweep-label" for="sweep-param">Parameter</label>
              <select class="sweep-param" id="sweep-param"></select>
              <label class="sweep-label" for="sweep-min">From</label>
              <input type="number" class="sweep-val" id="sweep-min" step="any">
              <label class="sweep-label" for="sweep-max">To</label>
              <input type="number" class="sweep-val" id="sweep-max" step="any">
              <label class="sweep-label" for="sweep-steps">Steps</label>
              <input type="number" class="sweep-val" id="sweep-steps" value="5" min="1" max="20">
              <button class="btn btn-sm btn-primary" id="btn-sweep">Run sweep</button>
            </div>
            <div class="measure-table-wrap">
              <table class="measure-table">
                <thead><tr><th>Param</th><th>Value</th><th>t (s)</th><th>Status</th></tr></thead>
                <tbody id="sweep-body"></tbody>
              </table>
            </div>
          </div>
          <div class="card lab-panel">
            <h3 class="panel-title">Observations</h3>
            <p class="small muted">Notes are saved automatically.</p>
            <textarea class="lab-notes" id="lab-notes" rows="6" placeholder="Record observations here…"></textarea>
          </div>
        </div>
      </div>
    </div>`;

  /* Mount the simulation */
  const slot = App.el.querySelector('.sim-slot');
  const result = Sims.mount(exp.simId, slot);
  if (!result) {
    App.el.innerHTML = `<div class="wrap"><div class="empty-state"><div class="big">🚧</div><h2>Simulation could not be mounted</h2><p><a href="#/lab">Back to experiments</a></p></div></div>`;
    return;
  }
  const { controls, graph } = result;

  lab = {
    exp,
    simId: exp.simId,
    controls,
    graph,
    slot,
    getTime: result.getTime,
    measurements: [],
    observations: ''
  };

  /* ---- Measurement capture ---------------------------------------------
     Visibility is deliberately NOT snapshotted here. graph.setVisible() can
     hide or show a series at any moment, and push() stops recording a hidden
     series, so which series a trial contains is decided when the student
     captures it - never at workspace-creation time. */
  const currentVisibleSeries = () => graph.series.filter((s) => s.visible);

  const btnCap = $('#btn-cap', App.el);
  const btnClear = $('#btn-clear', App.el);
  const body = $('#measure-body', App.el);

  /* Load any previously saved observations/measurements */
  loadLabPersisted(exp);
  renderMeasureTable();

  function captureTrial() {
    if (!lab || !lab.graph) return;
    const g = lab.graph;

    /* Resolve visibility NOW, not from the initialization snapshot. */
    const series = currentVisibleSeries();
    if (!series.length) return; // nothing visible: nothing honest to record

    /* Time comes from the most recent sample of a currently visible series.
       A just-restored series may not have recorded a sample yet, so it is
       skipped for the timestamp rather than inventing one. */
    let t = -Infinity;
    for (const s of series) {
      const range = g.timeRange(s.id);
      if (range && range.to > t) t = range.to;
    }
    if (!isFinite(t)) return;

    /* Snapshot the display metadata with the row: an observation must stay
       readable after the student hides a series, and after a later capture
       uses a different visible set. */
    const row = {
      t,
      series: series.map((s) => ({ id: s.id, label: s.label, unit: s.unit || '' }))
    };
    for (const s of series) {
      const hit = g.valueAt(s.id, t);
      /* null means "no real sample at this instant" (for example a series
         re-shown a frame ago). Store null and let the table show a dash -
         never a fabricated measurement. */
      row[s.id] = hit ? hit.y : null;
      row[s.id + '_exact'] = hit ? hit.exact : false;
    }
    lab.measurements.push(row);
    renderMeasureTable();
    persistLab();
  }

  /* Display metadata for a series id, preferring the live graph but falling
     back to the id itself so an old persisted row is never unreadable. */
  function seriesMeta(id) {
    const s = lab && lab.graph && lab.graph.byId ? lab.graph.byId[id] : null;
    return { id, label: (s && s.label) || id, unit: (s && s.unit) || '' };
  }

  /* The series actually recorded in one observation. New rows carry an
     explicit snapshot; rows persisted before this schema used flat value
     keys, so recover their series from those keys. */
  function observationSeries(m) {
    if (Array.isArray(m.series) && m.series.length) {
      return m.series.map((s) => {
        const meta = seriesMeta(s.id);
        return { id: s.id, label: s.label || meta.label, unit: s.unit || meta.unit };
      });
    }
    return Object.keys(m)
      .filter((k) => k !== 't' && k !== 'series' && !k.endsWith('_exact'))
      .map(seriesMeta);
  }

  function renderMeasureTable() {
    if (!lab) return;
    const table = body.closest('table');
    const thead = table ? table.querySelector('thead tr') : null;

    /* Columns are the union of the series actually recorded across every
       observation, in first-seen order. That keeps a column for a series the
       student has since hidden, while a series never captured stays absent. */
    const cols = [];
    const seen = new Set();
    for (const m of lab.measurements) {
      for (const s of observationSeries(m)) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          cols.push(s);
        }
      }
    }
    /* No rows yet: preview the series visible right now. */
    if (!cols.length) {
      for (const s of currentVisibleSeries()) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          cols.push({ id: s.id, label: s.label, unit: s.unit || '' });
        }
      }
    }

    if (thead) {
      thead.innerHTML =
        '<th>t (s)</th>' +
        cols.map((c) => `<th>${esc(c.label)}${c.unit ? ` (${esc(c.unit)})` : ''}</th>`).join('');
    }

    if (!lab.measurements.length) {
      body.innerHTML = '';
      return;
    }
    body.innerHTML = lab.measurements
      .map((m) => {
        const tv = Number(m.t);
        const cells = cols
          .map((c) => {
            const v = m[c.id];
            /* A dash means this observation did not record that series (it was
           hidden) or had no valid sample - never "zero". */
            return '<td>' + (typeof v === 'number' && isFinite(v) ? v.toFixed(3) : '—') + '</td>';
          })
          .join('');
        return `<tr><td>${isFinite(tv) ? tv.toFixed(3) : '—'}</td>${cells}</tr>`;
      })
      .join('');
  }

  btnCap.addEventListener('click', () => {
    captureTrial();
  });
  btnClear.addEventListener('click', () => {
    lab.measurements = [];
    renderMeasureTable();
    persistLab();
  });

  /* ---- Parameter sweep ------------------------------------------------- */

  const sweepParam = $('#sweep-param', App.el);
  const sweepMin = $('#sweep-min', App.el);
  const sweepMax = $('#sweep-max', App.el);
  const sweepSteps = $('#sweep-steps', App.el);
  const btnSweep = $('#btn-sweep', App.el);
  const sweepBody = $('#sweep-body', App.el);

  /* Populate parameter dropdown from registry metadata. The registry's label
     is the student-facing name, not necessarily the simulation's accessible
     slider label (which often includes units), so matching falls back to the
     parameter key below. */
  sweepParam.innerHTML = exp.parameters
    .map((p) => `<option value="${esc(p.key)}">${esc(p.label)}</option>`)
    .join('');

  /* The simulations' sliders use the registry keys but not the registry labels
     verbatim: "Speed u" is "Speed u (m/s)", "Launch angle" is "Angle θ (°)",
     "Initial velocity u" is "Initial u (m/s)", "Spring constant k" is "Spring k".
     These regexes are the same mapping tools/test-lab-experiments.mjs uses to
     prove the registry and the real sliders have not drifted. */
  const PARAM_SLIDER_RE = {
    u: /speed|initial u/i,
    theta: /angle/i,
    h0: /height/i,
    drag: /drag/i,
    a: /acceleration/i,
    m: /mass/i,
    k: /spring/i,
    damping: /damping/i,
    A: /amplitude/i
  };

  /* Find the range input that actually controls this registry parameter. Scope
     the search to the mounted simulation so the lab's own controls can never be
     mistaken for a simulation slider. */
  function findSlider(paramDef) {
    const inputs = Array.from(lab.slot.querySelectorAll('.sim-controls input[type="range"]'));
    const byLabel = inputs.find((inp) => inp.getAttribute('aria-label') === paramDef.label);
    if (byLabel) return byLabel;
    const re = PARAM_SLIDER_RE[paramDef.key];
    if (re) {
      const byKey = inputs.find((inp) => re.test(inp.getAttribute('aria-label') || ''));
      if (byKey) return byKey;
    }
    /* Last resort: the registry lists parameters in the same order as the
       simulation creates its sliders. */
    const idx = exp.parameters.indexOf(paramDef);
    return idx >= 0 && idx < inputs.length ? inputs[idx] : null;
  }

  /* The sweep records every series the experiment's graph registers, not a
     hard-coded x/v pair. Projectile is y/vx/vy; kinematics and SHM are x/v. */
  function sweepSeries() {
    return lab && lab.graph ? lab.graph.series.slice() : [];
  }

  function renderSweepHead() {
    const table = sweepBody.closest('table');
    const thead = table ? table.querySelector('thead tr') : null;
    if (!thead) return;
    const series = sweepSeries();
    thead.innerHTML =
      '<th>Param</th><th>Value</th>' +
      series.map((s) => `<th>${esc(s.label)}${s.unit ? ` (${esc(s.unit)})` : ''}</th>`).join('') +
      '<th>t (s)</th><th>Status</th>';
  }

  /* Start each parameter selection at its declared range. The number inputs
     otherwise start empty, which makes a first sweep look like it did nothing. */
  function syncSweepBounds() {
    const p = exp.parameters.find((x) => x.key === sweepParam.value);
    if (!p) return;
    for (const el of [sweepMin, sweepMax]) {
      el.min = String(p.min);
      el.max = String(p.max);
      el.step = String(p.step);
    }
    sweepMin.value = String(p.min);
    sweepMax.value = String(p.max);
  }

  sweepParam.addEventListener('change', syncSweepBounds);
  syncSweepBounds();
  renderSweepHead();

  function runSweep() {
    if (!lab || !lab.controls || !lab.graph) return;
    const paramDef = exp.parameters.find((p) => p.key === sweepParam.value);
    if (!paramDef) return;

    const rawMin = parseFloat(sweepMin.value);
    const rawMax = parseFloat(sweepMax.value);
    const min = Math.max(
      paramDef.min,
      Math.min(paramDef.max, Number.isFinite(rawMin) ? rawMin : paramDef.min)
    );
    const max = Math.max(
      paramDef.min,
      Math.min(paramDef.max, Number.isFinite(rawMax) ? rawMax : paramDef.max)
    );
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const runs = Math.max(1, Math.min(20, parseInt(sweepSteps.value, 10) || 1));
    /* Exactly `runs` trials, including both endpoints when runs > 1. The old
       loop used i <= steps, which produced steps+1 rows. */
    const stepSize = runs > 1 ? (hi - lo) / (runs - 1) : 0;

    renderSweepHead();
    sweepBody.innerHTML = '';

    /* A sweep is a temporary experiment: snapshot the student's slider, clock,
       play/pause state and step size before touching anything, so `finally` can
       put the workspace back exactly as it was - on success, on a failed trial,
       or if the batch is interrupted. */
    const sliderInput = findSlider(paramDef);
    const originalSliderValue = sliderInput ? sliderInput.value : null;
    const originalPaused = lab.controls.isPaused();
    const originalStep = lab.controls.stepSeconds;
    let originalTime = 0;
    if (typeof lab.getTime === 'function') {
      const t = lab.getTime();
      if (Number.isFinite(t)) originalTime = t;
    }
    /* Fallback for any future simulation that does not expose a clock. */
    if (!originalTime) {
      for (const s of lab.graph.series) {
        const range = lab.graph.timeRange(s.id);
        if (range && range.to > originalTime) originalTime = range.to;
      }
    }

    /* Pause once, so the rAF loop cannot add samples between trials. Each
       controls.step() already pauses, but being explicit makes the batch
       deterministic from the first trial. */
    lab.controls.pause();

    /* Force the fixed physics timestep for the batch. 120 x 1/60 s = 2 s of
       simulated time. The student's step size is restored in `finally`. */
    lab.controls.setStepSeconds(lab.controls.FIXED_DT);

    try {
      for (let i = 0; i < runs; i++) {
        const requested = runs > 1 ? lo + i * stepSize : lo;
        let value = requested;
        let status = 'complete';
        let t = null;
        const values = {};
        const missing = [];

        try {
          if (!sliderInput) {
            status = 'slider missing';
          } else {
            sliderInput.value = String(requested);
            sliderInput.dispatchEvent(new Event('input', { bubbles: true }));
            /* The range input quantises to its step and clamps to its range.
               Record what the simulation actually received, not the request. */
            value = +sliderInput.value;
            lab.controls.reset();
            for (let j = 0; j < 120; j++) {
              if (!lab.controls) break;
              lab.controls.step();
            }

            const g = lab.graph;
            let latest = -Infinity;
            for (const s of sweepSeries()) {
              const range = g.timeRange(s.id);
              if (range && range.to > latest) latest = range.to;
            }
            if (!isFinite(latest)) {
              status = 'incomplete';
            } else {
              t = latest;
              for (const s of sweepSeries()) {
                const hit = g.valueAt(s.id, t);
                const v = hit && Number.isFinite(hit.y) ? hit.y : null;
                values[s.id] = v;
                if (v === null) missing.push(s.label);
              }
              if (missing.length) status = 'partial';
            }
          }
        } catch (err) {
          console.error('Lab sweep trial failed:', err);
          status = 'error';
        }

        const cells = sweepSeries()
          .map((s) => {
            const v = values[s.id];
            return '<td>' + (typeof v === 'number' && isFinite(v) ? v.toFixed(3) : '—') + '</td>';
          })
          .join('');
        const row = document.createElement('tr');
        row.innerHTML = `<td>${esc(paramDef.label)}</td>
          <td>${value.toFixed(3)}</td>
          ${cells}
          <td>${t === null ? '—' : t.toFixed(3)}</td>
          <td>${esc(status)}</td>`;
        if (missing.length) row.title = 'No sample for: ' + missing.join(', ');
        sweepBody.appendChild(row);
      }
    } finally {
      if (lab && lab.controls) {
        /* Restore the swept slider first: its input handler resets the
           simulation to the restored parameter. */
        if (sliderInput && originalSliderValue !== null) {
          sliderInput.value = originalSliderValue;
          sliderInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        /* Rebuild the pre-sweep state deterministically. Every simulation here
           integrates fixed 1/60 s sub-steps, so replaying the same number of
           sub-steps from Reset reaches the same t, x and v - and the same graph
           samples - without storing internal state. Advance in five-second
           chunks so a long run does not repaint once per sub-step. */
        lab.controls.pause();
        lab.controls.setStepSeconds(lab.controls.FIXED_DT);
        lab.controls.reset();
        let remaining = Math.max(0, Math.round(originalTime / lab.controls.FIXED_DT));
        while (remaining > 0) {
          const chunk = Math.min(remaining, 300);
          lab.controls.setStepSeconds(chunk * lab.controls.FIXED_DT);
          lab.controls.step();
          remaining -= chunk;
        }
        lab.controls.setStepSeconds(originalStep);
        if (originalPaused) lab.controls.pause();
        else lab.controls.play();
      }
      persistLab();
    }
  }

  btnSweep.addEventListener('click', () => runSweep());

  /* ---- Observations ------------------------------------------------------ */

  const notesEl = $('#lab-notes', App.el);
  if (lab.observations) notesEl.value = lab.observations;
  notesEl.addEventListener(
    'input',
    debounce(() => {
      if (!lab) return;
      lab.observations = notesEl.value;
      persistLab();
    }, 400)
  );

  /* No shared afterRender() in the lab: the sim was already mounted directly
     above via Sims.mount, and afterRender's step('sims') would remount this
     slot afresh — the workspace would then hold controls/graph from the dead
     first instance. The workspace self-wires every panel it renders. */
}

/* ---------- Unknown experiment ------------------------------------------ */

function viewLabNotFound(id) {
  App.el.innerHTML = `
    <div class="wrap lab-root">
      <div class="page-head">
        <h1>Experiment not found</h1>
        <p class="sub">No experiment with ID <code>${esc(id)}</code> exists.</p>
      </div>
      <div class="lab-stage">
        <div class="card">
          <p class="muted">The requested simulation may have been removed or renamed.</p>
        </div>
        <div class="lab-nav">
          <a class="btn btn-primary" href="#/lab">Back to experiments</a>
        </div>
      </div>
    </div>`;
}

/* ---------- Persistence -------------------------------------------------- */

function loadLabPersisted(exp) {
  try {
    const d = Store.data.lab || {};
    const saved = d[exp.simId];
    if (saved && lab) {
      lab.observations = saved.observations || '';
      lab.measurements = saved.measurements || [];
    }
  } catch (e) {
    /* ignore storage errors */
  }
}

function persistLab() {
  if (!lab) return;
  try {
    const d = Store.data.lab || {};
    d[lab.simId] = {
      observations: lab.observations || '',
      measurements: lab.measurements || [],
      updatedAt: Date.now()
    };
    Store.data.lab = d;
    Store.save();
  } catch (e) {
    /* storage failure — never block the lab */
  }
}
