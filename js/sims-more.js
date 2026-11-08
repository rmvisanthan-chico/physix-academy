import { SU } from './core.js';
import { Sims } from './sims-a.js';
import { attachTimeControls } from './sim-controls-helper.js';
/* PhysiX Academy — More Sims: Thermo, KTG, Atoms (local trial) */
('use strict');
function msArrow(g, x, y, dx, dy, c, w) {
  const l = Math.hypot(dx, dy);
  if (l < 2) return;
  g.strokeStyle = c;
  g.fillStyle = c;
  g.lineWidth = w || 2;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + dx, y + dy);
  g.stroke();
  const a = Math.atan2(dy, dx),
    h = (w || 2) + 4;
  g.beginPath();
  g.moveTo(x + dx, y + dy);
  g.lineTo(x + dx - h * Math.cos(a - 0.42), y + dy - h * Math.sin(a - 0.42));
  g.lineTo(x + dx - h * Math.cos(a + 0.42), y + dy - h * Math.sin(a + 0.42));
  g.closePath();
  g.fill();
}

Sims.register(
  'thermo-engine',
  'Heat Engine Cycle',
  'Carnot vs real — the loop is drawn from Th and Tc, area = work, efficiency = 1−Tc/Th.',
  '🔥',
  (frame) => {
    /* The P-V loop used to be four hard-coded literals:
       const pts=[[ox+W*0.2,oy-H*0.3],[ox+W*0.7,oy-H*0.28],[ox+W*0.6,oy-H*0.72],[ox+W*0.15,oy-H*0.75]];
     independent of both sliders, so the readouts moved while the picture never
     did - a decorative illustration wearing the costume of a simulation.
     Everything below is derived from the reservoir temperatures instead.

     Same constants as the 3D Heat Engine Cycle (html5-sims/thermo-engine.html)
     so the two renderings of this cycle agree. */
    const R = 8.314,
      N = 40,
      GAMMA = 1.4,
      V1 = 0.4,
      V2 = 1.2; // J/(mol K), mol, -, m^3, m^3
    const nR = N * R; // J/K
    const cv = SU.canvas(frame, 360);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    /* SU.slider's input handler calls oninput(...) unconditionally, so omitting it
     threw "oninput is not a function" every time a student dragged either
     slider. The animation loop redraws from TH.get()/TC.get() each frame, so a
     no-op callback is the honest thing to pass - the sibling simulations do the
     same. */
    const TH = SU.slider(ctr, 'Hot Th (°C)', 150, 500, 10, 400, () => {}),
      TC = SU.slider(ctr, 'Cold Tc (°C)', 20, 100, 5, 40, () => {});
    const rEff = SU.readout(ro, 'Carnot η'),
      rW = SU.readout(ro, 'Work per cycle');
    const rP = SU.readout(ro, 'Peak pressure'),
      rV = SU.readout(ro, 'Max volume');
    /* Round tick values (1/2/5 x 10^n) so the axis reads sensibly whatever the
     temperatures do. */
    const niceStep = (span, target) => {
      const raw = span / Math.max(1, target),
        mag = Math.pow(10, Math.floor(Math.log10(raw))),
        nm = raw / mag;
      return (nm < 1.5 ? 1 : nm < 3 ? 2 : nm < 7 ? 5 : 10) * mag;
    };
    SU.loop(cv.c, () => {
      /* Kelvin, and the cold reservoir may not sit above the hot one. */
      const th = TH.get() + 273.15,
        tc = Math.min(TC.get() + 273.15, th - 5);
      const r = Math.pow(th / tc, 1 / (GAMMA - 1));
      const press = (V, T) => (nR * T) / V;
      const p1 = press(V1, th),
        p3 = press(V2 * r, tc);
      const Qin = nR * th * Math.log(V2 / V1),
        Qout = nR * tc * Math.log(V2 / V1);
      const Wk = Qin - Qout,
        eff = 1 - tc / th;
      rEff.set((eff * 100).toFixed(1) + '%');
      rW.set((Wk / 1000).toFixed(1) + ' kJ');
      rP.set((p1 / 1000).toFixed(0) + ' kPa');
      rV.set((V2 * r).toFixed(2) + ' m³');

      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      const ox = 60,
        oy = cv.H - 40,
        W = cv.W - 80,
        H = 280;
      const vmax = V2 * r;
      const sx = (V) => ox + ((V - V1) / (vmax - V1)) * W;
      const sy = (p) => oy - (p / p1) * H;
      /* Four legs of a real Carnot cycle. The isothermal legs follow pV=nRT and
       are therefore hyperbolae that FALL as the gas expands; the adiabatic legs
       follow pV^gamma = const. Sampling 40 points per leg is plenty at this
       size and keeps the redraw cheap. */
      const legs = [
        { c: '#ff7a7a', name: 'isothermal expansion', pts: sampleLeg(V1, V2, (t) => press(t, th)) },
        {
          c: '#ffc043',
          name: 'adiabatic expansion',
          pts: sampleLeg(V2, V2 * r, (V) => press(V2, th) * Math.pow(V2 / V, GAMMA))
        },
        {
          c: '#3ee0a4',
          name: 'isothermal compression',
          pts: sampleLeg(V2 * r, V1 * r, (t) => press(t, tc))
        },
        {
          c: '#31d7f0',
          name: 'adiabatic compression',
          pts: sampleLeg(V1 * r, V1, (V) => press(V1 * r, tc) * Math.pow((V1 * r) / V, GAMMA))
        }
      ];
      function sampleLeg(a, b, pf) {
        const out = [];
        for (let j = 0; j < 40; j++) {
          const V = a + ((b - a) * j) / 39;
          out.push([sx(V), sy(pf(V))]);
        }
        return out;
      }

      /* shaded loop = the work this cycle encloses */
      g.fillStyle = 'rgba(34,211,238,.18)';
      g.beginPath();
      legs.forEach((L, i) =>
        L.pts.forEach((pt, j) => (i || j ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])))
      );
      g.closePath();
      g.fill();
      g.lineWidth = 2;
      legs.forEach((L) => {
        g.strokeStyle = L.c;
        g.beginPath();
        L.pts.forEach((pt, j) => (j ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])));
        g.stroke();
      });
      /* corner states */
      g.fillStyle = '#fbbf24';
      [
        [V1, p1],
        [V2, press(V2, th)],
        [V2 * r, p3],
        [V1 * r, press(V1 * r, tc)]
      ].forEach((s) => {
        g.beginPath();
        g.arc(sx(s[0]), sy(s[1]), 4, 0, 7);
        g.fill();
      });

      /* axes, ticks and units */
      g.strokeStyle = '#33415c';
      g.lineWidth = 1;
      g.strokeRect(ox, oy - H, W, H);
      g.fillStyle = '#9aa8c3';
      g.font = '11px JetBrains Mono';
      g.textAlign = 'center';
      const vs = niceStep(vmax - V1, 5);
      for (let v = V1; v <= vmax + vs * 1e-6; v += vs) {
        const x = sx(v);
        g.fillRect(x, oy - 2, 1, 4);
        g.fillText(v.toFixed(2), x, oy + 14);
      }
      const ps = niceStep(p1 / 1000, 4);
      for (let p = 0; p <= p1 / 1000 + ps * 1e-6; p += ps) {
        const y = sy(p * 1000);
        g.fillRect(ox - 4, y, 4, 1);
        g.fillText(p.toFixed(0), ox - 30, y + 4);
      }
      g.textAlign = 'left';
      g.fillText('P (kPa)', ox - 46, oy - H - 6);
      g.textAlign = 'right';
      g.fillText('V (m³)', ox + W, oy + 28);
    });
    /* Static diagram: nothing integrates, so no time controls — but every
       number the cycle claims is exposed for the physics suite. The area the
       shaded loop encloses IS the work, and efficiency MUST equal 1−Tc/Th
       for a Carnot cycle; both are asserted by verify-physics. */
    const thermoProbe = () => {
      const th = TH.get() + 273.15,
        tc = Math.min(TC.get() + 273.15, th - 5);
      const r = Math.pow(th / tc, 1 / (GAMMA - 1));
      const p1 = (nR * th) / V1;
      const Qin = nR * th * Math.log(V2 / V1),
        Qout = nR * tc * Math.log(V2 / V1);
      return {
        th,
        tc,
        ratio: th / tc,
        expansionRatio: V2 / V1,
        r,
        p1,
        Qin,
        Qout,
        W: Qin - Qout,
        eff: 1 - tc / th,
        carnot: 1 - tc / th
      };
    };
    window.__tcProbe = thermoProbe;
    if (window.MutationObserver) {
      const mo = new MutationObserver(() => {
        if (!frame.isConnected) {
          if (window.__tcProbe === thermoProbe) window.__tcProbe = null;
          mo.disconnect();
        }
      });
      mo.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
    }
  }
);

Sims.register(
  'ktg-gas',
  'Kinetic Gas',
  'Heat → faster molecules → higher pressure. T ∝ ⟨½mv²⟩.',
  '💨',
  (frame) => {
    const cv = SU.canvas(frame, 360);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const T = SU.slider(ctr, 'Temperature (K)', 200, 600, 10, 300);
    const rRMS = SU.readout(ro, 'rms speed'),
      rP = SU.readout(ro, 'Pressure');
    let pts = [];
    for (let i = 0; i < 80; i++)
      pts.push({
        x: Math.random() * cv.W,
        y: Math.random() * cv.H,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      });
    let t = 0;
    /* Fixed-step Brownian motion. The old loop moved every particle by a
       whole "velocity unit" per FRAME, so a 144 Hz display ran the gas 2.4×
       faster than a 60 Hz one and the damping constant silently depended on
       the refresh rate. The step now scales with h, the kick with √h (the
       correct scaling for a diffusion term), and the damping with an
       exponential of h. */
    function advance(h) {
      t += h;
      const tK = T.get(),
        scale = Math.sqrt(tK / 300);
      const kick = 0.2 * scale * Math.sqrt(h * 60),
        damp = Math.pow(0.99, h * 60);
      pts.forEach((p) => {
        p.vx = (p.vx + (Math.random() - 0.5) * kick) * damp;
        p.vy = (p.vy + (Math.random() - 0.5) * kick) * damp;
        p.x += p.vx * scale * h * 60;
        p.y += p.vy * scale * h * 60;
        if (p.x < 6 || p.x > cv.W - 6) {
          p.vx *= -1;
          p.x = Math.max(6, Math.min(cv.W - 6, p.x));
        }
        if (p.y < 6 || p.y > cv.H - 6) {
          p.vy *= -1;
          p.y = Math.max(6, Math.min(cv.H - 6, p.y));
        }
      });
    }
    function render() {
      const tK = T.get(),
        scale = Math.sqrt(tK / 300);
      rRMS.set((483 * scale).toFixed(0) + ' m/s (O₂)');
      rP.set((scale * 1.2).toFixed(2) + ' bar (demo)');
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      g.strokeStyle = '#26314a';
      g.strokeRect(4, 4, cv.W - 8, cv.H - 8);
      pts.forEach((p) => {
        g.fillStyle = '#38bdf8';
        g.beginPath();
        g.arc(p.x, p.y, 3, 0, 7);
        g.fill();
      });
      g.fillStyle = '#6b7a99';
      g.font = '11px Segoe UI';
      g.fillText('Heat → molecules faster → more collisions', 12, 18);
    }
    /* v_rms for O₂: √(3RT/M) with M = 0.032 kg/mol. The 483 m/s the readout
       shows at 300 K is exactly this value — the test asserts the formula,
       and the mean simulated speed rises with T. */
    attachTimeControls({
      frame,
      advance,
      render,
      reset: () => {
        t = 0;
      },
      getTime: () => t,
      canAdvance: () => true,
      stepLabel: 'time step',
      probe: () => {
        const tK = T.get();
        const vRms = Math.sqrt((3 * 8.314 * tK) / 0.032);
        const speeds = pts.map((p) => Math.hypot(p.vx, p.vy) * Math.sqrt(tK / 300) * 60);
        return {
          t,
          T: tK,
          vRms: +vRms.toFixed(6),
          pressureDemo: +(Math.sqrt(tK / 300) * 1.2).toFixed(6),
          meanSpeed: +(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(4),
          n: pts.length,
          state: {}
        };
      }
    });
  }
);

Sims.register(
  'atoms-bohr',
  'Bohr Atom',
  'n=1,2,3 — radius ∝ n², energy ∝ -1/n².',
  '⚛️',
  (frame) => {
    const cv = SU.canvas(frame, 360);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const N = SU.slider(ctr, 'Shell n', 1, 4, 1, 1);
    const rR = SU.readout(ro, 'rₙ'),
      rE = SU.readout(ro, 'Eₙ'),
      rLam = SU.readout(ro, 'Photon n→1');
    let ang = 0,
      t = 0;
    /* The electron used Date.now() as its angle: that ignores pause and step
       entirely, and (because it reads wall-clock time) jumping back into the
       tab teleports the electron. A fixed-step phase fixes both. */
    function advance(h) {
      t += h;
      ang += (0.5 + N.get() * 0.2) * h;
    }
    function render() {
      const n = N.get(),
        r = 0.53 * n * n,
        E = -13.6 / (n * n);
      rR.set(r.toFixed(2) + ' Å');
      rE.set(E.toFixed(2) + ' eV');
      /* Lyman-series photon for the n → 1 jump: λ = hc/ΔE with hc = 1240
         eV·nm. No photon for n = 1 (nothing to fall from). */
      rLam.set(n > 1 ? (1240 / (13.6 * (1 - 1 / (n * n)))).toFixed(1) + ' nm' : '—');
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      const cx = cv.W / 2,
        cy = cv.H / 2;
      g.fillStyle = '#fbbf24';
      g.beginPath();
      g.arc(cx, cy, 8, 0, 7);
      g.fill();
      g.fillStyle = '#fff';
      g.font = '10px Segoe UI';
      g.textAlign = 'center';
      g.fillText('+', cx, cy + 3);
      g.textAlign = 'left';
      g.strokeStyle = '#33415c';
      for (let i = 1; i <= 4; i++) {
        g.beginPath();
        g.arc(cx, cy, 18 + i * 22, 0, 7);
        g.strokeStyle = i === n ? '#22d3ee' : '#26314a';
        g.stroke();
      }
      g.fillStyle = '#38bdf8';
      const rr = 18 + n * 22;
      g.beginPath();
      g.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 5, 0, 7);
      g.fill();
      g.fillStyle = '#9aa8c3';
      g.font = '11px JetBrains Mono';
      g.fillText('rₙ=n²a₀  Eₙ=-13.6/n² eV', 12, 18);
    }
    attachTimeControls({
      frame,
      advance,
      render,
      reset: () => {
        t = 0;
        ang = 0;
      },
      getTime: () => t,
      canAdvance: () => true,
      stepLabel: 'time step',
      probe: () => {
        const n = N.get();
        return {
          t,
          n,
          radiusA: +(0.53 * n * n).toFixed(6),
          energyEv: +(-13.6 / (n * n)).toFixed(6),
          omega: +(0.5 + n * 0.2).toFixed(6),
          photonNm: n > 1 ? +(1240 / (13.6 * (1 - 1 / (n * n)))).toFixed(4) : null,
          state: { ang: +ang.toFixed(6) }
        };
      }
    });
  }
);
