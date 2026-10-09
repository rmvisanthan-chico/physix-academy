/* PhysiX Academy — Prediction system: Predict → Observe → Reason.
 *
 * Reusable across simulations. It owns the prompt, the answer input, validation,
 * comparison and the explanation. It does NOT own physics: it is handed a
 * function that reads a real observed value out of the simulation, and it
 * refuses to invent one.
 *
 * The rule that shapes this whole file: the observed value must come from
 * recorded simulation data or the answer is not shown. Every path that cannot
 * produce a real measurement says so plainly rather than falling back to a
 * formula. A prediction exercise that quietly answered from theory would be
 * teaching the student to trust a number that the simulation never produced,
 * which defeats the entire point of observing physics.
 *
 * TOLERANCE, and why it is not one number:
 *   within  = generous; "you got the idea right"
 *   outside = missed
 *   A fixed 5% is wrong in both directions. For a height of 0.4 m, 5% is 2 cm -
 *   absurd. For 15 m it is 75 cm - harsh. So the band is the larger of a
 *   relative term and an absolute floor, which is the standard approach for
 *   physical measurement. Documented here because a magic number in a
 *   comparison is exactly the kind of thing nobody can audit later.
 */

const DEFAULT_ABS_FLOOR = 0.15;   /* m, or m/s - see toleranceOf() */
const DEFAULT_REL = 0.10;          /* 10% of the observed value */

/* How close counts as "close enough", relative and absolute combined. */
export function toleranceOf(observed, opts = {}) {
  const rel = opts.rel != null ? opts.rel : DEFAULT_REL;
  const floor = opts.absFloor != null ? opts.absFloor : DEFAULT_ABS_FLOOR;
  return Math.max(Math.abs(observed) * rel, floor);
}

/* ---------- answer parsing ----------
   Deliberately strict about what it will accept, because a silently
   reinterpreted answer is worse than a rejected one: the student thinks they
   answered in seconds and was scored against metres. */
export function parseAnswer(raw, unit) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return { ok: false, error: 'Enter a number first.' };

  /* Reject a pasted unit rather than half-reading it. */
  const m = s.match(/^(-)?(\d+(?:\.\d+)?)\s*(m\/s|m|s|kg|N|J)?$/i);
  if (!m) {
    if (/[a-zA-Z]/.test(s)) {
      return { ok: false, error: `That is not a plain number. Type the value only,${unit ? ` in ${unit}` : ''} - for example 12.5` };
    }
    return { ok: false, error: 'That is not a number. Try something like 12.5' };
  }
  const value = (m[1] ? -1 : 1) * parseFloat(m[2]);
  if (!isFinite(value)) return { ok: false, error: 'That is not a finite number.' };
  const gotUnit = m[3] ? m[3].toLowerCase() : null;
  if (gotUnit && unit) {
    const want = String(unit).toLowerCase();
    const okUnit = gotUnit === want || (want === 'm/s' && gotUnit === 'ms');
    if (!okUnit) return { ok: false, error: `Those numbers are in ${gotUnit}, but this question is in ${unit}.` };
  }
  return { ok: true, value };
}

const fmt = (v, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);

/* ---------- the component ---------- */
export class Prediction {
  /* cfg:
       question   (fn|str)   text; fn(ctx) may vary the target per launch
       targetTime (fn|number) when in the trajectory
       series     string      graph series id holding the quantity
       unit       string
       quantity   string      e.g. 'height'
       observe    ({graph, ctx}) => ({value, exact})  REQUIRED, reads real data
       explain    (result, ctx) => string
       absFloor, rel        optional tolerance overrides */
  constructor(host, cfg) {
    this.cfg = cfg;
    this.host = host;
    this.prediction = null;
    this.observed = null;
    this.result = null;
    this._build();
  }

  _ctx() {
    return (typeof this.cfg.context === 'function') ? this.cfg.context() : (this.cfg.context || {});
  }

  /* Public accessors, so a simulation can read the live context and the target
     instant without reaching into privates. */
  ctx() { return this._ctx(); }
  target() { return this._targetTime(); }
  /* Re-read the question and parameters, e.g. after a relaunch changed them. */
  refresh() {
    this.el.querySelector('.predict-q').textContent = this._questionText();
    this._syncSubtitle();
  }

  _questionText() {
    return typeof this.cfg.question === 'function'
      ? this.cfg.question(this._ctx()) : this.cfg.question;
  }
  _targetTime() {
    return typeof this.cfg.targetTime === 'function'
      ? this.cfg.targetTime(this._ctx()) : this.cfg.targetTime;
  }

  _build() {
    const el = document.createElement('div');
    el.className = 'predict';
    this.el = el;

    const head = document.createElement('div');
    head.className = 'predict-head';
    head.innerHTML = '<span class="predict-badge">Predict</span>';
    const h = document.createElement('h3');
    h.className = 'predict-q';
    h.textContent = this._questionText();
    head.appendChild(h);
    const sub = document.createElement('p');
    sub.className = 'predict-sub muted small';
    sub.id = 'predict-sub-' + Math.random().toString(36).slice(2, 8);
    head.appendChild(sub);
    el.appendChild(head);

    /* answer row.
       The label needs an id/for PAIR, not just text: a <label> with no `for`
       and no wrapped input names nothing, and a screen reader announced this
       field as an unlabelled text box. */
    const row = document.createElement('div');
    row.className = 'predict-row';
    const inputId = 'pred-in-' + Math.random().toString(36).slice(2, 9);
    const lab = document.createElement('label');
    lab.className = 'predict-label';
    lab.setAttribute('for', inputId);
    lab.textContent = 'Your estimate';
    const inputWrap = document.createElement('div');
    inputWrap.className = 'predict-inputwrap';
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.id = inputId;
    this.input.className = 'predict-input';
    this.input.inputMode = 'decimal';
    this.input.autocomplete = 'off';
    this.input.setAttribute('aria-describedby', sub.id);
    inputWrap.appendChild(this.input);
    this.unitEl = document.createElement('span');
    this.unitEl.className = 'predict-unit';
    inputWrap.appendChild(this.unitEl);
    row.appendChild(lab);
    row.appendChild(inputWrap);
    el.appendChild(row);

    const actions = document.createElement('div');
    actions.className = 'predict-actions';
    this.submitBtn = document.createElement('button');
    this.submitBtn.className = 'btn btn-primary btn-sm';
    this.submitBtn.type = 'button';
    this.submitBtn.textContent = 'Lock in my estimate';
    actions.appendChild(this.submitBtn);
    el.appendChild(actions);

    this.err = document.createElement('p');
    this.err.className = 'predict-err';
    this.err.setAttribute('role', 'alert');
    this.err.setAttribute('aria-live', 'assertive');
    el.appendChild(this.err);

    /* revealed only after a real observation exists */
    this.out = document.createElement('div');
    this.out.className = 'predict-out';
    this.out.hidden = true;
    el.appendChild(this.out);

    this._syncSubtitle();
    this._bind();
    host_append(this.host, el);
  }

  _syncSubtitle() {
    const c = this._ctx();
    const bits = [];
    if (c.paramsText) bits.push(c.paramsText);
    const t = this._targetTime();
    if (t != null) bits.push(`at t = ${fmt(t, 2)} s`);
    this.el.querySelector('.predict-sub').textContent = bits.join(' · ');
    this.unitEl.textContent = this.cfg.unit || '';
  }

  _bind() {
    this.submitBtn.addEventListener('click', () => this.submit());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.submit(); }
    });
    /* Validate as they type, but never nag before they have finished a number. */
    this.input.addEventListener('input', () => {
      if (this.prediction !== null) return;
      this.err.textContent = '';
    });
  }

  submit() {
    const parsed = parseAnswer(this.input.value, this.cfg.unit);
    if (!parsed.ok) {
      this.err.textContent = parsed.error;
      this.input.focus();
      this.input.setAttribute('aria-invalid', 'true');
      return false;
    }
    this.input.setAttribute('aria-invalid', 'false');
    this.err.textContent = '';
    this.prediction = parsed.value;
    this.input.disabled = true;
    this.submitBtn.disabled = true;
    this.el.classList.add('is-locked');
    this.submitBtn.textContent = 'Estimate locked';

    const sub = this.el.querySelector('.predict-sub');
    const t = this._targetTime();
    const tgt = t != null ? ` at t = ${fmt(t, 2)} s` : '';
    sub.textContent = `Locked in: ${fmt(this.prediction, 2)} ${this.cfg.unit || ''}${tgt}. Run the simulation and compare.`;

    /* Tell the simulation a prediction exists, so it can offer to reveal the
       result once the target time has passed. Non-fatal if it does not. */
    try {
      if (typeof this.cfg.onLock === 'function') this.cfg.onLock(this.prediction);
    } catch (e) { /* never block a prediction on a listener error */ }
    return true;
  }

  /* Called by the simulation, or polled, once enough real data exists. */
  reveal() {
    if (this.prediction === null || this.result) return false;

    let obs;
    try {
      obs = this.cfg.observe({ graph: this.cfg.graph, ctx: this._ctx() });
    } catch (e) {
      obs = null;
    }
    /* The whole contract: no real measurement, no result. */
    if (!obs || obs.value == null || !isFinite(obs.value)) {
      this.err.textContent = 'Not enough of the run has happened yet to answer that. Let the simulation continue.';
      return false;
    }

    const tol = toleranceOf(obs.value, this.cfg);
    const diff = obs.value - this.prediction;
    const rel = Math.abs(diff);
    const near = rel <= tol;
    this.result = { prediction: this.prediction, observed: obs.value, diff, tol, near, exact: !!obs.exact };
    this._render();
    try { if (typeof this.cfg.onReveal === 'function') this.cfg.onReveal(this.result); } catch (e) { }
    return true;
  }

  _render() {
    const r = this.result;
    const c = this._ctx();
    const q = (this.cfg.quantity || 'value');
    const u = this.cfg.unit || '';

    const rows = [
      ['Your estimate', `${fmt(r.prediction, 2)} ${u}`],
      ['Measured from the simulation', `${fmt(r.observed, 2)} ${u}`]
    ];
    if (Math.abs(r.diff) > 1e-9) {
      rows.push([
        r.diff > 0 ? 'Measured higher than you predicted' : 'Measured lower than you predicted',
        `${fmt(Math.abs(r.diff), 2)} ${u}`
      ]);
    }

    let explain = '';
    try { explain = this.cfg.explain ? this.cfg.explain(r, c) : ''; } catch (e) { explain = ''; }

    this.out.hidden = false;
    this.out.innerHTML = `
      <div class="predict-verdict ${r.near ? 'is-near' : 'is-off'}">
        <span class="predict-mark" aria-hidden="true">${r.near ? '✓' : '✗'}</span>
        <div>
          <div class="predict-verdict-title">
            ${r.near
        ? `Close — within ${fmt(r.tol, 2)} ${u} of the measurement`
        : `Off by ${fmt(Math.abs(r.diff), 2)} ${u}`}
          </div>
          <div class="small muted">${r.exact
        ? 'Read straight from a simulation sample.'
        : 'Linearly interpolated between the two samples either side of that instant.'}</div>
        </div>
      </div>
      <dl class="predict-rows">
        ${rows.map(([k, v]) => `<div><dt>${escText(k)}</dt><dd>${escText(v)}</dd></div>`).join('')}
      </dl>
      ${explain ? `<div class="predict-why"><b>Why:</b> ${explain}</div>` : ''}
    `;

    /* Retry is always available and always honest: it does not hint at the
       answer, it just reopens the input. */
    const again = document.createElement('button');
    again.className = 'btn btn-sm';
    again.type = 'button';
    again.textContent = 'Predict again';
    again.addEventListener('click', () => this.reset());
    this.out.appendChild(again);
  }

  reset() {
    this.prediction = null;
    this.observed = null;
    this.result = null;
    this.input.disabled = false;
    this.input.value = '';
    this.input.removeAttribute('aria-invalid');
    this.submitBtn.disabled = false;
    this.submitBtn.textContent = 'Lock in my estimate';
    this.out.hidden = true;
    this.out.innerHTML = '';
    this.err.textContent = '';
    this.el.classList.remove('is-locked');
    this._syncSubtitle();
    /* Hand control back to the simulation so it can run again for the retry. */
    try { if (typeof this.cfg.onReset === 'function') this.cfg.onReset(); } catch (e) { }
  }
}

function escText(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function host_append(host, el) { host.appendChild(el); }

/* Convenience wrapper matching the graph engine's style. */
export function createPrediction(host, cfg) { return new Prediction(host, cfg); }

/* Exposed for the same reason as the graph engine: the bundler rewrites this
   module's path, so there is no stable URL to import it from once built.
   Assigned last, after every declaration above is initialised - touching window
   earlier throws a ReferenceError from the temporal dead zone and takes down
   every module importing this one. */
if (typeof window !== 'undefined') {
  window.PhysixPrediction = {
    Prediction, createPrediction, parseAnswer, toleranceOf,
    DEFAULT_ABS_FLOOR, DEFAULT_REL
  };
}