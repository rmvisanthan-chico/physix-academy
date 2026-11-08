/* PhysiX Academy — Workstation Demo (sim-transform, Phase B scratch sim)
   ------------------------------------------------------------
   "Dynamics cart on a test track" — a F = ma cart pushed along a 60 m track
   with friction, integrated with a fixed-timestep semi-implicit Euler
   (the project's standard integrator). Registered HIDDEN (meta.hidden) so it
   is routable at #/sims/workstation-demo but does not count toward the 40-sim
   catalogue, and chrome:'workstation' so the shared Workstation design system
   owns the header, transport, side panel, graphs and POR.

   Purpose: prove the Phase B design system end to end — real-world
   application chip (EV test track), dual view layers (real-world track vs
   scientific force diagram), presets, live measurements, two Graph-engine
   plots, and a real-data Predict → Observe → Reason prompt.
*/
import { Sims } from './sims-a.js';
import { Workstation } from './sim-ui.js';
import { createPrediction } from './prediction.js';

'use strict';

const G = 9.8;

Sims.register(
  'workstation-demo',
  'Dynamics Cart Test Track',
  'Push a cart on a 60 m test track — F = ma with friction, live measurements, dual view.',
  '🛒',
  (frame) =>
    Workstation.mount(frame, {
      id: 'workstation-demo',
      title: 'Dynamics Cart Test Track',
      desc: 'A push force accelerates a cart along a 60 m track. Friction resists. Watch force, motion and energy trade in real time.',
      icon: '🛒',
      topic: 'Mechanics',
      level: 'Grade 9–10',
      appKey: 'newton',
      height: 340,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Real-world' },
        { id: 'science', label: 'Scientific' }
      ],
      presets: [
        { label: 'Smooth dyno', apply: (s) => { s.F = 24; s.mu = 0.02; s.m = 6; } },
        { label: 'Loaded track', apply: (s) => { s.F = 24; s.mu = 0.02; s.m = 14; } },
        { label: 'Rough surface', apply: (s) => { s.F = 24; s.mu = 0.25; s.m = 6; } }
      ],
      graphs: [
        {
          title: 'Position vs Time',
          xLabel: 'Time',
          xUnit: 's',
          height: 150,
          yLabel: 'Position',
          yUnit: 'm',
          series: [{ id: 'x', label: 'x', unit: 'm', color: '#22d3ee' }]
        },
        {
          title: 'Velocity vs Time',
          xLabel: 'Time',
          xUnit: 's',
          height: 150,
          yLabel: 'Velocity',
          yUnit: 'm/s',
          series: [{ id: 'v', label: 'v', unit: 'm/s', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state } = api;
        const TRACK = 60; /* metres */

        /* --- state (physics) --- */
        state.F = 24; /* N, applied push */
        state.mu = 0.02; /* kinetic friction coefficient */
        state.m = 6; /* kg */
        state.x = 0;
        state.v = 0;
        state.a = 0;
        state.t = 0;

        /* fixed-timestep integrator: the workstation hands us a wall-clock dt
           (already clamped); we re-slice it into 1/240 s sub-steps so the
           physics is frame-rate independent, exactly like the other sims. */
        const HSTEP = 1 / 240;
        let acc = 0;
        function accel() {
          const Ff = state.mu * state.m * G;
          const Fnet = Math.max(0, state.F - Ff);
          return Fnet / state.m;
        }
        function substep(h) {
          const a = accel();
          state.v += a * h; /* semi-implicit: velocity first, then position */
          state.x += state.v * h;
          state.a = a;
          state.t += h;
        }
        /* shared with predict(): the reveal watcher's interval lives on state
           so the scene's destroy() can clear it (predict() runs after setup) */
        function stopWatching() {
          if (state._watchTimer) {
            clearInterval(state._watchTimer);
            state._watchTimer = 0;
          }
        }

        /* --- controls --- */
        const sF = api.SU.slider(api.panel, 'Push force F', 0, 60, 1, 24, (v) => (state.F = v), (v) => v + ' N');
        const sMu = api.SU.slider(api.panel, 'Friction μ', 0, 0.5, 0.01, 0.02, (v) => (state.mu = v), (v) => v.toFixed(2));
        const sM = api.SU.slider(api.panel, 'Cart mass m', 2, 20, 1, 6, (v) => (state.m = v), (v) => v + ' kg');
        api.SU.btn(api.panel, 'Reset run', () => reset(), true);

        /* --- readouts --- */
        const rX = api.SU.readout(api.readouts, 'x (m)', '0.0');
        const rV = api.SU.readout(api.readouts, 'v (m/s)', '0.00');
        const rA = api.SU.readout(api.readouts, 'a (m/s²)', '0.00');
        const rF = api.SU.readout(api.readouts, 'F_net (N)', '0.0');

        /* --- view scale: 60 m across the stage --- */
        const pad = 46;
        const mPerPx = (W - pad * 2) / TRACK;
        const trackY = () => H * 0.62;
        const xPix = (x) => pad + x * mPerPx;

        function reset() {
          state.x = 0;
          state.v = 0;
          state.a = accel();
          state.t = 0;
          acc = 0;
        }
        reset();

        /* ================= drawing ================= */
        function draw() {
          const glow = api.cfg.shadows;
          g.clearRect(0, 0, W, H);
          /* backdrop */
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);

          if (api.getLayer() === 'science') drawScience(glow);
          else drawReal(glow);
        }

        function drawReal(glow) {
          const ty = trackY();
          /* track bed */
          g.fillStyle = 'rgba(255,255,255,0.05)';
          g.fillRect(pad - 20, ty, W - (pad - 20) * 2, 14);
          /* lane centreline */
          g.strokeStyle = 'rgba(34,211,238,0.55)';
          g.lineWidth = 2;
          g.setLineDash([14, 12]);
          g.beginPath();
          g.moveTo(pad - 20, ty + 7);
          g.lineTo(W - pad + 20, ty + 7);
          g.stroke();
          g.setLineDash([]);
          /* metre markers every 10 m */
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'center';
          for (let m = 0; m <= TRACK; m += 10) {
            const px = xPix(m);
            g.strokeStyle = 'rgba(255,255,255,0.25)';
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(px, ty + 14);
            g.lineTo(px, ty + 20);
            g.stroke();
            g.fillStyle = 'rgba(232,237,247,0.5)';
            g.fillText(m + ' m', px, ty + 32);
          }
          /* start gantry */
          g.strokeStyle = 'rgba(154,168,195,0.7)';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(pad - 14, ty + 14);
          g.lineTo(pad - 14, ty - 52);
          g.moveTo(pad + 26, ty + 14);
          g.lineTo(pad + 26, ty - 52);
          g.moveTo(pad - 18, ty - 52);
          g.lineTo(pad + 30, ty - 52);
          g.stroke();
          g.fillStyle = 'rgba(154,168,195,0.9)';
          g.font = '9px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('PHYSIX DYNAMICS TEST', pad - 18, ty - 60);

          /* cart */
          const cx = xPix(Math.min(state.x, W / mPerPx - 10));
          const cy = ty - 16;
          g.save();
          if (glow) {
            g.shadowColor = 'rgba(34,211,238,0.8)';
            g.shadowBlur = 18;
          }
          const body = g.createLinearGradient(cx, cy - 18, cx, cy + 16);
          body.addColorStop(0, '#22d3ee');
          body.addColorStop(1, '#0e7490');
          g.fillStyle = body;
          roundRect(g, cx, cy - 18, 54, 32, 6);
          g.fill();
          g.restore();
          /* speed streaks when moving fast */
          if (state.v > 4) {
            g.strokeStyle = 'rgba(34,211,238,0.35)';
            g.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
              const yy = cy - 10 + i * 10;
              g.beginPath();
              g.moveTo(cx - 8 - i * 10, yy);
              g.lineTo(cx - 26 - i * 14, yy);
              g.stroke();
            }
          }
          /* wheels */
          g.fillStyle = '#0b1220';
          g.strokeStyle = 'rgba(232,237,247,0.8)';
          g.lineWidth = 2;
          for (const wx of [cx + 12, cx + 42]) {
            g.beginPath();
            g.arc(wx, ty + 4, 9, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          }
          /* live caption (pxLabel is left-aligned — keep it clear of the right edge) */
          api.pxLabel(g, W - 140, 22, 't = ' + state.t.toFixed(1) + ' s', 'rgba(232,237,247,0.75)');
        }

        function drawScience(glow) {
          /* subtle grid */
          g.strokeStyle = 'rgba(255,255,255,0.06)';
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
          const cx = W / 2,
            cy = H / 2 - 10;
          const bw = 120,
            bh = 70;
          /* free-body box */
          g.save();
          if (glow) {
            g.shadowColor = 'rgba(34,211,238,0.7)';
            g.shadowBlur = 16;
          }
          g.fillStyle = 'rgba(34,211,238,0.14)';
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 2;
          roundRect(g, cx - bw / 2, cy - bh / 2, bw, bh, 8);
          g.fill();
          g.stroke();
          g.restore();
          g.fillStyle = '#e8edf7';
          g.font = '12px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('cart  ' + state.m + ' kg', cx, cy + 4);

          const F = state.F;
          const Ff = state.mu * state.m * G;
          const N = state.m * G;
          const s = 1.1; /* px per newton */
          api.pxArrow(g, cx + bw / 2, cy, F * s, 0, '#22d3ee', 4);
          api.pxLabel(g, cx + bw / 2 + F * s + 8, cy - 10, 'F = ' + F.toFixed(0) + ' N', '#22d3ee');
          if (Ff > 0.01) {
            api.pxArrow(g, cx - bw / 2, cy, -Ff * s, 0, '#fbbf24', 4);
            api.pxLabel(g, cx - bw / 2 - Ff * s - 8, cy + 16, 'Ff = ' + Ff.toFixed(1) + ' N', '#fbbf24');
          }
          api.pxArrow(g, cx, cy + bh / 2, 0, N * s * 0.6, 'rgba(232,237,247,0.8)', 3);
          api.pxLabel(g, cx + 10, cy + bh / 2 + N * s * 0.6 + 12, 'W = ' + N.toFixed(0) + ' N', 'rgba(232,237,247,0.8)');
          api.pxArrow(g, cx, cy - bh / 2, 0, -N * s * 0.6, 'rgba(232,237,247,0.8)', 3);
          api.pxLabel(g, cx + 10, cy - bh / 2 - N * s * 0.6 - 16, 'N = ' + N.toFixed(0) + ' N', 'rgba(232,237,247,0.8)');
          /* net acceleration readout */
          api.pxLabel(
            g,
            W / 2,
            H - 24,
            'a = F_net / m = ' + state.a.toFixed(2) + ' m/s²',
            '#34d399'
          );
        }

        function roundRect(ctx, x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        }

        /* ================= per-frame ================= */
        function update(dt, t) {
          state.t = t;
          acc += dt;
          let n = 0;
          while (acc >= HSTEP && n < 24) {
            substep(HSTEP);
            acc -= HSTEP;
            n++;
          }
          const graph = api.graphs[0];
          if (graph) graph.push({ t: state.t, x: state.x });
          const gv = api.graphs[1];
          if (gv) gv.push({ t: state.t, v: state.v });
          rX.set(state.x.toFixed(1));
          rV.set(state.v.toFixed(2));
          rA.set(state.a.toFixed(2));
          rF.set((state.F - state.mu * state.m * G).toFixed(1));
        }

        return {
          update,
          draw,
          reset,
          destroy() {
            stopWatching();
          }
        };
      },
      predict(api) {
        const TARGET = 2.0;
        let pendingReveal = null;
        /* The interval lives on the shared state so the scene's destroy()
           (which calls the setup-scoped stopWatching) clears it on unmount. */
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
          quantity: 'position',
          absFloor: 0.3,
          context() {
            return {
              F: api.state.F,
              m: api.state.m,
              mu: api.state.mu,
              a: api.state.a
            };
          },
          targetTime: () => TARGET,
          question() {
            return `Predict first: where is the cart at t = ${TARGET.toFixed(1)} s?`;
          },
          observe() {
            const hit = api.graphs[0].valueAt('x', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const a = Math.max(0, ctx.F - ctx.mu * ctx.m * G) / ctx.m;
            const x = 0.5 * a * TARGET * TARGET;
            return `With F = ma, the net force is F − μmg = ${ctx.F.toFixed(0)} − ${(ctx.mu * ctx.m * G).toFixed(1)} N, giving a = ${a.toFixed(2)} m/s². Starting from rest, x = ½at² = ${x.toFixed(1)} m. Friction is what makes the track "loaded" feel different.`;
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
  { hidden: true, chrome: 'workstation' }
);
