/* PhysiX Academy — Physics Calculators */
'use strict';

const CALCULATORS = [
  {
    icon: '🚗', title: 'Acceleration',
    note: 'Leave t empty to use v² = u² + 2as instead.',
    fields: [
      { k: 'u', label: 'Initial speed u (m/s)', def: 0 },
      { k: 'v', label: 'Final speed v (m/s)', def: 20 },
      { k: 't', label: 'Time t (s) — or s (m) below', def: 4 },
      { k: 's', label: 'Distance s (m), optional', def: '' }
    ],
    run(f) {
      const u = f.u, v = f.v;
      if (f.t !== null && f.t > 0) {
        const a = (v - u) / f.t;
        const s = (u + v) / 2 * f.t;
        return [['Acceleration a', fmtNum(a) + ' m/s²'], ['Distance covered', fmtNum(s) + ' m']];
      }
      if (f.s !== null && f.s > 0 && v * v - u * u >= 0) {
        const a = (v * v - u * u) / (2 * f.s);
        return [['Acceleration a', fmtNum(a) + ' m/s²']];
      }
      return [['—', 'Fill u, v and either t > 0 or s > 0']];
    }
  },
  {
    icon: '💪', title: "Newton's Second Law",
    fields: [
      { k: 'F', label: 'Net force F (N)', def: 50 },
      { k: 'm', label: 'Mass m (kg)', def: 2 },
      { k: 'a', label: '…or acceleration a (m/s²) — leave F empty', def: '' }
    ],
    run(f) {
      if (f.F !== null && f.m > 0) return [['Acceleration a', fmtNum(f.F / f.m) + ' m/s²']];
      if (f.a !== null && f.m > 0) return [['Force needed F', fmtNum(f.a * f.m) + ' N']];
      return [['—', 'Give F & m, or a & m']];
    }
  },
  {
    icon: '🔌', title: "Ohm's Law + Power",
    note: 'Fill any two of V, I, R.',
    fields: [
      { k: 'V', label: 'Voltage V (volts)', def: 12 },
      { k: 'I', label: 'Current I (amps)', def: 0.5 },
      { k: 'R', label: 'Resistance R (ohms)', def: '' }
    ],
    run(f) {
      let { V, I, R } = f;
      if (V === null && I !== null && R !== null) V = I * R;
      if (I === null && V !== null && R !== null) I = V / R;
      if (R === null && V !== null && I !== null && I !== 0) R = V / I;
      if (V === null || I === null) return [['—', 'Need at least two of V, I, R']];
      return [['Voltage V', fmtNum(V) + ' V'], ['Current I', fmtNum(I) + ' A'],
        ['Resistance R', R === null ? '—' : fmtNum(R) + ' Ω'], ['Power P = VI', fmtNum(V * I) + ' W']];
    }
  },
  {
    icon: '🌊', title: 'Wave Speed',
    fields: [
      { k: 'f', label: 'Frequency f (Hz)', def: 440 },
      { k: 'L', label: 'Wavelength λ (m)', def: 0.78 }
    ],
    run(f) {
      if (f.f === null || f.L === null) return [['—', 'Both values needed']];
      return [['Speed v = fλ', fmtNum(f.f * f.L, 3) + ' m/s'],
        ['Period T = 1/f', fmtNum(1 / f.f, 4) + ' s']];
    }
  },
  {
    icon: '🎢', title: 'Kinetic & Potential Energy',
    fields: [
      { k: 'm', label: 'Mass m (kg)', def: 60 },
      { k: 'v', label: 'Speed v (m/s)', def: 8 },
      { k: 'h', label: 'Height h (m)', def: 5 }
    ],
    run(f) {
      if (f.m === null) return [['—', 'Mass needed']];
      const ke = f.v !== null ? 0.5 * f.m * f.v * f.v : null;
      const pe = f.h !== null ? f.m * 9.8 * f.h : null;
      return [['Kinetic energy KE', ke === null ? '—' : fmtNum(ke) + ' J'],
        ['Potential energy PE', pe === null ? '—' : fmtNum(pe) + ' J'],
        ['Total mechanical E', ke === null || pe === null ? '—' : fmtNum(ke + pe) + ' J']];
    }
  },
  {
    icon: '🎱', title: 'Momentum',
    fields: [
      { k: 'm', label: 'Mass m (kg)', def: 0.16 },
      { k: 'v', label: 'Velocity v (m/s)', def: 40 }
    ],
    run(f) {
      if (f.m === null || f.v === null) return [['—', 'Both values needed']];
      const p = f.m * f.v;
      return [['Momentum p = mv', fmtNum(p) + ' kg·m/s'],
        ['KE too', fmtNum(0.5 * f.m * f.v ** 2) + ' J']];
    }
  },
  {
    icon: '⚡', title: 'Coulomb Force',
    note: 'Charges in microcoulombs (µC).',
    fields: [
      { k: 'q1', label: 'Charge q₁ (µC)', def: 2 },
      { k: 'q2', label: 'Charge q₂ (µC)', def: -3 },
      { k: 'r', label: 'Separation r (cm)', def: 10 }
    ],
    run(f) {
      if (Object.values(f).some(v => v === null)) return [['—', 'All three values needed']];
      if (f.r <= 0) return [['—', 'r must be > 0']];
      const k = 8.99e9;
      const F = Math.abs(k * f.q1 * 1e-6 * f.q2 * 1e-6 / (f.r / 100) ** 2);
      const attract = f.q1 * f.q2 < 0;
      return [['Force magnitude |F|', fmtNum(F, 3) + ' N'], ['Type', attract ? 'Attraction' : 'Repulsion']];
    }
  },
  {
    icon: '🔭', title: 'Thin Lens / Mirror',
    fields: [
      { k: 'f', label: 'Focal length f (cm)', def: 15 },
      { k: 'u', label: 'Object distance (cm)', def: 30 }
    ],
    run(f) {
      if (!f.f || !f.u) return [['—', 'Both values needed']];
      const v = 1 / (1 / f.f - 1 / f.u);
      const m = -v / f.u;
      return [['Image distance v', fmtNum(v) + ' cm (' + (v > 0 ? 'opposite side' : 'same side') + ')'],
        ['Magnification m', fmtNum(m)],
        ['Nature', v > 0 ? 'Real, inverted' : 'Virtual, upright']];
    }
  }
];

function viewCalculators() {
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>🧮 Physics Calculators</h1>
      <p class="sub">Type in any box — results update instantly. Great for checking homework.</p></div>
    <div class="grid g3" id="calc-zone">
      ${CALCULATORS.map((c, ci) => `
      <div class="card calc-card" data-ci="${ci}">
        <h3>${c.icon} ${esc(c.title)}</h3>
        ${c.note ? '<p class="small muted">' + esc(c.note) + '</p>' : ''}
        <div class="calc-fields">
          ${c.fields.map(fl => `
          <label class="field">${esc(fl.label)}
            <input type="number" step="any" class="calc-in" data-k="${fl.k}" value="${fl.def}" placeholder="—">
          </label>`).join('')}
        </div>
        <div class="calc-result"></div>
      </div>`).join('')}
    </div>
  </div>`;

  $$('.calc-card', App.el).forEach(card => {
    const calc = CALCULATORS[+card.dataset.ci];
    const out = $('.calc-result', card);
    const recalc = () => {
      const vals = {};
      let filled = 0;
      $$('.calc-in', card).forEach(inp => {
        vals[inp.dataset.k] = inp.value.trim() === '' ? null : parseFloat(inp.value);
        if (vals[inp.dataset.k] !== null) filled++;
      });
      out.innerHTML = filled < 2
        ? '<span class="muted small">Waiting for input…</span>'
        : calc.run(vals).map(r => `<div><span>${esc(r[0])}</span><b>${esc(String(r[1]))}</b></div>`).join('');
    };
    $$('.calc-in', card).forEach(inp => inp.addEventListener('input', recalc));
    recalc();
  });
}
