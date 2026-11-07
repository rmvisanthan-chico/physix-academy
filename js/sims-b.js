import { SU } from './core.js';
import { Sims } from './sims-a.js';
import { createGraph, GRAPH_COLORS as GC } from './graph-engine.js';
import { createPrediction } from './prediction.js';
import { createSimControls } from './sim-controls.js';
import { attachTimeControls } from './sim-controls-helper.js';
import { Workstation } from './sim-ui.js';
/* PhysiX Academy — Simulations Part B: waves, circuits, magnetism, kinematics */
('use strict');

/* ---------------- Travelling wave ---------------- */
Sims.register(
  'wave',
  'Travelling Wave',
  'Watch a wave crest travel: v = f × λ, live.',
  '🌊',
  (frame) =>
    Workstation.mount(frame, {
      id: 'wave',
      title: 'Travelling Wave',
      desc: 'A ripple-tank wave generator drives a surface wave. Track one crest and the relation v = f × λ falls out of the measurement.',
      icon: '🌊',
      topic: 'Waves',
      level: 'Grade 9–11',
      appKey: 'wave',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Ripple tank' },
        { id: 'science', label: 'Wave trace' }
      ],
      presets: [
        { label: 'Default 1 Hz', apply: (s) => { s.f = 1; s.lambda = 180; s.A = 45; } },
        { label: 'Slow swell', apply: (s) => { s.f = 0.4; s.lambda = 260; s.A = 60; } },
        { label: 'Choppy water', apply: (s) => { s.f = 2.4; s.lambda = 90; s.A = 30; } },
        { label: 'Long swell', apply: (s) => { s.f = 0.6; s.lambda = 380; s.A = 70; } }
      ],
      graphs: [
        {
          title: 'Surface Displacement at x = x₀',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Displacement',
          yUnit: 'px',
          height: 132,
          series: [{ id: 'y', label: 'y', unit: 'px', color: '#22d3ee' }]
        },
        {
          title: 'Crest Travel (unwrapped)',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Distance',
          yUnit: 'px',
          height: 132,
          series: [{ id: 'crest', label: 'crest', unit: 'px', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state } = api;
        const FIXED = 1 / 60;
        const MAX_SUB = 10;

        state.f = 1; /* Hz */
        state.lambda = 180; /* px */
        state.A = 45; /* px */
        state.t = 0;

        let acc = 0;

        const k = () => (2 * Math.PI) / state.lambda;
        const omega = () => 2 * Math.PI * state.f;
        const speed = () => state.f * state.lambda;
        /* Crest position measured modulo one wavelength (probe contract). */
        const crestX = () => ((omega() * state.t) / k()) % state.lambda;
        /* Unwrapped distance the crest has travelled — monotonic, graphable. */
        const crestTravel = () => speed() * state.t;

        const mid = () => H * 0.52;
        const x0 = () => W * 0.52;

        function reset() {
          state.t = 0;
          acc = 0;
        }

        /* The wave is analytic: y(x,t) = −A sin(kx − ωt). Time just advances. */
        function advance(h) {
          state.t += h;
        }

        /* --- controls --- */
        const sF = api.SU.slider(api.panel, 'Frequency f', 0.2, 3, 0.05, 1, (v) => {
          state.f = v;
          sync();
        }, (v) => v.toFixed(2) + ' Hz');
        const sL = api.SU.slider(api.panel, 'Wavelength λ', 60, 400, 5, 180, (v) => {
          state.lambda = v;
          sync();
        }, (v) => v.toFixed(0) + ' px');
        const sA = api.SU.slider(api.panel, 'Amplitude A', 10, 80, 2, 45, (v) => {
          state.A = v;
        }, (v) => v.toFixed(0) + ' px');

        /* --- measurements --- */
        const rV = api.SU.readout(api.readouts, 'Wave speed v = f λ', '180 px/s');
        const rT = api.SU.readout(api.readouts, 'Period T = 1/f', '1.00 s');
        const rF = api.SU.readout(api.readouts, 'Frequency', '1.00 Hz');
        const rLam = api.SU.readout(api.readouts, 'Wavelength', '180 px');
        const rCr = api.SU.readout(api.readouts, 'Crest position', '0 px');

        function sync() {
          rV.set(speed().toFixed(0) + ' px/s');
          rT.set((1 / state.f).toFixed(2) + ' s');
          rF.set(state.f.toFixed(2) + ' Hz');
          rLam.set(state.lambda.toFixed(0) + ' px');
          rCr.set(crestX().toFixed(0) + ' px');
        }
        sync();

        const yAt = (x) => -state.A * Math.sin(k() * x - omega() * state.t);

        /* --- drawing --- */
        function drawTank() {
          const m = mid();
          /* water body */
          const water = g.createLinearGradient(0, m - state.A, 0, H);
          water.addColorStop(0, 'rgba(34,211,238,0.20)');
          water.addColorStop(1, 'rgba(14,116,144,0.05)');
          g.fillStyle = water;
          g.beginPath();
          g.moveTo(0, m);
          for (let x = 0; x <= W; x += 4) g.lineTo(x, m + yAt(x));
          g.lineTo(W, H);
          g.lineTo(0, H);
          g.closePath();
          g.fill();

          /* surface */
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 2.5;
          if (api.cfg.shadows) {
            g.save();
            g.shadowColor = 'rgba(34,211,238,0.7)';
            g.shadowBlur = 12;
          }
          g.beginPath();
          for (let x = 0; x <= W; x += 3) {
            const y = m + yAt(x);
            if (x === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
          if (api.cfg.shadows) g.restore();

          /* tank walls + floor */
          g.strokeStyle = 'rgba(154,168,195,0.55)';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(0, 24);
          g.lineTo(0, H - 22);
          g.lineTo(W, H - 22);
          g.lineTo(W, 24);
          g.stroke();
          g.fillStyle = 'rgba(154,168,195,0.8)';
          g.font = '9px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('PHYSIX RIPPLE BASIN', 10, 18);

          /* wave-maker paddle at the left wall */
          const pad = 6;
          const py = m + yAt(pad);
          g.fillStyle = 'rgba(232,237,247,0.85)';
          g.fillRect(0, py - 22, 8, 44);
          g.fillStyle = 'rgba(34,211,238,0.8)';
          g.fillRect(8, py - 3, 3, 6);

          /* crest marker riding the wave */
          const cx = crestX();
          for (let n = 0; n < 3; n++) {
            const px = cx + n * state.lambda;
            if (px < 0 || px > W) continue;
            const cy2 = m + yAt(px);
            g.fillStyle = '#fbbf24';
            g.beginPath();
            g.arc(px, cy2, n === 0 ? 5 : 3, 0, Math.PI * 2);
            g.fill();
          }
          /* buoy at x0 — bobs vertically */
          const bx = x0();
          const by = m + yAt(bx);
          g.strokeStyle = 'rgba(232,237,247,0.5)';
          g.lineWidth = 1;
          g.setLineDash([3, 4]);
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(bx, H - 24);
          g.stroke();
          g.setLineDash([]);
          g.fillStyle = '#f87171';
          g.beginPath();
          g.arc(bx, by - 10, 6, 0, Math.PI * 2);
          g.fill();
        }

        function drawTrace() {
          const m = mid();
          /* grid + axes */
          g.strokeStyle = 'rgba(255,255,255,0.06)';
          g.lineWidth = 1;
          for (let gx = 0; gx < W; gx += 40) {
            g.beginPath();
            g.moveTo(gx, 0);
            g.lineTo(gx, H);
            g.stroke();
          }
          g.strokeStyle = 'rgba(154,168,195,0.5)';
          g.setLineDash([5, 6]);
          g.beginPath();
          g.moveTo(0, m);
          g.lineTo(W, m);
          g.stroke();
          g.setLineDash([]);

          /* wave */
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 2.5;
          g.beginPath();
          for (let x = 0; x <= W; x += 3) {
            const y = m + yAt(x);
            if (x === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();

          /* λ bracket between two adjacent crests */
          const cx = crestX();
          const c2 = cx + state.lambda;
          const yb = m + state.A + 26;
          if (c2 <= W - 10) {
            g.strokeStyle = 'rgba(251,191,36,0.8)';
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(cx, yb - 8);
            g.lineTo(cx, yb + 6);
            g.moveTo(c2, yb - 8);
            g.lineTo(c2, yb + 6);
            g.moveTo(cx, yb);
            g.lineTo(c2, yb);
            g.stroke();
            g.fillStyle = '#fbbf24';
            g.font = '11px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText('λ = ' + state.lambda.toFixed(0) + ' px', (cx + c2) / 2, yb + 20);
          }
          /* crest + moving marker */
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc(cx, m + yAt(cx), 5, 0, Math.PI * 2);
          g.fill();
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillStyle = 'rgba(232,237,247,0.85)';
          g.fillText(
            'v = f λ = ' + speed().toFixed(0) + ' px/s   ·   T = ' + (1 / state.f).toFixed(2) + ' s',
            14,
            H - 14
          );
        }

        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#081020');
          bg.addColorStop(1, '#05070d');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawTrace();
          else drawTank();
          api.pxLabel(g, W - 118, 18, 't = ' + state.t.toFixed(2) + ' s', 'rgba(232,237,247,0.75)');
        }

        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < MAX_SUB) {
            advance(FIXED);
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0;
          if (n > 0) {
            api.graphs[0].push({ t: state.t, y: yAt(x0()) });
            api.graphs[1].push({ t: state.t, crest: crestTravel() });
          }
          sync();
        }

        function stopWatching() {
          if (state._watchTimer) {
            clearInterval(state._watchTimer);
            state._watchTimer = 0;
          }
        }

        return {
          update,
          draw,
          reset() {
            reset();
            sync();
          },
          onPreset() {
            sF.set(state.f);
            sL.set(state.lambda);
            sA.set(state.A);
            reset();
            sync();
          },
          destroy: stopWatching
        };
      },
      predict(api) {
        const TARGET = 2.0;
        let pendingReveal = null;

        function stopWatching() {
          if (api.state._watchTimer) {
            clearInterval(api.state._watchTimer);
            api.state._watchTimer = 0;
          }
        }
        function watchForTarget() {
          stopWatching();
          api.state._watchTimer = setInterval(() => {
            if (!pendingReveal || pred.prediction === null || pred.result) return;
            const range = api.graphs[1].timeRange('crest');
            if (range && range.to >= pendingReveal) {
              if (pred.reveal()) {
                pendingReveal = null;
                stopWatching();
              }
            }
          }, 120);
        }

        const pred = createPrediction(api.por, {
          graph: api.graphs[1],
          series: 'crest',
          unit: 'px',
          quantity: 'crest travel',
          absFloor: 20,
          context() {
            return {
              f: api.state.f,
              lambda: api.state.lambda,
              paramsText: 'f = ' + api.state.f.toFixed(2) + ' Hz · λ = ' + api.state.lambda.toFixed(0) + ' px'
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: how far has one crest travelled after ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[1].valueAt('crest', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const v = ctx.f * ctx.lambda;
            return (
              'Every crest moves at the wave speed v = f λ = ' +
              ctx.f.toFixed(2) +
              ' × ' +
              ctx.lambda.toFixed(0) +
              ' = ' +
              v.toFixed(0) +
              ' px/s. After ' +
              TARGET.toFixed(1) +
              ' s that is ' +
              (v * TARGET).toFixed(0) +
              ' px. The graph records the crest\'s actual position each step, so its slope is the speed.'
            );
          },
          onLock() {
            api.transport.reset();
            pendingReveal = TARGET;
            api.transport.play();
            pred.refresh();
            watchForTarget();
          },
          onReset() {
            pendingReveal = null;
            stopWatching();
            api.transport.reset();
            pred.refresh();
          }
        });
        pred.refresh();
        return pred;
      },
      probe(api) {
        const s = api.state;
        return {
          t: s.t,
          phase: 2 * Math.PI * s.f * s.t,
          f: s.f,
          lambda: s.lambda,
          crest: ((2 * Math.PI * s.f * s.t) / ((2 * Math.PI) / s.lambda)) % s.lambda,
          T: 1 / s.f,
          v: s.f * s.lambda,
          state: { crest: +(((2 * Math.PI * s.f * s.t) / ((2 * Math.PI) / s.lambda)) % s.lambda).toFixed(6) }
        };
      }
    }),
  { chrome: 'workstation' }
);

/* ---------------- Ohm's law circuit ---------------- */
Sims.register(
  'circuit',
  "Ohm's Law Circuit",
  'V = IR: current, power and charge in a real circuit.',
  '🔌',
  (frame) =>
    Workstation.mount(frame, {
      id: 'circuit',
      title: "Ohm's Law Circuit",
      desc: 'A cell drives current through a resistive load. Watch the electron flow, the load heat up and the charge accumulate.',
      icon: '🔌',
      topic: 'Electricity',
      level: 'Grade 10–11',
      appKey: 'circuit',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Substation bench' },
        { id: 'science', label: 'Schematic' }
      ],
      presets: [
        { label: 'Bench cell 12 V', apply: (s) => { s.V = 12; s.R = 24; } },
        { label: 'Heavy load', apply: (s) => { s.V = 24; s.R = 8; } },
        { label: 'Low current', apply: (s) => { s.V = 3; s.R = 100; } },
        { label: 'Dim bulb', apply: (s) => { s.V = 6; s.R = 60; } }
      ],
      graphs: [
        {
          title: 'Charge Through the Cell — slope = I',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Charge',
          yUnit: 'C',
          height: 132,
          series: [{ id: 'q', label: 'q', unit: 'C', color: '#22d3ee' }]
        },
        {
          title: 'Power Dissipated in the Load',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Power',
          yUnit: 'W',
          height: 132,
          series: [{ id: 'p', label: 'P', unit: 'W', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state } = api;
        const FIXED = 1 / 60;
        const MAX_SUB = 10;

        state.V = 12; /* volts */
        state.R = 24; /* ohms */
        state.q = 0; /* coulombs */
        state.t = 0;
        state.phase = 0;

        let acc = 0;

        const current = () => state.V / state.R;
        const power = () => current() * current() * state.R;

        function reset() {
          state.q = 0;
          state.t = 0;
          state.phase = 0;
          acc = 0;
        }

        /* Ohm's law and charge integration — unchanged physics. */
        function advance(h) {
          const I = state.V / state.R;
          state.q += I * h;
          state.t += h;
          state.phase = (state.phase + Math.min(220, I * 30) * h) % 1;
        }

        /* --- controls --- */
        const sV = api.SU.slider(api.panel, 'Battery V', 1.5, 24, 0.5, 12, (v) => {
          state.V = v;
          sync();
        }, (v) => v.toFixed(1) + ' V');
        const sR = api.SU.slider(api.panel, 'Resistance R', 2, 100, 1, 24, (v) => {
          state.R = v;
          sync();
        }, (v) => v.toFixed(0) + ' Ω');
        api.SU.btn(api.panel, 'Reset charge', () => { reset(); sync(); }, true);

        /* --- measurements --- */
        const rI = api.SU.readout(api.readouts, 'Current I = V/R', '0.00 A');
        const rP = api.SU.readout(api.readouts, 'Power P = I²R', '0.0 W');
        const rQ = api.SU.readout(api.readouts, 'Charge moved', '0.00 C');
        const rV = api.SU.readout(api.readouts, 'Battery', '12.0 V');
        const rR = api.SU.readout(api.readouts, 'Load', '24 Ω');

        function sync() {
          rI.set(current().toFixed(2) + ' A');
          rP.set(power().toFixed(1) + ' W');
          rQ.set(state.q.toFixed(2) + ' C');
          rV.set(state.V.toFixed(1) + ' V');
          rR.set(state.R.toFixed(0) + ' Ω');
        }
        sync();

        /* --- geometry --- */
        const L = 86,
          T = 64,
          Rr = W - 96,
          B = H - 66;

        /* Position along the rectangular loop, 0..1 clockwise from the cell. */
        function onLoop(u) {
          const wTop = Rr - L,
            hSide = B - T,
            per = 2 * (wTop + hSide);
          let d = (((u % 1) + 1) % 1) * per;
          if (d < wTop) return [L + d, T];
          d -= wTop;
          if (d < hSide) return [Rr, T + d];
          d -= hSide;
          if (d < wTop) return [Rr - d, B];
          d -= wTop;
          return [L, B - d];
        }

        function drawBench() {
          /* board */
          g.fillStyle = 'rgba(255,255,255,0.035)';
          g.fillRect(16, 16, W - 32, H - 32);
          g.strokeStyle = 'rgba(154,168,195,0.35)';
          g.lineWidth = 1;
          g.strokeRect(16, 16, W - 32, H - 32);

          /* wires */
          g.strokeStyle = '#8b98b8';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(L, T);
          g.lineTo(Rr, T);
          g.lineTo(Rr, B);
          g.lineTo(L, B);
          g.closePath();
          g.stroke();

          /* electron flow — dots spaced by the integrated phase */
          const I = current();
          if (I > 1e-6) {
            for (let i = 0; i < 16; i++) {
              const p = onLoop(state.phase + i / 16);
              g.fillStyle = 'rgba(34,211,238,0.9)';
              g.beginPath();
              g.arc(p[0], p[1], 3, 0, Math.PI * 2);
              g.fill();
            }
          }

          /* battery block on the left leg */
          const my = (T + B) / 2;
          g.fillStyle = '#131c31';
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 1.5;
          g.fillRect(L - 22, my - 26, 44, 52);
          g.strokeRect(L - 22, my - 26, 44, 52);
          g.fillStyle = '#e8edf7';
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('+', L, my - 10);
          g.fillText('−', L, my + 14);
          g.fillStyle = '#22d3ee';
          g.font = '11px "DM Mono", monospace';
          g.fillText(state.V.toFixed(1) + ' V', L - 44, my + 4);

          /* resistor bank on the top run — heat glow follows P */
          const P = power();
          const heat = Math.min(1, P / 40);
          const rx = (L + Rr) / 2;
          g.save();
          if (api.cfg.shadows && heat > 0.02) {
            g.shadowColor = 'rgba(251,191,36,' + (0.35 + 0.55 * heat).toFixed(2) + ')';
            g.shadowBlur = 10 + 22 * heat;
          }
          g.fillStyle = 'rgba(251,191,36,' + (0.25 + 0.65 * heat).toFixed(2) + ')';
          g.fillRect(rx - 34, T - 12, 68, 24);
          g.restore();
          g.strokeStyle = 'rgba(7,11,22,0.7)';
          g.lineWidth = 1.5;
          for (let i = -2; i <= 2; i++) {
            g.beginPath();
            g.moveTo(rx + i * 12, T - 10);
            g.lineTo(rx + i * 12, T + 10);
            g.stroke();
          }
          g.fillStyle = '#fbbf24';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText(state.R.toFixed(0) + ' Ω', rx, T - 20);

          /* instrument lamp on the right leg */
          const ly = (T + B) / 2;
          const glow = Math.min(1, P / 28);
          if (glow > 0.01) {
            const gr = g.createRadialGradient(Rr + 30, ly, 2, Rr + 30, ly, 46 * glow + 10);
            gr.addColorStop(0, 'rgba(251,191,36,' + (0.5 * glow).toFixed(2) + ')');
            gr.addColorStop(1, 'rgba(251,191,36,0)');
            g.fillStyle = gr;
            g.beginPath();
            g.arc(Rr + 30, ly, 46 * glow + 12, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = glow > 0.02 ? '#ffd977' : 'rgba(232,237,247,0.25)';
          g.beginPath();
          g.arc(Rr + 30, ly, 12, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'rgba(232,237,247,0.85)';
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('I = ' + I.toFixed(2) + ' A', Rr + 44, ly - 16);
          g.fillText('P = ' + P.toFixed(1) + ' W', Rr + 44, ly + 4);

          api.pxLabel(g, 24, 30, 'PHYSIX CIRCUIT BENCH · ideal cell, no internal resistance', 'rgba(154,168,195,0.75)');
        }

        function drawSchematic() {
          g.strokeStyle = 'rgba(255,255,255,0.055)';
          g.lineWidth = 1;
          for (let gx = 0; gx < W; gx += 40) {
            g.beginPath();
            g.moveTo(gx, 0);
            g.lineTo(gx, H);
            g.stroke();
          }
          const mx = W / 2,
            my = H / 2;
          const w2 = Math.min(240, W * 0.34);
          const h2 = 82;

          g.strokeStyle = '#9aa8c3';
          g.lineWidth = 2.5;
          g.strokeRect(mx - w2, my - h2, 2 * w2, 2 * h2);

          /* cell (left edge) */
          const cy = my;
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 2.5;
          g.beginPath();
          g.moveTo(mx - w2, cy - 18);
          g.lineTo(mx - w2, cy + 18);
          g.stroke();
          g.lineWidth = 5;
          g.beginPath();
          g.moveTo(mx - w2 - 8, cy - 11);
          g.lineTo(mx - w2 - 8, cy + 11);
          g.stroke();
          g.fillStyle = '#22d3ee';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'right';
          g.fillText(state.V.toFixed(1) + ' V', mx - w2 - 14, cy + 4);

          /* resistor zigzag (top edge) */
          const rx0 = mx - 60,
            rx1 = mx + 60;
          g.strokeStyle = '#fbbf24';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(rx0, my - h2);
          const steps = 6;
          for (let i = 1; i <= steps; i++) {
            const xx = rx0 + ((rx1 - rx0) * i) / steps;
            g.lineTo(xx, my - h2 + (i % 2 ? -9 : 9));
          }
          g.stroke();
          g.fillStyle = '#fbbf24';
          g.textAlign = 'center';
          g.fillText(state.R.toFixed(0) + ' Ω', mx, my - h2 - 20);

          /* current arrow on the top run */
          g.fillStyle = '#34d399';
          const I = current();
          api.pxArrow(g, mx + 90, my - h2, 34, 0, '#34d399', 2.5);
          api.pxLabel(g, mx + 128, my - h2 - 8, 'I = ' + I.toFixed(2) + ' A', '#34d399');

          /* load (bottom edge) */
          g.strokeStyle = '#e8edf7';
          g.fillStyle = 'rgba(251,191,36,0.18)';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(mx, my + h2, 16, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          g.textAlign = 'center';
          g.fillStyle = 'rgba(232,237,247,0.8)';
          g.font = '11px "DM Mono", monospace';
          g.fillText('I = V / R', mx, my + 44);
          g.fillText('P = I² R = ' + power().toFixed(1) + ' W', mx, my + 62);
          g.fillStyle = 'rgba(232,237,247,0.5)';
          g.fillText('ideal cell (no internal resistance)', mx, H - 16);
        }

        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#05070d');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawSchematic();
          else drawBench();
          api.pxLabel(g, W - 118, 20, 't = ' + state.t.toFixed(2) + ' s', 'rgba(232,237,247,0.75)');
        }

        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < MAX_SUB) {
            advance(FIXED);
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0;
          if (n > 0) {
            api.graphs[0].push({ t: state.t, q: state.q });
            api.graphs[1].push({ t: state.t, p: power() });
          }
          sync();
        }

        function stopWatching() {
          if (state._watchTimer) {
            clearInterval(state._watchTimer);
            state._watchTimer = 0;
          }
        }

        return {
          update,
          draw,
          reset() {
            reset();
            sync();
          },
          onPreset() {
            sV.set(state.V);
            sR.set(state.R);
            reset();
            sync();
          },
          destroy: stopWatching
        };
      },
      predict(api) {
        const TARGET = 2.0;
        let pendingReveal = null;

        function stopWatching() {
          if (api.state._watchTimer) {
            clearInterval(api.state._watchTimer);
            api.state._watchTimer = 0;
          }
        }
        function watchForTarget() {
          stopWatching();
          api.state._watchTimer = setInterval(() => {
            if (!pendingReveal || pred.prediction === null || pred.result) return;
            const range = api.graphs[0].timeRange('q');
            if (range && range.to >= pendingReveal) {
              if (pred.reveal()) {
                pendingReveal = null;
                stopWatching();
              }
            }
          }, 120);
        }

        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'q',
          unit: 'C',
          quantity: 'charge',
          absFloor: 0.2,
          context() {
            return {
              V: api.state.V,
              R: api.state.R,
              I: api.state.V / api.state.R,
              paramsText: 'V = ' + api.state.V.toFixed(1) + ' V · R = ' + api.state.R.toFixed(0) + ' Ω'
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: how much charge has passed the cell after ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('q', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'Ohm\'s law gives I = V/R = ' +
              ctx.V.toFixed(1) +
              '/' +
              ctx.R.toFixed(0) +
              ' = ' +
              ctx.I.toFixed(2) +
              ' A. Charge is the integral of current, q = I t = ' +
              (ctx.I * TARGET).toFixed(2) +
              ' C after ' +
              TARGET.toFixed(1) +
              ' s. The recorded graph slope is exactly that current.'
            );
          },
          onLock() {
            api.transport.reset();
            pendingReveal = TARGET;
            api.transport.play();
            pred.refresh();
            watchForTarget();
          },
          onReset() {
            pendingReveal = null;
            stopWatching();
            api.transport.reset();
            pred.refresh();
          }
        });
        pred.refresh();
        return pred;
      },
      probe(api) {
        const s = api.state;
        const I = s.V / s.R;
        return {
          t: s.t,
          V: s.V,
          R: s.R,
          I,
          P: I * I * s.R,
          q: s.q,
          state: { q: +s.q.toFixed(6) }
        };
      }
    }),
  { chrome: 'workstation' }
);

/* ---------------- Charge in magnetic field ---------------- */
Sims.register('bfield', 'Charge in a B Field', 'Cyclotron motion: r = mv / qB.', '🧭', (frame) => {
  const cv = SU.canvas(frame, 300);
  const ctr = SU.el('div', 'sim-controls');
  frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts');
  frame.appendChild(ro);
  let pos,
    vel,
    trail,
    t = 0;
  const reset = () => {
    pos = [cv.W * 0.3, cv.H / 2];
    vel = [0, -V0.get()];
    trail = [];
    t = 0;
  };
  const V0 = SU.slider(ctr, 'Speed v', 60, 260, 5, 140, reset);
  const B = SU.slider(ctr, 'Field B (signed)', -4, 4, 0.1, 2, reset, (v) => v.toFixed(1));
  const QM = SU.slider(ctr, 'q/m ratio', 0.05, 0.4, 0.01, 0.15, reset, (v) => v.toFixed(2));
  const rR = SU.readout(ro, 'Radius'),
    rT = SU.readout(ro, 'Period'),
    rD = SU.readout(ro, 'Direction');
  reset();
  /* BUG FIX (pre-existing, live): this simulation called SU.btn(act, ...) but
     never declared `act`. That threw "ReferenceError: act is not defined" on
     mount. The error boundary caught it and rendered the frame, so the failure
     was invisible - the page looked fine, but the animation loop below the
     offending line never started, so the readouts sat at their initial em dash
     forever. Found while integrating this sim for time controls; the control bar
     replaces that button, so the reference is gone. */
  function advance(h) {
    t += h;
    const qm = QM.get(),
      b = B.get(),
      w = qm * b;
    /* Exact rotation by the cyclotron angle, then a straight step. This is an
       analytic update, not an Euler approximation of the Lorentz force, so it
       stays exact for any h - which is what makes Step trustworthy here. */
    const ca = Math.cos(w * h),
      sa = Math.sin(w * h);
    vel = [vel[0] * ca - vel[1] * sa, vel[0] * sa + vel[1] * ca];
    pos = [pos[0] + vel[0] * h, pos[1] + vel[1] * h];
    if (pos[0] < -50 || pos[0] > cv.W + 50 || pos[1] < -50 || pos[1] > cv.H + 50) reset();
    trail.push([pos[0], pos[1]]);
    if (trail.length > 900) trail.shift();
  }
  function render() {
    const qm = QM.get(),
      b = B.get(),
      w = qm * b;
    const sp = Math.hypot(vel[0], vel[1]);
    const Rth = Math.abs(sp / (qm * Math.abs(b) || 1));
    rR.set(Rth.toFixed(0) + ' px');
    rT.set(((2 * Math.PI) / Math.abs(w || 1)).toFixed(2) + ' s');
    rD.set(b >= 0 ? '↻ clockwise (+q)' : '↺ anticlockwise (+q)');
    const g = cv.g;
    g.fillStyle = '#05070d';
    g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = 'rgba(107,122,153,.35)';
    g.fillStyle = 'rgba(107,122,153,.55)';
    g.font = '13px Segoe UI';
    g.lineWidth = 1;
    for (let x = 30; x < cv.W; x += 56)
      for (let y = 28; y < cv.H; y += 48) {
        if (b >= 0) {
          g.beginPath();
          g.moveTo(x - 6, y - 6);
          g.lineTo(x + 6, y + 6);
          g.moveTo(x + 6, y - 6);
          g.lineTo(x - 6, y + 6);
          g.stroke();
        } else {
          g.beginPath();
          g.arc(x, y, 6, 0, 7);
          g.stroke();
        }
      }
    g.strokeStyle = 'rgba(109,93,246,.75)';
    g.lineWidth = 2;
    g.beginPath();
    trail.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    g.fillStyle = '#fbbf24';
    g.beginPath();
    g.arc(pos[0], pos[1], 7, 0, 7);
    g.fill();
    g.fillStyle = '#e8edf7';
    g.font = '11px Segoe UI';
    g.fillText('+q', pos[0] + 10, pos[1] - 8);
    SU.arrowH(g, pos[0], pos[1], vel[0] * 0.12, '#34d399');
  }
  attachTimeControls({
    frame,
    advance,
    render,
    reset,
    getTime: () => t,
    /* No canAdvance gate: the particle is never "finished" - it either leaves the
       canvas (which auto-resets) or keeps circulating. */
    stepLabel: 'time step',
    probe: () => {
      const qm = QM.get(),
        b = B.get(),
        w = qm * b;
      const sp = Math.hypot(vel[0], vel[1]);
      return {
        t,
        w,
        speed: sp,
        T: (2 * Math.PI) / Math.abs(w || 1),
        R: Math.abs(sp / (qm * Math.abs(b) || 1)),
        state: { x: +pos[0].toFixed(6), y: +pos[1].toFixed(6) }
      };
    }
  });
});

/* ---------------- 1-D kinematics with graphs ---------------- */
Sims.register(
  'kin1d',
  '1-D Motion Lab',
  'Move a car — watch the graphs being drawn.',
  '🚗',
  (frame) => {
    const cv = SU.canvas(frame, 330);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const act = SU.el('div', 'sim-actions');
    frame.appendChild(act);
    /* Phase 3A graph. This sim already keeps `hist` as [t, x, v] triples for its
     own hand-drawn plot; the graph is fed from the same three numbers, and the
     old canvas plot is left in place because it scales x and v independently
     while the shared engine auto-scales both together. */
    const graph = createGraph(
      frame,
      {
        xLabel: 'Time',
        xUnit: 's',
        xKey: 't',
        yLabel: 'x, v',
        yUnit: 'm, m/s',
        title: 'Position and velocity — a straight line and a straight line',
        height: 190,
        capacity: 900
      },
      [
        { id: 'x', label: 'Position x', unit: 'm', color: GC.a },
        { id: 'v', label: 'Velocity v', unit: 'm/s', color: GC.b }
      ]
    );
    const gTog = SU.el('div', 'sim-actions');
    frame.appendChild(gTog);
    const gtog = (id, label) => {
      const b = document.createElement('button');
      b.className = 'btn btn-sm';
      b.type = 'button';
      b.textContent = label;
      let on = true;
      b.setAttribute('aria-pressed', 'true');
      b.addEventListener('click', () => {
        on = !on;
        graph.setVisible(id, on);
        b.setAttribute('aria-pressed', String(on));
        b.style.opacity = on ? '' : '.55';
      });
      gTog.appendChild(b);
    };
    gtog('x', 'Position');
    gtog('v', 'Velocity');
    if (window.MutationObserver) {
      const mo = new MutationObserver(() => {
        if (!frame.isConnected) {
          graph.destroy();
          mo.disconnect();
        }
      });
      mo.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
    }

    let t = 0,
      hist = [];
    const reset = () => {
      t = 0;
      hist = [];
      graph.clear();
    };
    const U = SU.slider(ctr, 'Initial u (m/s)', -15, 15, 0.5, 4, reset);
    const A = SU.slider(ctr, 'Acceleration a (m/s²)', -4, 4, 0.1, 1, reset);
    const rT = SU.readout(ro, 't'),
      rX = SU.readout(ro, 'x'),
      rV = SU.readout(ro, 'v');
    const XMAX = 60;

    /* Phase 3C: three-way split, same as projectile and SHM. Kinematics 1D is the
     one case where the "physics" is closed-form - x(t) = ut + ½at² evaluated
     directly from the clock - so advance() here only has to move the clock and
     recompute. That is exactly why splitting advance from sample is worth doing
     here: there is no integrator to guard, so Step is trivially exact. */
    function advance(h) {
      t += h;
      /* The 14s auto-replay is preserved. It is a deliberate feature: the car
       driving off the right edge and restarting keeps the demo alive. Note it
       fires inside advance, so it cannot run while paused - a paused sim at
       t = 14.01 stays paused rather than silently resetting. */
      if (t > 14) reset();
    }

    function sample() {
      const u = U.get(),
        a = A.get();
      const x = u * t + 0.5 * a * t * t;
      const v = u + a * t;
      hist.push([t, x, v]);
      if (hist.length > 1200) hist.shift();
      graph.push({ t, x, v });
    }

    function render() {
      const u = U.get(),
        a = A.get();
      const x = u * t + 0.5 * a * t * t;
      const v = u + a * t;
      rT.set(t.toFixed(1) + ' s');
      rV.set(v.toFixed(1) + ' m/s');
      rX.set(Math.max(-999, Math.min(x, 999)).toFixed(1) + ' m');
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      const roadY = 46,
        pxPerM = cv.W / XMAX;
      const carX = Math.max(-30, Math.min(cv.W + 30, x * pxPerM));
      g.strokeStyle = '#33415c';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, roadY + 16);
      g.lineTo(cv.W, roadY + 16);
      g.stroke();
      g.strokeStyle = '#26314a';
      for (let i = 10; i < cv.W; i += 40) {
        g.beginPath();
        g.moveTo(i, roadY + 16);
        g.lineTo(i - 12, roadY + 26);
        g.stroke();
      }
      g.fillStyle = '#6d5df6';
      g.fillRect(carX - 17, roadY - 8, 34, 16);
      g.fillStyle = '#22d3ee';
      g.beginPath();
      g.arc(carX - 9, roadY + 10, 5, 0, 7);
      g.fill();
      g.beginPath();
      g.arc(carX + 9, roadY + 10, 5, 0, 7);
      g.fill();
      const gx0 = 44,
        gy0 = cv.H - 24,
        gw = cv.W - 66,
        gh = cv.H - 110;
      g.strokeStyle = '#33415c';
      g.lineWidth = 1;
      g.strokeRect(gx0, gy0 - gh, gw, gh);
      g.fillStyle = '#6b7a99';
      g.font = '11px Segoe UI';
      g.fillText('x (m)', gx0 - 36, gy0 - gh / 2);
      g.fillText('v (m/s)', gx0 - 44, gy0 - gh / 2 + 14);
      g.fillText('t → ' + t.toFixed(0) + 's', gx0 + gw - 52, gy0 + 14);
      const tMax = 14,
        xScale = Math.max(XMAX, ...hist.map((h) => Math.abs(h[1]))) * 1.05 || XMAX;
      const vScale = Math.max(16, ...hist.map((h) => Math.abs(h[2]))) * 1.05;
      const plot = (col, idx, scale) => {
        g.strokeStyle = col;
        g.lineWidth = 2;
        g.beginPath();
        hist.forEach((h, i) => {
          const X = gx0 + (h[0] / tMax) * gw;
          const Y = gy0 - (h[idx] / scale) * (gh / 2) - (idx === 1 ? gh / 2 : 0);
          i ? g.lineTo(X, Y) : g.moveTo(X, Y);
        });
        g.stroke();
      };
      plot('#22d3ee', 1, xScale);
      plot('#34d399', 2, vScale);
    }

    /* The old "⟲ Replay" button is replaced by the shared bar's Reset - see the
     note on the SHM side. Two differently-behaved resets in one panel is worse
     than none. */
    const controls = createSimControls({
      parent: frame,
      advance,
      sample,
      render,
      reset,
      getTime: () => t,
      timeUnit: 's',
      canAdvance: () => t <= 14,
      stepLabel: 'time step'
    });

    const kinProbe = () => {
      const u = U.get(),
        a = A.get();
      return {
        t,
        x: u * t + 0.5 * a * t * t,
        v: u + a * t,
        y0: 0,
        paused: controls.isPaused(),
        samples: graph.sampleCount('x') /* one series only - see the projectile note */,
        calls: controls.advanceCalls()
      };
    };
    window.__tcProbe = kinProbe;
    const clearProbe = () => {
      if (window.__tcProbe === kinProbe) window.__tcProbe = null;
    };

    /* ---------- Phase 3B prediction ----------
     Constant acceleration is the clearest prediction in the whole set, because
     both curves are exactly straight lines and the answer can be checked with
     arithmetic. "Where is it at t = 3 s?" is the canonical first kinematics
     question, and it is reachable for every value of u and a since the run
     lasts 14 s. Target is clamped to stay inside that run even at the extremes
     of both sliders. */
    const T_MAX = 14; /* must match the loop's reset point */
    const targetFor = () => Math.min(3, T_MAX * 0.6);

    let pendingReveal = null;
    let revealTimer = 0;
    function stopWatching() {
      if (revealTimer) {
        clearInterval(revealTimer);
        revealTimer = 0;
      }
    }
    function watchForTarget() {
      stopWatching();
      revealTimer = setInterval(() => {
        if (!pendingReveal || pred.prediction === null || pred.result) return;
        const range = graph.timeRange('x');
        if (range && range.to >= pendingReveal) {
          if (pred.reveal()) {
            pendingReveal = null;
            stopWatching();
          }
        }
      }, 120);
    }

    const pred = createPrediction(frame, {
      graph,
      series: 'x',
      unit: 'm',
      quantity: 'position',
      absFloor: 0.4 /* metres; positions here run to tens of metres */,
      context() {
        const u = U.get(),
          a = A.get();
        return {
          u,
          a,
          paramsText: `u = ${u} m/s, a = ${a} m/s²`
        };
      },
      targetTime: targetFor,
      question() {
        return `Predict first: where is the car at t = ${targetFor().toFixed(1)} s?`;
      },
      observe() {
        const hit = graph.valueAt('x', targetFor());
        return hit ? { value: hit.y, exact: hit.exact } : null;
      },
      explain(r, ctx) {
        const t = targetFor();
        const x = ctx.u * t + 0.5 * ctx.a * t * t;
        return `Constant acceleration means <b>x = ut + ½at²</b>, and it is a straight line in t².
        Here x = (${ctx.u})(t) + ½(${ctx.a})(${t})² = ${x.toFixed(1)} m.
        Try sliding a negative: the parabola curves the other way, and the position falls through zero.`;
      },
      onLock() {
        /* Phase 3C: resume the run. The reveal poller waits on the graph's
         recorded range and a paused graph does not grow, so locking a prediction
         while paused would leave the student waiting on a reveal that can never
         arrive. */
        reset();
        pendingReveal = targetFor();
        controls.play();
        pred.refresh();
        watchForTarget();
      },
      onReset() {
        pendingReveal = null;
        stopWatching();
        reset();
        pred.refresh();
      }
    });
    pred.refresh();

    if (window.MutationObserver) {
      const mo2 = new MutationObserver(() => {
        if (!frame.isConnected) {
          stopWatching();
          controls.destroy();
          clearProbe();
          mo2.disconnect();
        }
      });
      mo2.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
    }
    return { controls, graph, getTime: () => t };
  }
);
