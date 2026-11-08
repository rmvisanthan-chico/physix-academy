import { pxArrow, pxLabel, SU } from './core.js';
import { Sims } from './sims-a.js';
import { createGraph, GRAPH_COLORS as GC } from './graph-engine.js';
import { createPrediction } from './prediction.js';
import { createSimControls } from './sim-controls.js';
import { attachTimeControls } from './sim-controls-helper.js';
import { Workstation } from './sim-ui.js';
/* PhysiX Academy — Simulations Part C: projectile, SHM, doppler */
('use strict');

/* ---------------- Projectile motion ---------------- */
Sims.register(
  'projectile',
  'Projectile Motion',
  'Launch a shell under gravity and quadratic drag; angle, speed and air resistance decide the range.',
  '🎯',
  (frame) =>
    Workstation.mount(frame, {
      id: 'projectile',
      title: 'Projectile Motion',
      desc: 'A ballistics bench: launch a shell over instrumented ground and watch height, range and the velocity components evolve under gravity and quadratic drag.',
      icon: '🎯',
      topic: 'Mechanics',
      level: 'Grade 11–12',
      appKey: 'projectile',
      height: 300,
      layers: [
        { id: 'real', label: 'Test range' },
        { id: 'science', label: 'Trajectory analysis' }
      ],
      presets: [
        {
          label: '45° standard',
          apply: (s) => {
            s.u = 25;
            s.ang = 45;
            s.h0 = 0;
            s.drag = 0;
          }
        },
        {
          label: 'Low direct',
          apply: (s) => {
            s.u = 25;
            s.ang = 20;
            s.h0 = 0;
            s.drag = 0;
          }
        },
        {
          label: 'High lob',
          apply: (s) => {
            s.u = 30;
            s.ang = 70;
            s.h0 = 0;
            s.drag = 0;
          }
        },
        {
          label: 'Drag + elevation',
          apply: (s) => {
            s.u = 35;
            s.ang = 40;
            s.h0 = 5;
            s.drag = 0.2;
          }
        }
      ],
      graphs: [
        {
          title: 'Height vs time',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Height',
          yUnit: 'm',
          height: 128,
          series: [{ id: 'y', label: 'y', unit: 'm', color: '#22d3ee' }]
        },
        {
          title: 'Velocity components',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Velocity',
          yUnit: 'm/s',
          height: 128,
          series: [
            { id: 'vx', label: 'vx', unit: 'm/s', color: '#a78bfa' },
            { id: 'vy', label: 'vy', unit: 'm/s', color: '#fbbf24' }
          ]
        }
      ],
      setup(api) {
        const { g, W, H, state } = api;
        const G = 9.8;
        const FIXED = 1 / 60;

        state.u = 25;
        state.ang = 45;
        state.h0 = 0;
        state.drag = 0;
        state.st = null;
        state.trail = [];
        state.samples = 0;
        state.onParam = () => {};
        let acc = 0;

        /* --- controls (DOM order: speed, angle, height, drag) --- */
        const sU = api.SU.slider(api.panel, 'Launch speed u', 5, 45, 1, 25, (v) => {
          state.u = v;
          reset();
        });
        const sA = api.SU.slider(api.panel, 'Launch angle θ', 10, 80, 1, 45, (v) => {
          state.ang = v;
          reset();
        });
        const sH = api.SU.slider(api.panel, 'Launch height', 0, 30, 1, 0, (v) => {
          state.h0 = v;
          reset();
        });
        const sD = api.SU.slider(api.panel, 'Drag coefficient', 0, 0.4, 0.01, 0, (v) => {
          state.drag = v;
          reset();
        }, (v) => v.toFixed(2));
        api.SU.btn(api.panel, 'Launch', () => api.transport.reset(), true);

        /* --- readouts --- */
        const rR = api.SU.readout(api.readouts, 'Range', '—');
        const rHm = api.SU.readout(api.readouts, 'Max height', '—');
        const rT = api.SU.readout(api.readouts, 'Flight time', '—');
        const rV = api.SU.readout(api.readouts, 'Speed', '—');

        function ideal() {
          const th = (state.ang * Math.PI) / 180;
          const u = state.u,
            h = state.h0;
          const R = ((u * Math.cos(th)) / G) * (u * Math.sin(th) + Math.sqrt((u * Math.sin(th)) ** 2 + 2 * G * h));
          const Hmax = h + (u * u * Math.sin(th) ** 2) / (2 * G);
          return { R, Hmax };
        }

        /* --- physics (verbatim from the original sim) --- */
        function launch() {
          const th = (state.ang * Math.PI) / 180;
          state.st = {
            x: 0,
            y: state.h0,
            vx: state.u * Math.cos(th),
            vy: state.u * Math.sin(th),
            t: 0,
            hmax: state.h0
          };
          state.trail = [];
          state.done = false;
          state.samples = 0;
          acc = 0;
          api.graphs.forEach((G2) => G2.clear());
          sync();
        }
        function reset() {
          launch();
          if (state.onParam) state.onParam();
        }

        function advance(h) {
          const st = state.st;
          if (!st || state.done) return;
          const k = state.drag;
          st.t += h;
          const sp = Math.hypot(st.vx, st.vy);
          st.vx += -k * st.vx * sp * h;
          st.vy += (-G - k * st.vy * sp) * h;
          st.x += st.vx * h;
          st.y += st.vy * h;
          if (st.y > st.hmax) st.hmax = st.y;
          state.trail.push([st.x, st.y]);
          if (state.trail.length > 400) state.trail.shift();
          if (st.y <= 0 && st.t > 0.05) {
            st.y = 0;
            state.done = true;
          }
        }

        function sample() {
          const st = state.st;
          if (!st) return;
          api.graphs[0].push({ t: st.t, y: st.y });
          api.graphs[1].push({ t: st.t, vx: st.vx, vy: st.vy });
        }

        function sync() {
          const st = state.st,
            id = ideal();
          if (!st) return;
          rR.set(state.done ? st.x.toFixed(1) + ' m' : id.R.toFixed(1) + ' m (ideal)');
          rHm.set(st.hmax.toFixed(1) + ' m');
          rT.set(st.t.toFixed(2) + ' s' + (state.done ? ' ✔' : ''));
          rV.set(Math.hypot(st.vx, st.vy).toFixed(1) + ' m/s');
        }

        /* --- drawing --- */
        const pad = 34;
        function view() {
          const id = ideal();
          const rMax = Math.max(5, id.R);
          const hMax = Math.max(5, id.Hmax);
          const scale = Math.min((W - 70) / rMax, (H - 50) / hMax) * 0.9;
          return { scale, groundY: H - 30, x0: pad };
        }

        function drawReal(glow) {
          const { scale, groundY, x0 } = view();
          /* ground */
          g.fillStyle = 'rgba(255,255,255,0.04)';
          g.fillRect(0, groundY, W, H - groundY);
          g.strokeStyle = 'rgba(154,168,195,0.7)';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(0, groundY);
          g.lineTo(W, groundY);
          g.stroke();
          /* range ticks */
          g.font = '9px "DM Mono", monospace';
          g.textAlign = 'center';
          const step = Math.max(5, Math.round(ideal().R / 6 / 5) * 5);
          for (let m = 0; m <= ideal().R + step; m += step) {
            const px = x0 + m * scale;
            if (px > W - 8) break;
            g.strokeStyle = 'rgba(255,255,255,0.2)';
            g.beginPath();
            g.moveTo(px, groundY);
            g.lineTo(px, groundY + 6);
            g.stroke();
            g.fillStyle = 'rgba(232,237,247,0.45)';
            g.fillText(m + ' m', px, groundY + 18);
          }
          /* launcher */
          const th = (state.ang * Math.PI) / 180;
          const lx = x0,
            ly = groundY - state.h0 * scale;
          g.strokeStyle = 'rgba(232,237,247,0.75)';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(lx, groundY);
          g.lineTo(lx, ly);
          g.moveTo(lx, ly);
          g.lineTo(lx + Math.cos(th) * 26, ly - Math.sin(th) * 26);
          g.stroke();
          /* trail */
          g.fillStyle = 'rgba(34,211,238,0.55)';
          state.trail.forEach((p, i) => {
            if (i % 3) return;
            g.beginPath();
            g.arc(x0 + p[0] * scale, groundY - p[1] * scale, 1.6, 0, 7);
            g.fill();
          });
          /* shell */
          const st = state.st;
          if (st) {
            const bx = x0 + st.x * scale,
              by = groundY - st.y * scale;
            g.save();
            if (glow) {
              g.shadowColor = 'rgba(251,191,36,0.9)';
              g.shadowBlur = 16;
            }
            g.fillStyle = '#fbbf24';
            g.beginPath();
            g.arc(bx, by, 7, 0, 7);
            g.fill();
            g.restore();
            api.pxArrow(g, bx, by, st.vx * scale * 0.06, -st.vy * scale * 0.06, '#34d399', 2);
            api.pxLabel(g, bx + 10, by - 12, 'v', '#34d399');
          }
          api.pxLabel(g, 12, 20, 'PHYSIX BALLISTICS RANGE', 'rgba(232,237,247,0.55)');
        }

        function drawScience(glow) {
          const { scale, groundY, x0 } = view();
          /* grid */
          g.strokeStyle = 'rgba(255,255,255,0.05)';
          g.lineWidth = 1;
          for (let gx = 0; gx < W; gx += 40) {
            g.beginPath();
            g.moveTo(gx, 0);
            g.lineTo(gx, H);
            g.stroke();
          }
          for (let gy = 0; gy < H; gy += 40) {
            g.beginPath();
            g.moveTo(0, gy);
            g.lineTo(W, gy);
            g.stroke();
          }
          /* ideal parabola (no drag) */
          const id = ideal();
          const th = (state.ang * Math.PI) / 180;
          g.strokeStyle = 'rgba(167,139,250,0.55)';
          g.lineWidth = 1.5;
          g.setLineDash([7, 6]);
          g.beginPath();
          for (let i = 0; i <= 60; i++) {
            const x = (id.R * i) / 60;
            const y =
              state.h0 + Math.tan(th) * x - (G * x * x) / (2 * state.u * state.u * Math.cos(th) ** 2);
            if (y < 0) break;
            const px = x0 + x * scale,
              py = groundY - y * scale;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.stroke();
          g.setLineDash([]);
          /* actual trail */
          g.strokeStyle = 'rgba(34,211,238,0.9)';
          g.lineWidth = 2;
          g.beginPath();
          state.trail.forEach((p, i) => {
            const px = x0 + p[0] * scale,
              py = groundY - p[1] * scale;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          });
          g.stroke();
          /* max-height reference */
          const st = state.st;
          if (st) {
            const hy = groundY - st.hmax * scale;
            g.strokeStyle = 'rgba(251,191,36,0.35)';
            g.setLineDash([4, 5]);
            g.beginPath();
            g.moveTo(x0, hy);
            g.lineTo(W - 20, hy);
            g.stroke();
            g.setLineDash([]);
            api.pxLabel(g, W - 120, hy - 6, 'h_max = ' + st.hmax.toFixed(1) + ' m', '#fbbf24');
            /* velocity arrows at the shell */
            const bx = x0 + st.x * scale,
              by = groundY - st.y * scale;
            g.save();
            if (glow) {
              g.shadowColor = 'rgba(251,191,36,0.8)';
              g.shadowBlur = 12;
            }
            g.fillStyle = '#fbbf24';
            g.beginPath();
            g.arc(bx, by, 5, 0, 7);
            g.fill();
            g.restore();
            const kx = 0.06 * scale * 2;
            api.pxArrow(g, bx, by, st.vx * kx, 0, '#22d3ee', 2);
            api.pxArrow(g, bx, by, 0, -st.vy * kx, '#f87171', 2);
            api.pxArrow(g, bx, by, st.vx * kx, -st.vy * kx, '#34d399', 2);
          }
          api.pxLabel(g, 12, 20, 'v = (vx, vy)   g = 9.8 m/s²', 'rgba(232,237,247,0.6)');
        }

        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawScience(api.cfg.shadows);
          else drawReal(api.cfg.shadows);
        }

        function update(dt, t) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < 10) {
            advance(FIXED);
            sample();
            state.samples++;
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0;
          sync();
        }

        function targetFor() {
          const th = (state.ang * Math.PI) / 180;
          const vy0 = state.u * Math.sin(th);
          const tFly = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G * state.h0)) / G;
          return Math.min(Math.max(0.3, 0.4 * tFly), 0.92 * tFly);
        }

        state.targetFor = targetFor;
        launch();
        return {
          update,
          draw,
          reset,
          onPreset() {
            sU.set(state.u);
            sA.set(state.ang);
            sH.set(state.h0);
            sD.set(state.drag);
            reset();
          },
          destroy() {
            if (state._watchTimer) {
              clearInterval(state._watchTimer);
              state._watchTimer = 0;
            }
          },
          targetFor
        };
      },
      predict(api) {
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
            const range = api.graphs[0].timeRange('y');
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
          series: 'y',
          unit: 'm',
          quantity: 'height',
          absFloor: 0.2,
          context() {
            return { u: api.state.u, ang: api.state.ang, h0: api.state.h0, drag: api.state.drag };
          },
          targetTime: () => api.state.targetFor(),
          question() {
            return 'Predict first: what height is the shell at t = ' + api.state.targetFor().toFixed(2) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('y', api.state.targetFor());
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const t = api.state.targetFor();
            const th = (ctx.ang * Math.PI) / 180;
            const y = ctx.h0 + ctx.u * Math.sin(th) * t - 0.5 * 9.8 * t * t;
            return (
              'With gravity alone, y = h + u sinθ·t − ½gt² = ' +
              ctx.h0 +
              ' + ' +
              (ctx.u * Math.sin(th)).toFixed(1) +
              '·' +
              t.toFixed(2) +
              ' − 4.9·' +
              t.toFixed(2) +
              '² ≈ ' +
              y.toFixed(1) +
              ' m. Drag ' +
              (ctx.drag > 0 ? 'lowers the real path slightly' : 'is off, so the ideal parabola is exact') +
              '.'
            );
          },
          onLock() {
            api.transport.reset();
            pendingReveal = api.state.targetFor();
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
        api.state.onParam = () => {
          pendingReveal = null;
          stopWatching();
          pred.refresh();
        };
        pred.refresh();
        return pred;
      },
      probe(api) {
        const st = api.state.st;
        return {
          t: st ? st.t : 0,
          x: st ? st.x : 0,
          y: st ? st.y : 0,
          vy: st ? st.vy : 0,
          y0: api.state.h0,
          done: !!api.state.done,
          samples: api.state.samples
        };
      }
    }),
  { chrome: 'workstation' }
);
/* ---------------- Spring-mass SHM ---------------- */
Sims.register(
  'shm',
  'Spring-Mass SHM',
  'x(t) = A cos ωt — the heartbeat of physics.',
  '⏱️',
  (frame) =>
    Workstation.mount(frame, {
      id: 'shm',
      title: 'Spring-Mass SHM',
      desc: 'A mass on a spring oscillates about equilibrium. Add damping and watch the amplitude decay while the period barely moves — exactly the trade a suspension engineer tunes.',
      icon: '⏱️',
      topic: 'Oscillations',
      level: 'Grade 11–12',
      appKey: 'shm',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Suspension rig' },
        { id: 'science', label: 'Oscillation analysis' }
      ],
      presets: [
        { label: 'Stock suspension', apply: (s) => { s.m = 1.5; s.k = 25; s.d = 0; s.am = 80; } },
        { label: 'Stiff track spring', apply: (s) => { s.m = 1.5; s.k = 60; s.d = 0; s.am = 80; } },
        { label: 'Heavy load', apply: (s) => { s.m = 4; s.k = 25; s.d = 0; s.am = 80; } },
        { label: 'Worn damper', apply: (s) => { s.m = 1.5; s.k = 25; s.d = 3; s.am = 80; } }
      ],
      graphs: [
        {
          title: 'Displacement x(t)',
          xLabel: 'Time',
          xUnit: 's',
          height: 128,
          yLabel: 'x',
          yUnit: 'm',
          series: [{ id: 'x', label: 'x', unit: 'm', color: '#22d3ee' }]
        },
        {
          title: 'Velocity v(t) — leads by a quarter period',
          xLabel: 'Time',
          xUnit: 's',
          height: 128,
          yLabel: 'v',
          yUnit: 'm/s',
          series: [{ id: 'v', label: 'v', unit: 'm/s', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;

        /* ---- physics state ------------------------------------------------
           The integrator is scale-invariant: PX_PER_M only converts the
           pixel-space state for the readouts/graph (x_SI = xPix / 60).
           It changes no period, frequency or damping rate. */
        const PX_PER_M = 60;
        const FIXED = 1 / 60;
        let acc = 0;

        S.m = 1.5; /* kg */
        S.k = 25; /* N/m */
        S.d = 0; /* N·s/m damping coefficient */
        S.am = 80; /* px release amplitude */
        S.xPix = S.am;
        S.v = 0;
        S.gt = 0;
        S.trace = [];
        S.prevX = S.xPix;
        S.lastCross = null;
        S.measuredT = 0;

        const omegaN = () => Math.sqrt(S.k / S.m);
        const zetaOf = () => S.d / (2 * omegaN());
        function regimeOf(z) {
          if (z < 0.001) return 'undamped';
          if (z < 0.99) return 'underdamped';
          if (z < 1.01) return 'critical';
          return 'overdamped';
        }

        /* ---- controls (DOM order M, K, D, AM is the legacy contract) ---- */
        const sM = api.SU.slider(api.panel, 'Mass m (kg)', 0.5, 5, 0.25, 1.5, (v) => {
          S.m = v;
          reset();
        }, (v) => v.toFixed(2) + ' kg');
        const sK = api.SU.slider(api.panel, 'Spring k (N/m)', 5, 80, 1, 25, (v) => {
          S.k = v;
          reset();
        }, (v) => v + ' N/m');
        const sD = api.SU.slider(api.panel, 'Damping c (N·s/m)', 0, 12, 0.1, 0, (v) => {
          S.d = v;
        }, (v) => v.toFixed(1));
        const sA = api.SU.slider(api.panel, 'Amplitude A (px)', 30, 110, 5, 80, (v) => {
          S.am = v;
          reset();
        }, (v) => v + ' px');
        api.SU.btn(api.panel, 'Restart run', () => api.transport.reset(), true);

        /* ---- readouts ---- */
        const rT = api.SU.readout(api.readouts, 'Period T (theory)', '—');
        const rTM = api.SU.readout(api.readouts, 'T measured', '—');
        const rZ = api.SU.readout(api.readouts, 'Damping ζ', '—');
        const rX = api.SU.readout(api.readouts, 'x', '—');
        const rV = api.SU.readout(api.readouts, 'v', '—');

        /* ---- integrator: velocity Verlet, unchanged from the original ----
           Semi-implicit Euler drifted at high k; Verlet keeps the second-order
           accuracy that makes the energy claim honest. */
        function accel(x, vel) {
          return (-S.k / S.m) * x - S.d * vel;
        }
        function advance(h) {
          const a1 = accel(S.xPix, S.v);
          S.xPix += S.v * h + 0.5 * a1 * h * h;
          const vHalf = S.v + 0.5 * a1 * h;
          S.v = vHalf + 0.5 * accel(S.xPix, vHalf) * h;
          S.gt += h;
          /* downward equilibrium crossing = one full period apart */
          if (S.prevX > 0 && S.xPix <= 0) {
            if (S.lastCross !== null) S.measuredT = S.gt - S.lastCross;
            S.lastCross = S.gt;
          }
          S.prevX = S.xPix;
          S.trace.push(S.xPix);
          if (S.trace.length > 320) S.trace.shift();
        }
        function sample() {
          const gx = api.graphs[0],
            gv = api.graphs[1];
          if (gx) gx.push({ t: S.gt, x: S.xPix / PX_PER_M });
          if (gv) gv.push({ t: S.gt, v: S.v / PX_PER_M });
        }

        function reset() {
          S.xPix = S.am;
          S.v = 0;
          S.gt = 0;
          S.trace = [];
          S.prevX = S.xPix;
          S.lastCross = null;
          S.measuredT = 0;
          acc = 0;
          api.graphs.forEach((G) => G.clear());
          sync();
        }

        const periodOf = () => 2 * Math.PI * Math.sqrt(S.m / S.k);

        function sync() {
          const z = zetaOf();
          rT.set(periodOf().toFixed(2) + ' s');
          rTM.set(S.measuredT ? S.measuredT.toFixed(2) + ' s' : '—');
          rZ.set(z.toFixed(2) + ' · ' + regimeOf(z));
          rX.set((S.xPix / PX_PER_M).toFixed(2) + ' m');
          rV.set((S.v / PX_PER_M).toFixed(2) + ' m/s');
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawScience();
          else drawRig();
        }

        function coil(x0, y0, x1, y1, coils, amp) {
          g.beginPath();
          g.moveTo(x0, y0);
          const dx = (x1 - x0) / coils,
            dy = (y1 - y0) / coils;
          for (let i = 1; i <= coils; i++) {
            g.lineTo(x0 + dx * (i - 0.5), y0 + dy * (i - 0.5) + (i % 2 ? amp : -amp));
          }
          g.lineTo(x1, y1);
          g.stroke();
        }

        function drawRig() {
          const midX = W * 0.44;
          const ceil = 40;
          const eqY = H * 0.5;
          const y = eqY + S.xPix * 0.55; /* display-only gain */
          /* gantry */
          g.fillStyle = 'rgba(255,255,255,0.07)';
          g.fillRect(midX - 150, ceil - 18, 300, 10);
          g.strokeStyle = 'rgba(154,168,195,0.7)';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(midX - 140, ceil - 8);
          g.lineTo(midX - 140, H - 40);
          g.moveTo(midX + 140, ceil - 8);
          g.lineTo(midX + 140, H - 40);
          g.stroke();
          /* damper cylinder */
          g.strokeStyle = 'rgba(34,211,238,0.75)';
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(midX + 60, ceil);
          g.lineTo(midX + 60, y - 26);
          g.stroke();
          g.strokeStyle = 'rgba(154,168,195,0.8)';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(midX + 60, ceil);
          g.lineTo(midX + 60, ceil + 26);
          g.stroke();
          /* spring */
          g.strokeStyle = '#9aa8c3';
          g.lineWidth = 2.5;
          coil(midX - 60, ceil, midX - 60, y - 26, 10, 14);
          /* suspended mass (the vehicle body) */
          g.save();
          if (api.cfg.shadows) {
            g.shadowColor = 'rgba(34,211,238,0.7)';
            g.shadowBlur = 16;
          }
          const body = g.createLinearGradient(0, y - 26, 0, y + 26);
          body.addColorStop(0, '#22d3ee');
          body.addColorStop(1, '#0e7490');
          g.fillStyle = body;
          rr(g, midX - 120, y - 26, 240, 52, 8);
          g.fill();
          g.restore();
          g.fillStyle = '#071018';
          g.font = 'bold 13px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText(S.m.toFixed(2) + ' kg', midX, y + 5);
          /* wheel */
          g.fillStyle = '#0b1220';
          g.strokeStyle = 'rgba(232,237,247,0.8)';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(midX, H - 40, 15, 0, Math.PI * 2);
          g.fill();
          g.stroke();
          /* equilibrium marker */
          g.strokeStyle = 'rgba(255,255,255,0.2)';
          g.setLineDash([4, 4]);
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(midX - 150, eqY);
          g.lineTo(midX + 150, eqY);
          g.stroke();
          g.setLineDash([]);
          /* ground */
          g.strokeStyle = '#33415c';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(20, H - 24);
          g.lineTo(W - 20, H - 24);
          g.stroke();
          api.pxLabel(g, 24, 22, 'PHYSIX SUSPENSION RIG', 'rgba(232,237,247,0.7)');
          api.pxLabel(g, W - 150, 22, 'T = ' + periodOf().toFixed(2) + ' s', 'rgba(34,211,238,0.9)');
        }

        function drawScience() {
          /* grid */
          g.strokeStyle = 'rgba(255,255,255,0.05)';
          g.lineWidth = 1;
          for (let x = 0; x < W; x += 40) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, H);
            g.stroke();
          }
          for (let yy = 0; yy < H; yy += 40) {
            g.beginPath();
            g.moveTo(0, yy);
            g.lineTo(W, yy);
            g.stroke();
          }
          const wallX = W * 0.12,
            eqX = W / 2,
            midY = H * 0.42,
            bw = 46;
          g.fillStyle = '#33415c';
          g.fillRect(wallX - 10, midY - 60, 10, 120);
          g.strokeStyle = '#9aa8c3';
          g.lineWidth = 2.5;
          coil(wallX, midY, eqX + S.xPix, midY, 9, 16);
          g.strokeStyle = '#26314a';
          g.lineWidth = 1;
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(wallX, midY + 52);
          g.lineTo(W - 20, midY + 52);
          g.stroke();
          g.setLineDash([]);
          /* mass */
          g.fillStyle = '#6d5df6';
          g.fillRect(eqX + S.xPix - bw / 2, midY - 22, bw, 44);
          g.fillStyle = '#e8edf7';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('m', eqX + S.xPix, midY + 4);
          /* arrows: spring force and velocity */
          const Fs = -S.k * (S.xPix / PX_PER_M);
          api.pxArrow(g, eqX + S.xPix, midY - 40, Math.max(-90, Math.min(90, Fs * 1.2)), 0, '#f87171', 3);
          api.pxLabel(g, eqX + S.xPix + 14, midY - 48, 'F = −kx', '#f87171');
          api.pxArrow(g, eqX + S.xPix, midY + 42, Math.max(-90, Math.min(90, (S.v / PX_PER_M) * 30)), 0, '#34d399', 3);
          api.pxLabel(g, eqX + S.xPix + 14, midY + 58, 'v', '#34d399');
          /* trace strip */
          const gx0 = 30,
            gy0 = H - 16,
            gw = W - 50;
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 2;
          g.beginPath();
          S.trace.forEach((xx, i) => {
            const X = gx0 + (i / 320) * gw,
              Y = gy0 - 8 - (xx / 130) * 34;
            i ? g.lineTo(X, Y) : g.moveTo(X, Y);
          });
          g.stroke();
          g.fillStyle = '#6b7a99';
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('x(t) trace', gx0, gy0 + 2);
          api.pxLabel(
            g,
            W - 230,
            20,
            'ω = ' + omegaN().toFixed(2) + ' rad/s · ζ = ' + zetaOf().toFixed(2),
            'rgba(232,237,247,0.8)'
          );
        }

        function rr(ctx, x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        }

        /* ---- per-frame pump ---- */
        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < 10) {
            advance(FIXED);
            sample();
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0; /* drop backlog, same rule as sim-controls */
          sync();
        }

        reset();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sM.set(S.m);
            sK.set(S.k);
            sD.set(S.d);
            sA.set(S.am);
            reset();
          },
          destroy() {
            if (S._watchTimer) {
              clearInterval(S._watchTimer);
              S._watchTimer = 0;
            }
          }
        };
      },
      probe(api) {
        const S = api.state;
        const z = S.d / (2 * Math.sqrt(S.k / S.m));
        const regime = z < 0.001 ? 'undamped' : z < 0.99 ? 'underdamped' : z < 1.01 ? 'critical' : 'overdamped';
        return {
          t: S.gt,
          x: S.xPix / 60,
          v: S.v / 60,
          m: S.m,
          k: S.k,
          y0: S.am / 60,
          periodTheory: 2 * Math.PI * Math.sqrt(S.m / S.k),
          periodMeasured: S.measuredT || null,
          zeta: z,
          regime,
          state: { x: +S.xPix.toFixed(6), v: +S.v.toFixed(6) }
        };
      },
      predict(api) {
        const S = api.state;
        const periodOf = () => 2 * Math.PI * Math.sqrt(S.m / S.k);
        const targetFor = () => periodOf() * 0.25;
        let pendingReveal = null;
        function stopWatching() {
          if (S._watchTimer) {
            clearInterval(S._watchTimer);
            S._watchTimer = 0;
          }
        }
        function watchForTarget() {
          stopWatching();
          S._watchTimer = setInterval(() => {
            if (!pendingReveal || pred.prediction === null || pred.result) return;
            const range = api.graphs[0].timeRange('x');
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
          series: 'x',
          unit: 'm',
          quantity: 'displacement',
          absFloor: 0.05,
          context() {
            return {
              m: S.m,
              k: S.k,
              d: S.d,
              T: periodOf(),
              paramsText: 'm = ' + S.m + ' kg, k = ' + S.k + ' N/m, T = ' + periodOf().toFixed(2) + ' s'
            };
          },
          targetTime: targetFor,
          question() {
            return 'Predict first: starting from maximum displacement, what is the displacement at t = ' + targetFor().toFixed(2) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('x', targetFor());
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            if (ctx.d > 0.02) {
              return 'Damped, so the mass arrives a little before zero and slightly under the ideal amplitude. Remove damping and this becomes exactly zero: it is the equilibrium crossing.';
            }
            return 'This is the quarter-period. Starting at maximum displacement with v = 0, simple harmonic motion is <b>x(t) = A·cos(ωt)</b>; at t = T/4, ωt = π/2, so cos(π/2) = 0 and x = 0. A quarter of an oscillation after release the mass passes through equilibrium — where its speed is greatest.';
          },
          onLock() {
            api.transport.reset();
            pendingReveal = targetFor();
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
      }
    }),
  { chrome: 'workstation' }
);
/* ---------------- Doppler effect ---------------- */
Sims.register(
  'doppler',
  'Doppler Effect',
  'Wavefronts bunch ahead, stretch behind.',
  '🚑',
  (frame) =>
    Workstation.mount(frame, {
      id: 'doppler',
      title: 'Doppler Effect',
      desc: 'A siren sweeps past a roadside observer. Each wavefront is emitted from a new position, so the spacing the observer meets is (c − v)/f — the shift an ultrasound probe or a police radar measures.',
      icon: '🚑',
      topic: 'Waves',
      level: 'Grade 11–12',
      appKey: 'doppler',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Roadside radar' },
        { id: 'science', label: 'Wavefront analysis' }
      ],
      presets: [
        { label: 'Approaching siren', apply: (s) => { s.vs = 55; s.f = 1.2; } },
        { label: 'Receding siren', apply: (s) => { s.vs = -45; s.f = 1.2; } },
        { label: 'Stationary source', apply: (s) => { s.vs = 0; s.f = 1.2; } },
        { label: 'Supersonic', apply: (s) => { s.vs = 150; s.f = 1.2; } }
      ],
      graphs: [
        {
          title: "Heard frequency f′(t)",
          xLabel: 'Time',
          xUnit: 's',
          height: 128,
          yLabel: "f′",
          yUnit: 'Hz',
          series: [{ id: 'fheard', label: "f′", unit: 'Hz', color: '#22d3ee' }]
        },
        {
          title: 'Wavefront spacing λ′(t) — the measured gap',
          xLabel: 'Time',
          xUnit: 's',
          height: 128,
          yLabel: 'λ′',
          yUnit: 'px',
          series: [{ id: 'gap', label: 'λ′', unit: 'px', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const C = 90; /* wave speed, px/s — unchanged */
        const FIXED = 1 / 60;
        let acc = 0;

        S.vs = 55;
        S.f = 1.2;
        S.rings = [];
        S.srcX = 60;
        S.emitAcc = 0;
        S.t = 0;

        const sV = api.SU.slider(api.panel, 'Source velocity', -60, 160, 5, 55, (v) => {
          S.vs = v;
          S.rings = [];
          S.srcX = 60;
          S.t = 0;
        }, (v) => v + ' px/s');
        const sF = api.SU.slider(api.panel, 'Emitted frequency f (Hz)', 0.5, 3, 0.1, 1.2, (v) => {
          S.f = v;
        }, (v) => v.toFixed(1) + ' Hz');
        api.SU.btn(api.panel, 'Sweep past observer', () => api.transport.reset(), true);

        const rF = api.SU.readout(api.readouts, "Heard f′", '—');
        const rGap = api.SU.readout(api.readouts, 'Wavefront gap λ′', '—');
        const rSt = api.SU.readout(api.readouts, 'Status', '—');

        /* ---- physics: verbatim from the original (emission rhythm is part of
           the measured contract — every wavefront is emitted on the fixed
           1/60 s step from the source position at that instant) ---- */
        function advance(h) {
          S.t += h;
          const vs = sV.get(),
            f = sF.get();
          S.srcX += vs * h;
          if (S.srcX < 20 || S.srcX > W * 0.62) {
            sV.set(-vs);
            S.rings = [];
          }
          S.emitAcc += h;
          if (S.emitAcc > 1 / f) {
            S.emitAcc = 0;
            S.rings.push({ x: S.srcX, y: H * 0.45, r: 2 });
          }
          S.rings.forEach((r) => {
            r.r += C * h;
          });
          S.rings = S.rings.filter((r) => r.r < W * 1.2);
        }

        /* Distance between the two most recent wavefronts along the observer's
           line of sight: a real measurement of (C − vs)/f. */
        function measureGap() {
          if (S.rings.length < 2) return null;
          const a = S.rings[S.rings.length - 2],
            b = S.rings[S.rings.length - 1];
          return a.x + a.r - (b.x + b.r);
        }

        function observed() {
          const vs = sV.get(),
            f = sF.get();
          const obsX = W - 60;
          const vr = vs * Math.sign(obsX - S.srcX);
          const fHeard = (f * C) / Math.max(20, C - vr);
          return { vs, f, obsX, vr, fHeard, gap: measureGap() };
        }

        function sample() {
          const o = observed();
          const g0 = api.graphs[0],
            g1 = api.graphs[1];
          if (g0) g0.push({ t: S.t, fheard: o.fHeard });
          if (g1 && o.gap != null) g1.push({ t: S.t, gap: o.gap });
        }

        function reset() {
          S.rings = [];
          S.srcX = 60;
          S.t = 0;
          S.emitAcc = 0;
          acc = 0;
          api.graphs.forEach((G) => G.clear());
          sync();
        }

        function sync() {
          const o = observed();
          rF.set(o.fHeard.toFixed(2) + ' Hz');
          rGap.set(o.gap != null ? o.gap.toFixed(1) + ' px' : '—');
          rSt.set(
            o.vr > C
              ? '💥 Sonic boom!'
              : o.vr > 0
                ? '🔊 Higher pitch'
                : o.vr < 0
                  ? '🔉 Lower pitch'
                  : '➖ Same pitch'
          );
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          const o = observed();
          if (api.getLayer() === 'science') drawScience(o);
          else drawRoad(o);
        }

        function drawRoad(o) {
          const roadY = H * 0.45;
          /* carriageway */
          g.fillStyle = 'rgba(255,255,255,0.05)';
          g.fillRect(0, roadY + 34, W, H - roadY - 34);
          g.strokeStyle = 'rgba(232,237,247,0.35)';
          g.lineWidth = 2;
          g.setLineDash([18, 14]);
          g.beginPath();
          g.moveTo(0, roadY + 58);
          g.lineTo(W, roadY + 58);
          g.stroke();
          g.setLineDash([]);
          /* sound wavefronts (the physics, still visible in the real view) */
          const reach = W * 0.9;
          S.rings.forEach((r) => {
            const al = Math.max(0, 0.45 * (1 - r.r / reach));
            g.strokeStyle = 'rgba(34,211,238,' + al.toFixed(2) + ')';
            g.lineWidth = 1.4;
            g.beginPath();
            g.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            g.stroke();
          });
          /* vehicle */
          const vy = roadY - 6;
          g.save();
          if (api.cfg.shadows) {
            g.shadowColor = 'rgba(251,191,36,0.8)';
            g.shadowBlur = 16;
          }
          g.fillStyle = '#fbbf24';
          rr(g, S.srcX - 26, vy - 16, 52, 22, 5);
          g.fill();
          g.restore();
          g.fillStyle = '#0b1220';
          g.fillRect(S.srcX - 18, vy - 12, 14, 9);
          g.fillRect(S.srcX + 2, vy - 12, 14, 9);
          for (const wx of [S.srcX - 15, S.srcX + 15]) {
            g.fillStyle = '#0b1220';
            g.strokeStyle = 'rgba(232,237,247,0.7)';
            g.lineWidth = 2;
            g.beginPath();
            g.arc(wx, vy + 8, 6, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          }
          /* observer post */
          g.strokeStyle = 'rgba(154,168,195,0.9)';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(o.obsX, roadY - 34);
          g.lineTo(o.obsX, roadY + 34);
          g.stroke();
          g.fillStyle = '#34d399';
          g.beginPath();
          g.arc(o.obsX, roadY - 38, 8, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = 'rgba(232,237,247,0.85)';
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('observer', o.obsX, roadY + 50);
          api.pxLabel(g, 20, 22, 'PHYSIX ROADSIDE DOPPLER', 'rgba(232,237,247,0.7)');
          api.pxLabel(g, W - 210, 22, "f′ = " + o.fHeard.toFixed(2) + ' Hz', 'rgba(34,211,238,0.95)');
        }

        function drawScience(o) {
          g.strokeStyle = 'rgba(255,255,255,0.05)';
          g.lineWidth = 1;
          for (let x = 0; x < W; x += 40) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, H);
            g.stroke();
          }
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }
          const cy = H * 0.45;
          S.rings.forEach((r) => {
            const al = Math.max(0, 0.55 * (1 - r.r / (W * 0.95)));
            g.strokeStyle = 'rgba(34,211,238,' + al.toFixed(2) + ')';
            g.lineWidth = 1.6;
            g.beginPath();
            g.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            g.stroke();
          });
          /* source */
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc(S.srcX, cy, 8, 0, Math.PI * 2);
          g.fill();
          api.pxLabel(g, S.srcX - 22, cy - 22, 'source', '#fbbf24');
          /* velocity vector */
          api.pxArrow(g, S.srcX, cy + 26, o.vs * 0.28, 0, '#fbbf24', 3);
          /* observer */
          g.fillStyle = '#34d399';
          g.beginPath();
          g.arc(o.obsX, cy, 7, 0, Math.PI * 2);
          g.fill();
          api.pxLabel(g, o.obsX - 26, cy - 22, 'observer', '#34d399');
          /* measured gap bracket between the two newest wavefronts */
          if (S.rings.length >= 2) {
            const a = S.rings[S.rings.length - 2],
              b = S.rings[S.rings.length - 1];
            const y = cy - 96;
            const x1 = a.x + a.r,
              x2 = b.x + b.r;
            g.strokeStyle = '#fbbf24';
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(x1, y);
            g.lineTo(x2, y);
            g.moveTo(x1, y - 5);
            g.lineTo(x1, y + 5);
            g.moveTo(x2, y - 5);
            g.lineTo(x2, y + 5);
            g.stroke();
            api.pxLabel(g, (x1 + x2) / 2 - 12, y - 10, "λ′ = " + (x2 - x1).toFixed(1) + ' px', '#fbbf24');
          }
          api.pxLabel(g, 20, 22, 'f′ = f · c / (c − v_source)', 'rgba(232,237,247,0.8)');
          api.pxLabel(g, 20, 40, 'c = ' + C + ' px/s', 'rgba(107,122,153,0.9)');
          api.pxLabel(
            g,
            W - 250,
            22,
            (o.vr > 0 ? 'approaching' : o.vr < 0 ? 'receding' : 'stationary') + ' · vr = ' + o.vr.toFixed(0) + ' px/s',
            o.vr > 0 ? '#34d399' : o.vr < 0 ? '#fbbf24' : 'rgba(232,237,247,0.8)'
          );
        }

        function rr(ctx, x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        }

        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < 10) {
            advance(FIXED);
            sample();
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0;
          sync();
        }

        reset();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sV.set(S.vs);
            sF.set(S.f);
            reset();
          },
          destroy() {
            if (S._watchTimer) {
              clearInterval(S._watchTimer);
              S._watchTimer = 0;
            }
          }
        };
      },
      probe(api) {
        const S = api.state;
        const vs = S.vs;
        const f = S.f;
        const obsX = api.W - 60;
        const vr = vs * Math.sign(obsX - S.srcX);
        let gap = null;
        if (S.rings.length >= 2) {
          const a = S.rings[S.rings.length - 2],
            b = S.rings[S.rings.length - 1];
          gap = a.x + a.r - (b.x + b.r);
        }
        return {
          t: S.t,
          srcX: S.srcX,
          vs,
          f,
          nRings: S.rings.length,
          gap: gap == null ? null : gap,
          obsX,
          fHeard: (f * 90) / Math.max(20, 90 - vr),
          state: { srcX: +S.srcX.toFixed(6) }
        };
      },
      predict(api) {
        const S = api.state;
        const TARGET = 1.5;
        let pendingReveal = null;
        function stopWatching() {
          if (S._watchTimer) {
            clearInterval(S._watchTimer);
            S._watchTimer = 0;
          }
        }
        function watchForTarget() {
          stopWatching();
          S._watchTimer = setInterval(() => {
            if (!pendingReveal || pred.prediction === null || pred.result) return;
            const range = api.graphs[0].timeRange('fheard');
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
          series: 'fheard',
          unit: 'Hz',
          quantity: 'heard frequency',
          absFloor: 0.2,
          context() {
            const vr = S.vs * Math.sign(api.W - 60 - S.srcX);
            return {
              vs: S.vs,
              f: S.f,
              vr,
              paramsText: 'v_source = ' + S.vs + ' px/s, f = ' + S.f.toFixed(1) + ' Hz, c = 90 px/s'
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: what frequency does the observer hear at t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('fheard', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'The source moves toward the observer, so each wavefront starts closer than the last: the spacing is ' +
              '(c − v)/f and the heard frequency is f′ = f·c/(c − v) = ' +
              ctx.f.toFixed(1) + ' × 90/(90 − ' + ctx.vr.toFixed(0) + ') ≈ ' +
              (ctx.f * 90 / Math.max(20, 90 - ctx.vr)).toFixed(2) + ' Hz. ' +
              'Receding, the same algebra gives a lower pitch — this is the shift an ultrasound probe maps to blood velocity.'
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
      }
    }),
  { chrome: 'workstation' }
);
