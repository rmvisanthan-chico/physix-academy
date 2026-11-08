import { pxArrow, pxLabel, SU } from './core.js';
import { esc, Store } from './utils.js';
import { collide1D, stepOrbit, orbitalEnergy } from './physics.js';
import { Workstation } from './sim-ui.js';
import { createPrediction } from './prediction.js';
/* PhysiX Academy — Simulations Part A: registry, helpers + mechanics */
('use strict');

/* Lazy-load the sims-loader to avoid circular dependency */
let _ensureSimPromise = null;
async function ensureSim(id) {
  if (!_ensureSimPromise) {
    const mod = await import('./sims-loader.js');
    _ensureSimPromise = mod.ensureSim;
  }
  return _ensureSimPromise(id);
}

export const Sims = {
  reg: {},
  /* meta (optional): per-simulation flags consumed by the platform, e.g.
     { hidden: true } keeps the simulation routable but out of the catalogue,
     { chrome: 'workstation' } opts out of the generic sim-head so the
     Workstation design system (js/sim-ui.js) owns the header. */
  register(id, title, desc, icon, run, meta) {
    this.reg[id] = Object.assign({ id, title, desc, icon, run }, meta || {});
  },
  async mount(id, host) {
    host.innerHTML = '';
    let def = this.reg[id];
    if (!def) {
      /* Try to lazy-load the simulation module */
      try {
        def = await ensureSim(id);
      } catch (e) {
        console.error('[Sims.mount] Failed to load sim:', id, e);
      }
      if (!def) {
        host.innerHTML =
          '<div class="empty-state"><div class="big">🚧</div><p>Simulation "' +
          esc(id) +
          '" is coming soon.</p></div>';
        return;
      }
    }
    const frame = SU.el(
      'div',
      'sim-frame' + (def.chrome === 'workstation' ? ' sim-frame-ws' : '')
    );
    /* Workstation sims (chrome: 'workstation') build their own header via
       js/sim-ui.js; the generic head would duplicate the title. */
    if (def.chrome !== 'workstation') {
      frame.innerHTML =
        '<div class="sim-head">' +
        '<span class="sim-icon" aria-hidden="true">' +
        esc(def.icon || '🧪') +
        '</span>' +
        '<div class="sim-head-text">' +
        '<b class="sim-title">' +
        esc(def.title) +
        '</b>' +
        '<span class="sim-desc">' +
        esc(def.desc) +
        '</span>' +
        '</div>' +
        '<span class="sim-badge">Interactive</span>' +
        '</div>';
    }
    host.appendChild(frame);
    /* The per-simulation page passes a .sim-slot-lg that lives INSIDE #main,
         so observing that host is not enough: the router replaces #main's
         innerHTML wholesale, which detaches the host without ever mutating it.
         The first version of this observer watched the host and therefore
         never fired, so nothing was ever recorded - caught by a test that
         clicked links the way a student does.

         #main is the reliable ancestor: it IS mutated on every route change. */
    const root = document.getElementById('main') || host;

    /* Phase 2 integration, in one place so 51 simulations need no changes.
         Previously no simulation file referenced Store at all, which meant the
         dashboard could say a student had never touched a simulation even
         after an hour of using them.

         Mounted at the FRAME level rather than per-simulation because SU.loop
         already pauses on document.hidden: time is measured with a running
         clock that excludes hidden time, so an idle tab left open overnight
         does not become "4000 minutes of study". Reported on unmount and on
         pagehide, since either can be the last event. */
    const startedAt = performance.now();
    let counted = false;
    const report = () => {
      if (counted) return;
      counted = true;
      /* A mount that lasted under 2s was a mis-click, not study. */
      const ms = performance.now() - startedAt;
      if (ms < 2000) return;
      try {
        Store.noteSimOpened(id, ms);
      } catch (e) {
        /* storage unavailable: never block a simulation on it */
      }
    };
    /* Unmount is the only reliable signal available for an SPA route change. */
    if (window.MutationObserver) {
      const mo = new MutationObserver(() => {
        if (!frame.isConnected) {
          report();
          mo.disconnect();
        }
      });
      /* subtree:true because #main's children are replaced wholesale, so a
           mutation can land on a descendant rather than on #main itself. */
      mo.observe(root, { childList: true, subtree: true });
    }
    window.addEventListener('pagehide', report, { once: true });

    let result;
    try {
      result = def.run(frame);
    } catch (err) {
      console.error('Sim error:', id, err);
      frame.insertAdjacentHTML(
        'beforeend',
        '<div class="empty-state">This simulation failed to start.</div>'
      );
      return null;
    }
    return result;
  }
};

/* ---------------- Newton's second law ---------------- */
Sims.register(
  'newton',
  "Newton's Second Law",
  'Push a cart — full force diagram: weight, normal, friction, net F = ma.',
  '🛒',
  (frame) =>
    Workstation.mount(frame, {
      id: 'newton',
      title: "Newton's Second Law",
      desc: 'A test-track cart under a controlled push. Friction resists, and the force balance decides whether it moves at all.',
      icon: '🛒',
      topic: 'Mechanics',
      level: 'Grade 9–10',
      appKey: 'newton',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Test track' },
        { id: 'science', label: 'Force diagram' }
      ],
      presets: [
        {
          label: 'Light cart',
          apply: (s) => {
            s.F = 20;
            s.m = 2;
            s.mu = 0.05;
          }
        },
        {
          label: 'Loaded trolley',
          apply: (s) => {
            s.F = 20;
            s.m = 12;
            s.mu = 0.1;
          }
        },
        {
          label: 'Rough floor',
          apply: (s) => {
            s.F = 20;
            s.m = 6;
            s.mu = 0.35;
          }
        },
        {
          label: 'Pinned by friction',
          apply: (s) => {
            s.F = 5;
            s.m = 6;
            s.mu = 0.2;
          }
        }
      ],
      graphs: [
        {
          title: 'Velocity vs Time',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Velocity',
          yUnit: 'm/s',
          height: 132,
          series: [{ id: 'v', label: 'v', unit: 'm/s', color: '#22d3ee' }]
        },
        {
          title: 'Net Force vs Time',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Net force',
          yUnit: 'N',
          height: 132,
          series: [{ id: 'fnet', label: 'F_net', unit: 'N', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state } = api;
        const G = 9.8;
        const kf = 0.9; /* px per newton for the force arrows */
        const FIXED = 1 / 60;
        const MAX_SUB = 10;

        /* --- parameters + physics state --- */
        state.F = 20; /* N — applied push */
        state.m = 6; /* kg */
        state.mu = 0.1; /* kinetic friction coefficient */
        state.x = 0;
        state.v = 0;
        state.t = 0;
        state.a = 0;
        state.fr = 0;
        state.N = state.m * G;
        state.regime = 'static';

        let acc = 0;

        function reset() {
          state.x = 0;
          state.v = 0;
          state.t = 0;
          state.a = 0;
          state.fr = 0;
          state.N = state.m * G;
          state.regime = 'static';
          acc = 0;
        }

        /* The force balance is the original simulation's, unchanged: three
           friction branches (kinetic while moving, static hold, kinetic break-
           away) and semi-implicit Euler. Only the variable storage moved into
           `state` so presets and the probe can read it. */
        function advance(h) {
          state.t += h;
          const f = state.F,
            m = state.m,
            mu = state.mu;
          let v = state.v;
          const dir = v > 0.01 ? 1 : v < -0.01 ? -1 : 0;
          const N = m * G;
          /* Static friction is stronger than kinetic: a cart at rest can resist
             a push that would keep it moving once started. muS = 1.25 mu. */
          const fk = mu * N;
          const fsMax = mu * 1.25 * N;
          let fr, a, regime;
          if (dir !== 0) {
            fr = -dir * fk;
            a = (f + fr) / m;
            regime = 'kinetic';
          } else if (Math.abs(f) <= fsMax) {
            fr = -f;
            a = 0;
            v = 0;
            regime = 'static';
          } else {
            fr = -Math.sign(f) * fk;
            a = (f + fr) / m;
            regime = 'kinetic';
          }
          v += a * h;
          let x = state.x + v * h;
          if (x > 34) {
            x = 34;
            v = 0;
          }
          if (x < -34) {
            x = -34;
            v = 0;
          }
          state.x = x;
          state.v = v;
          state.a = a;
          state.fr = fr;
          state.N = N;
          state.regime = regime;
        }

        /* --- controls (same ranges / defaults / formatting as before) --- */
        const sF = api.SU.slider(
          api.panel,
          'Push force F (N)',
          -60,
          60,
          1,
          20,
          (v) => {
            state.F = v;
            reset();
            sync();
          }
        );
        const sM = api.SU.slider(api.panel, 'Mass m (kg)', 1, 20, 0.5, 6, (v) => {
          state.m = v;
          sync();
        });
        const sMu = api.SU.slider(
          api.panel,
          'Friction μ',
          0,
          0.4,
          0.01,
          0.1,
          (v) => {
            state.mu = v;
            sync();
          },
          (v) => v.toFixed(2)
        );
        api.SU.btn(
          api.panel,
          'Reset run',
          () => {
            reset();
            sync();
          },
          true
        );

        /* --- live measurements --- */
        const rA = api.SU.readout(api.readouts, 'Acceleration', '0.00 m/s²');
        const rN = api.SU.readout(api.readouts, 'Normal force', '0 N');
        const rFr = api.SU.readout(api.readouts, 'Friction', '0 N');
        const rNet = api.SU.readout(api.readouts, 'Net force', '0 N');
        const rReg = api.SU.readout(api.readouts, 'Regime', 'static');

        function sync() {
          rA.set(state.a.toFixed(2) + ' m/s²');
          rN.set(state.N.toFixed(0) + ' N');
          rFr.set(state.fr.toFixed(0) + ' N');
          rNet.set((state.F + state.fr).toFixed(0) + ' N');
          rReg.set(state.regime === 'static' ? 'static — held' : 'kinetic — sliding');
        }
        sync();

        /* --- drawing --- */
        const gy = H * 0.72;
        const xPix = (x) => W / 2 + x * 8;

        function roundRect(ctx, x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        }

        function drawReal() {
          const m = state.m;
          /* track bed */
          g.fillStyle = 'rgba(255,255,255,0.05)';
          g.fillRect(24, gy, W - 48, 13);
          g.strokeStyle = 'rgba(34,211,238,0.5)';
          g.lineWidth = 2;
          g.setLineDash([14, 12]);
          g.beginPath();
          g.moveTo(24, gy + 6.5);
          g.lineTo(W - 24, gy + 6.5);
          g.stroke();
          g.setLineDash([]);

          /* metre markers every 10 m */
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'center';
          for (let metre = -30; metre <= 30; metre += 10) {
            const px = xPix(metre);
            g.strokeStyle = 'rgba(255,255,255,0.22)';
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(px, gy + 13);
            g.lineTo(px, gy + 19);
            g.stroke();
            g.fillStyle = 'rgba(232,237,247,0.45)';
            g.fillText(metre + ' m', px, gy + 31);
          }

          /* zero gantry */
          g.strokeStyle = 'rgba(154,168,195,0.65)';
          g.lineWidth = 2.5;
          g.beginPath();
          g.moveTo(xPix(0) - 22, gy);
          g.lineTo(xPix(0) - 22, gy - 56);
          g.moveTo(xPix(0) + 22, gy);
          g.lineTo(xPix(0) + 22, gy - 56);
          g.moveTo(xPix(0) - 26, gy - 56);
          g.lineTo(xPix(0) + 26, gy - 56);
          g.stroke();
          g.fillStyle = 'rgba(154,168,195,0.85)';
          g.font = '9px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('PHYSIX DYNAMICS TEST', xPix(0) - 26, gy - 64);

          /* cart */
          const cx = xPix(state.x);
          const cw = 46 + m * 2.4;
          const top = gy - 40;
          g.save();
          if (api.cfg.shadows) {
            g.shadowColor = 'rgba(109,93,246,0.75)';
            g.shadowBlur = 16;
          }
          const body = g.createLinearGradient(cx, top, cx, top + 26);
          body.addColorStop(0, '#8b7dff');
          body.addColorStop(1, '#4b3ec4');
          g.fillStyle = body;
          roundRect(g, cx - cw / 2, top, cw, 26, 4);
          g.fill();
          g.restore();
          g.fillStyle = 'rgba(255,255,255,0.16)';
          g.fillRect(cx - cw / 2 + 2, top + 2, cw - 4, 6);
          /* wheels */
          g.fillStyle = '#22d3ee';
          g.beginPath();
          g.arc(cx - cw * 0.28, gy - 14, 7, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.arc(cx + cw * 0.28, gy - 14, 7, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#0b1220';
          g.beginPath();
          g.arc(cx - cw * 0.28, gy - 14, 2.6, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.arc(cx + cw * 0.28, gy - 14, 2.6, 0, Math.PI * 2);
          g.fill();
          /* speed streaks, scaled by the actual velocity */
          if (Math.abs(state.v) > 3) {
            g.strokeStyle = 'rgba(34,211,238,0.4)';
            g.lineWidth = 2;
            const sgn = Math.sign(state.v);
            for (let i = 0; i < 3; i++) {
              const yy = top + 5 + i * 8;
              g.beginPath();
              g.moveTo(cx - sgn * (cw / 2 + 4), yy);
              g.lineTo(cx - sgn * (cw / 2 + 10 + Math.min(26, Math.abs(state.v) * 2)), yy);
              g.stroke();
            }
          }
        }

        function drawScience() {
          /* reference grid */
          g.strokeStyle = 'rgba(255,255,255,0.055)';
          g.lineWidth = 1;
          for (let gx = 0; gx < W; gx += 40) {
            g.beginPath();
            g.moveTo(gx, 0);
            g.lineTo(gx, H);
            g.stroke();
          }
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }

          const cx = W / 2;
          const cy = H / 2 - 6;
          const bw = 116;
          const bh = 62;

          g.save();
          if (api.cfg.shadows) {
            g.shadowColor = 'rgba(34,211,238,0.6)';
            g.shadowBlur = 14;
          }
          g.fillStyle = 'rgba(34,211,238,0.13)';
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
          const N = state.N || state.m * G;
          const fr = state.fr;
          /* Force arrows share one scale (kf px/N), exactly as the original. */
          api.pxArrow(g, cx + bw / 2, cy, F * kf, 0, '#fbbf24', 4);
          api.pxLabel(g, cx + bw / 2 + F * kf + 8, cy - 10, 'F = ' + F.toFixed(0) + ' N', '#fbbf24');
          if (Math.abs(fr) > 0.5) {
            api.pxArrow(g, cx - bw / 2, cy, -fr * kf, 0, '#34d399', 4);
            api.pxLabel(g, cx - bw / 2 - fr * kf - 66, cy + 18, 'f = ' + fr.toFixed(0) + ' N', '#34d399');
          }
          api.pxArrow(g, cx, cy + bh / 2, 0, N * kf * 0.55, '#9aa8c3', 3);
          api.pxLabel(g, cx + 12, cy + bh / 2 + N * kf * 0.55 + 12, 'mg = ' + N.toFixed(0) + ' N', '#9aa8c3');
          api.pxArrow(g, cx, cy - bh / 2, 0, -N * kf * 0.55, '#9aa8c3', 3);
          api.pxLabel(g, cx + 12, cy - bh / 2 - N * kf * 0.55 - 14, 'N = ' + N.toFixed(0) + ' N', '#9aa8c3');

          g.textAlign = 'center';
          g.font = '11px "DM Mono", monospace';
          g.fillStyle = state.regime === 'static' ? '#fbbf24' : '#34d399';
          g.fillText(
            state.regime === 'static'
              ? 'static friction holds: |F| ≤ μs N  →  a = 0'
              : 'a = F_net / m = ' + state.a.toFixed(2) + ' m/s²',
            W / 2,
            H - 18
          );
        }

        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#081020');
          bg.addColorStop(1, '#05070d');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawScience();
          else drawReal();
          api.pxLabel(g, 14, 20, 't = ' + state.t.toFixed(2) + ' s', 'rgba(232,237,247,0.75)');
        }

        /* --- fixed-step integration (frame-rate independent, same 1/60 s
           integrator step the shared time controls used) --- */
        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < MAX_SUB) {
            advance(FIXED);
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0; /* drop backlog like sim-controls.js */
          if (n > 0) {
            api.graphs[0].push({ t: state.t, v: state.v });
            api.graphs[1].push({ t: state.t, fnet: state.F + state.fr });
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
          reset,
          onPreset() {
            sF.set(state.F);
            sM.set(state.m);
            sMu.set(state.mu);
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
            const range = api.graphs[0].timeRange('v');
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
          series: 'v',
          unit: 'm/s',
          quantity: 'velocity',
          absFloor: 0.2,
          context() {
            return {
              F: api.state.F,
              m: api.state.m,
              mu: api.state.mu,
              paramsText:
                'F = ' + api.state.F.toFixed(0) + ' N · m = ' + api.state.m + ' kg · μ = ' + api.state.mu.toFixed(2)
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: how fast is the cart moving at t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('v', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const N = ctx.m * 9.8;
            const fsMax = ctx.mu * 1.25 * N;
            if (Math.abs(ctx.F) <= fsMax) {
              return (
                'The push is ' +
                ctx.F.toFixed(0) +
                ' N but static friction can supply up to μs N = ' +
                fsMax.toFixed(1) +
                ' N. Friction cancels the push exactly, so the cart never starts: v stays 0.'
              );
            }
            const a = (ctx.F - Math.sign(ctx.F) * ctx.mu * N) / ctx.m;
            return (
              'Friction responds with μN = ' +
              (ctx.mu * N).toFixed(1) +
              ' N, so F_net = ' +
              (ctx.F - Math.sign(ctx.F) * ctx.mu * N).toFixed(1) +
              ' N and a = F_net/m = ' +
              a.toFixed(2) +
              ' m/s². Starting from rest, v = at = ' +
              (a * TARGET).toFixed(2) +
              ' m/s at ' +
              TARGET.toFixed(1) +
              ' s.'
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
      /* window.__tcProbe contract (same fields the old sim exposed, plus the
         clock bookkeeping the Workstation adds: calls / paused). */
      probe(api) {
        const s = api.state;
        return {
          t: s.t,
          x: s.x,
          v: s.v,
          a: s.a,
          N: s.N,
          fr: s.fr,
          fNet: s.F + s.fr,
          regime: s.regime,
          state: { x: +s.x.toFixed(6), v: +s.v.toFixed(6) }
        };
      }
    }),
  { chrome: 'workstation' }
);

/* ---------------- Energy conservation (pendulum) ---------------- */
Sims.register(
  'energy',
  'Energy Conservation',
  'Swing a pendulum: kinetic and potential energy trade while their sum holds steady.',
  '🎢',
  (frame) =>
    Workstation.mount(frame, {
      id: 'energy',
      title: 'Energy Conservation',
      desc: 'A swing-ride arm released from 48°. PE drains into KE and back; the total is what stays constant.',
      icon: '🎢',
      topic: 'Energy',
      level: 'Grade 9–11',
      appKey: 'energy',
      height: 320,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Swing rig' },
        { id: 'science', label: 'Energy budget' }
      ],
      presets: [
        { label: 'Rig arm 1.5 m', apply: (s) => { s.L = 150; s.m = 1; s.dmp = 0; } },
        { label: 'Short arm', apply: (s) => { s.L = 90; s.m = 1; s.dmp = 0; } },
        { label: 'Heavy gondola', apply: (s) => { s.L = 150; s.m = 3; s.dmp = 0; } },
        { label: 'Damped bearings', apply: (s) => { s.L = 150; s.m = 1; s.dmp = 0.05; } }
      ],
      graphs: [
        {
          title: 'Swing Angle vs Time',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Angle',
          yUnit: '°',
          height: 132,
          series: [{ id: 'theta', label: 'θ', unit: '°', color: '#22d3ee' }]
        },
        {
          title: 'Energy vs Time',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Energy',
          yUnit: 'J',
          height: 132,
          series: [
            { id: 'pe', label: 'PE', unit: 'J', color: '#8b7dff' },
            { id: 'ke', label: 'KE', unit: 'J', color: '#22d3ee' },
            { id: 'total', label: 'Total', unit: 'J', color: '#34d399' }
          ]
        }
      ],
      setup(api) {
        const { g, W, H, state } = api;

        /* SI scale for the rig: the drawn arm length is in pixels and the
           project's pixel scale is 1 px = 1 cm, so a 150 px arm is a real
           1.5 m arm. The angle ODE therefore uses g = 9.8 m/s² expressed in
           pixels (980 px/s²) — same equation, same integrator, real units:
           ω² = g/L_m. Energies below are joules. */
        const PX_PER_M = 100;
        const G = 9.8 * PX_PER_M;

        const FIXED = 1 / 60;
        const MAX_SUB = 10;

        state.L = 150; /* px = 1.50 m */
        state.m = 1; /* kg */
        state.dmp = 0; /* 1/s */
        const TH0 = (48 * Math.PI) / 180;

        state.th = TH0;
        state.prevTh = TH0;
        state.om = 0;
        state.t = 0;
        state.pe = 0;
        state.ke = 0;
        state.measuredT = 0;
        state.lastCrossT = null;
        state.lastDir = 0;
        state.trail = [];

        let acc = 0;

        function reset() {
          state.th = TH0;
          state.prevTh = TH0;
          state.om = 0;
          state.t = 0;
          state.measuredT = 0;
          state.lastCrossT = null;
          state.lastDir = 0;
          state.trail.length = 0;
          acc = 0;
          energies();
        }

        function energies() {
          const Lm = state.L / PX_PER_M;
          state.pe = state.m * 9.8 * Lm * (1 - Math.cos(state.th));
          state.ke = 0.5 * state.m * (Lm * state.om) * (Lm * state.om);
        }

        /* Velocity Verlet on the angle — the original integrator, verbatim. */
        function advance(h) {
          state.t += h;
          const l = state.L,
            dmp = state.dmp;
          const a1 = (-G / l) * Math.sin(state.th) - dmp * state.om;
          state.th += state.om * h + 0.5 * a1 * h * h;
          const omHalf = state.om + 0.5 * a1 * h;
          const a2 = (-G / l) * Math.sin(state.th) - dmp * omHalf;
          state.om = omHalf + 0.5 * a2 * h;

          /* Period from real zero crossings: a crossing in the opposite
             direction from the previous one is half a period, so double it.
             This reports a full period as soon as the second crossing happens
             instead of waiting for two same-direction crossings. */
          const prev = state.prevTh;
          const now = state.th;
          if ((prev < 0 && now >= 0) || (prev > 0 && now <= 0)) {
            const dir = now >= prev ? 1 : -1;
            if (state.lastCrossT != null) {
              const gap = state.t - state.lastCrossT;
              state.measuredT = dir === state.lastDir ? gap : 2 * gap;
            }
            state.lastCrossT = state.t;
            state.lastDir = dir;
          }
          state.prevTh = now;
          energies();
        }

        /* --- controls (ranges and defaults unchanged) --- */
        const sL = api.SU.slider(api.panel, 'Arm length L', 90, 200, 5, 150, (v) => {
          state.L = v;
          reset();
          sync();
        }, (v) => (v / 100).toFixed(2) + ' m');
        const sM = api.SU.slider(api.panel, 'Bob mass m', 0.5, 3, 0.25, 1, (v) => {
          state.m = v;
          reset();
          sync();
        }, (v) => v.toFixed(2) + ' kg');
        const sD = api.SU.slider(api.panel, 'Bearing damping', 0, 0.06, 0.005, 0, (v) => {
          state.dmp = v;
          reset();
          sync();
        }, (v) => v.toFixed(3));
        api.SU.btn(api.panel, 'Release from 48°', () => { reset(); sync(); }, true);

        /* --- measurements --- */
        const rPe = api.SU.readout(api.readouts, 'Potential (PE)', '0.00 J');
        const rKe = api.SU.readout(api.readouts, 'Kinetic (KE)', '0.00 J');
        const rTot = api.SU.readout(api.readouts, 'Total E', '0.00 J');
        const rAng = api.SU.readout(api.readouts, 'Angle θ', '0°');
        const rPer = api.SU.readout(api.readouts, 'Period (measured)', '—');

        const predicted = () => 2 * Math.PI * Math.sqrt(state.L / PX_PER_M / 9.8);

        function sync() {
          rPe.set(state.pe.toFixed(2) + ' J');
          rKe.set(state.ke.toFixed(2) + ' J');
          rTot.set((state.pe + state.ke).toFixed(2) + ' J');
          rAng.set(((state.th * 180) / Math.PI).toFixed(0) + '°');
          rPer.set(
            state.measuredT
              ? state.measuredT.toFixed(2) + ' s'
              : predicted().toFixed(2) + ' s (theory)'
          );
        }
        reset();
        sync();

        /* --- geometry --- */
        const px = W * 0.40;
        const py = 46;
        const bobR = () => 10 + state.m * 4;
        const bobPos = () => ({
          x: px + state.L * Math.sin(state.th),
          y: py + state.L * Math.cos(state.th)
        });

        /* --- drawing --- */
        function roundRect(ctx, x, y, w, h, r) {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        }

        function drawRig() {
          /* gantry beam + A-frame legs */
          g.strokeStyle = 'rgba(154,168,195,0.75)';
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(px - 120, py - 8);
          g.lineTo(px + 120, py - 8);
          g.stroke();
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(px - 110, py - 8);
          g.lineTo(px - 140, H - 26);
          g.moveTo(px + 110, py - 8);
          g.lineTo(px + 140, H - 26);
          g.moveTo(px - 60, py - 8);
          g.lineTo(px - 78, H - 26);
          g.stroke();
          g.fillStyle = 'rgba(154,168,195,0.8)';
          g.font = '9px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('PHYSIX SWING RIG', px - 118, py - 18);

          /* swing envelope + 48° tick marks */
          g.strokeStyle = 'rgba(34,211,238,0.22)';
          g.lineWidth = 1.5;
          g.setLineDash([5, 7]);
          g.beginPath();
          g.arc(px, py, state.L, Math.PI / 2 - TH0, Math.PI / 2 + TH0);
          g.stroke();
          g.setLineDash([]);
          g.strokeStyle = 'rgba(251,191,36,0.45)';
          for (const sign of [-1, 1]) {
            const a = Math.PI / 2 - sign * TH0;
            g.beginPath();
            g.moveTo(px + Math.sin(sign * TH0) * (state.L - 14), py + Math.cos(sign * TH0) * (state.L - 14));
            g.lineTo(px + Math.sin(sign * TH0) * (state.L + 14), py + Math.cos(sign * TH0) * (state.L + 14));
            g.stroke();
          }

          /* motion trail from recorded positions */
          for (let i = 0; i < state.trail.length; i++) {
            const p = state.trail[i];
            const a = (i / state.trail.length) * 0.35;
            g.fillStyle = 'rgba(34,211,238,' + a.toFixed(3) + ')';
            g.beginPath();
            g.arc(p.x, p.y, bobR() * 0.6, 0, Math.PI * 2);
            g.fill();
          }

          /* rod + gondola */
          const b = bobPos();
          g.strokeStyle = '#9aa8c3';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(b.x, b.y);
          g.stroke();
          g.fillStyle = '#22d3ee';
          g.beginPath();
          g.arc(px, py, 5, 0, Math.PI * 2);
          g.fill();

          g.save();
          if (api.cfg.shadows) {
            g.shadowColor = 'rgba(251,191,36,0.65)';
            g.shadowBlur = 18;
          }
          const grad = g.createRadialGradient(b.x - bobR() * 0.3, b.y - bobR() * 0.3, 2, b.x, b.y, bobR());
          grad.addColorStop(0, '#ffd977');
          grad.addColorStop(1, '#d97706');
          g.fillStyle = grad;
          g.beginPath();
          g.arc(b.x, b.y, bobR(), 0, Math.PI * 2);
          g.fill();
          g.restore();
          g.strokeStyle = 'rgba(7,11,22,0.55)';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(b.x, b.y, bobR() * 0.62, 0, Math.PI * 2);
          g.stroke();

          /* current speed vector, scaled from real tangential speed */
          const vt = state.L / PX_PER_M * state.om; /* m/s */
          const k = 9; /* px per (m/s) */
          if (Math.abs(vt) > 0.05) {
            api.pxArrow(
              g,
              b.x,
              b.y,
              Math.cos(state.th) * vt * k,
              -Math.sin(state.th) * vt * k,
              '#34d399',
              3
            );
            api.pxLabel(g, b.x + 14, b.y - 12, 'v ' + Math.abs(vt).toFixed(1) + ' m/s', '#34d399');
          }

          /* floor */
          g.strokeStyle = '#33415c';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(0, H - 26);
          g.lineTo(W, H - 26);
          g.stroke();
          for (let x = 0; x < W; x += 28) {
            g.strokeStyle = 'rgba(51,65,92,0.7)';
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(x, H - 26);
            g.lineTo(x - 8, H - 18);
            g.stroke();
          }
        }

        function drawEnergy() {
          /* reference grid */
          g.strokeStyle = 'rgba(255,255,255,0.05)';
          g.lineWidth = 1;
          for (let gx = 0; gx < W; gx += 40) {
            g.beginPath();
            g.moveTo(gx, 0);
            g.lineTo(gx, H);
            g.stroke();
          }

          const b = bobPos();
          /* pivot, vertical reference, rod, bob */
          g.strokeStyle = 'rgba(154,168,195,0.4)';
          g.lineWidth = 1;
          g.setLineDash([4, 5]);
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(px, py + state.L + 24);
          g.stroke();
          g.setLineDash([]);
          g.strokeStyle = '#9aa8c3';
          g.lineWidth = 2.5;
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(b.x, b.y);
          g.stroke();
          g.strokeStyle = 'rgba(251,191,36,0.8)';
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(px, py, 40, Math.PI / 2, Math.PI / 2 + state.th, state.th < 0);
          g.stroke();
          g.fillStyle = '#fbbf24';
          g.font = '12px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('θ = ' + ((state.th * 180) / Math.PI).toFixed(0) + '°', px + 46, py + 34);
          g.fillStyle = '#22d3ee';
          g.beginPath();
          g.arc(px, py, 5, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc(b.x, b.y, 9, 0, Math.PI * 2);
          g.fill();

          /* energy bars — one shared scale, the theoretical release energy */
          const E = state.pe + state.ke;
          const Emax = Math.max(
            (state.m * 9.8 * (state.L / PX_PER_M) * (1 - Math.cos(TH0))) || 1e-9,
            E,
            1e-9
          );
          const x0 = 22;
          const y0 = H - 104;
          const maxW = Math.min(230, W - 300);
          const rows = [
            { label: 'PE', v: state.pe, col: '#8b7dff' },
            { label: 'KE', v: state.ke, col: '#22d3ee' },
            { label: 'Σ', v: E, col: '#34d399' }
          ];
          g.font = '10px "DM Mono", monospace';
          rows.forEach((row, i) => {
            const y = y0 + i * 26;
            g.fillStyle = 'rgba(255,255,255,0.06)';
            g.fillRect(x0 + 24, y, maxW, 12);
            g.fillStyle = row.col;
            g.fillRect(x0 + 24, y, Math.max(0, Math.min(1, row.v / Emax)) * maxW, 12);
            g.fillStyle = row.col;
            g.textAlign = 'left';
            g.fillText(row.label, x0, y + 10);
            g.fillStyle = 'rgba(232,237,247,0.85)';
            g.fillText(row.v.toFixed(2) + ' J', x0 + 30 + maxW, y + 10);
          });

          g.fillStyle = 'rgba(232,237,247,0.6)';
          g.textAlign = 'left';
          g.fillText(
            'E = ½ m (Lω)² + m g L (1 − cos θ)   ·   ideal: no bearing loss',
            x0,
            H - 18
          );
        }

        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#081020');
          bg.addColorStop(1, '#05070d');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawEnergy();
          else drawRig();
          api.pxLabel(g, 14, 20, 't = ' + state.t.toFixed(2) + ' s', 'rgba(232,237,247,0.75)');
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
            api.graphs[0].push({ t: state.t, theta: (state.th * 180) / Math.PI });
            api.graphs[1].push({ t: state.t, pe: state.pe, ke: state.ke, total: state.pe + state.ke });
            const b = bobPos();
            state.trail.push(b);
            if (state.trail.length > 22) state.trail.shift();
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
            sL.set(state.L);
            sM.set(state.m);
            sD.set(state.dmp);
            reset();
            sync();
          },
          destroy: stopWatching
        };
      },
      predict(api) {
        const TARGET = 3.0;
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
            const range = api.graphs[0].timeRange('theta');
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
          series: 'theta',
          unit: 's',
          quantity: 'period',
          absFloor: 0.2,
          context() {
            const s = api.state;
            return {
              L: s.L / 100,
              m: s.m,
              dmp: s.dmp,
              paramsText:
                'L = ' + (s.L / 100).toFixed(2) + ' m · m = ' + s.m.toFixed(2) + ' kg · damping ' + s.dmp.toFixed(3)
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: how long does one full swing (the period) take?';
          },
          observe() {
            const T = api.state.measuredT;
            return T > 0 ? { value: T, exact: true } : null;
          },
          explain(r, ctx) {
            const Tth = 2 * Math.PI * Math.sqrt(ctx.L / 9.8);
            return (
              'A simple pendulum has T = 2π√(L/g). With L = ' +
              ctx.L.toFixed(2) +
              ' m and g = 9.8 m/s², that is ' +
              Tth.toFixed(2) +
              ' s. The rig measures the crossing times from real motion, so the value it reported (' +
              (r.value != null ? r.value.toFixed(2) : '—') +
              ' s) is an observation, not a formula. Amplitude is 48°, so the small-angle formula sits slightly low.'
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
      /* window.__tcProbe contract: energy + measured period (unchanged names). */
      probe(api) {
        const s = api.state;
        return {
          t: s.t,
          th: s.th,
          om: s.om,
          pe: s.pe,
          ke: s.ke,
          total: s.pe + s.ke,
          period: s.measuredT || null,
          predictedPeriod: 2 * Math.PI * Math.sqrt(s.L / 100 / 9.8),
          state: { th: +s.th.toFixed(8), om: +s.om.toFixed(8) }
        };
      }
    }),
  { chrome: 'workstation' }
);

/* ---------------- Collision lab ---------------- */
Sims.register(
  'collision',
  'Collision Lab',
  'Momentum survives the impact; kinetic energy survives only when e = 1.',
  '🎱',
  (frame) =>
    Workstation.mount(frame, {
      id: 'collision',
      title: 'Collision Lab',
      desc: 'Two balls on a crash-test track. Momentum is conserved through the impact itself — the impulse the striker receives is exactly the impulse the target gives up — while kinetic energy survives only in the elastic case. The elastic end walls sit outside the system, so they are the one place where the total momentum may jump.',
      icon: '🎱',
      topic: 'Mechanics',
      level: 'Grade 11–12',
      appKey: 'collision',
      height: 240,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Crash track' },
        { id: 'science', label: 'Momentum ledger' }
      ],
      presets: [
        {
          label: 'Elastic 3/1',
          apply: (s) => {
            s.m1 = 3;
            s.m2 = 1;
            s.v1 = 4;
            s.v2 = 0;
            s.e = 1;
          }
        },
        {
          label: 'Sticky head-on',
          apply: (s) => {
            s.m1 = 2;
            s.m2 = 2;
            s.v1 = 4;
            s.v2 = -4;
            s.e = 0;
          }
        },
        {
          label: 'Faster striker',
          apply: (s) => {
            s.m1 = 2;
            s.m2 = 4;
            s.v1 = 6;
            s.v2 = 2;
            s.e = 1;
          }
        },
        {
          label: 'Heavy catcher',
          apply: (s) => {
            s.m1 = 5;
            s.m2 = 1;
            s.v1 = 2;
            s.v2 = 0;
            s.e = 0.8;
          }
        }
      ],
      graphs: [
        {
          title: 'Total momentum p(t) — flat straight through the impact',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'p',
          yUnit: 'kg·m/s',
          height: 128,
          series: [{ id: 'p', label: 'Total p', unit: 'kg·m/s', color: '#22d3ee' }]
        },
        {
          title: 'Total kinetic energy (J) — flat only while e = 1',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'KE',
          yUnit: 'J',
          height: 128,
          series: [{ id: 'ke', label: 'Total KE', unit: 'J', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        const rad = (m) => 10 + Math.sqrt(m) * 5;
        const gy = () => H * 0.66;

        /* ---- state lives on the scene so probe / predict / reset share it ---- */
        S.m1 = 3;
        S.m2 = 1;
        S.v1 = 4;
        S.v2 = 0;
        S.e = 1;
        S.t = 0;
        S.a = { m: 3, v: 4, x: 0, r: 0 };
        S.b = { m: 1, v: 0, x: 0, r: 0 };
        S.ke0 = 1;
        S.target = 1;

        /* ---- controls (DOM order: m1, m2, v1, v2, e) ---- */
        const sM1 = api.SU.slider(api.panel, 'Mass 1 (kg)', 0.5, 8, 0.5, 3, (v) => {
          S.m1 = v;
          relaunch();
        });
        const sM2 = api.SU.slider(api.panel, 'Mass 2 (kg)', 0.5, 8, 0.5, 1, (v) => {
          S.m2 = v;
          relaunch();
        });
        const sV1 = api.SU.slider(api.panel, 'Velocity 1 (m/s)', -8, 8, 0.5, 4, (v) => {
          S.v1 = v;
          relaunch();
        });
        const sV2 = api.SU.slider(api.panel, 'Velocity 2 (m/s)', -8, 8, 0.5, 0, (v) => {
          S.v2 = v;
          relaunch();
        });
        /* The original elasticity slider only stored the value — it did not
           relaunch the run, so the collision keeps whatever velocity state it
           had. That behaviour is preserved here: the new e applies to the NEXT
           impact, exactly as before. */
        const sE = api.SU.slider(
          api.panel,
          'Elasticity e',
          0,
          1,
          0.05,
          1,
          (v) => {
            S.e = v;
            sync();
          },
          (v) => v.toFixed(2)
        );
        api.SU.btn(api.panel, '⟲ Relaunch', () => relaunch());

        /* ---- readouts ---- */
        const rP = api.SU.readout(api.readouts, 'Total p', '—');
        const rK = api.SU.readout(api.readouts, 'Total KE', '—');
        const rSt = api.SU.readout(api.readouts, 'Type', '—');
        const rLoss = api.SU.readout(api.readouts, 'KE lost', '—');

        /* ---- the target instant for the prediction ----
           The honest window for a momentum measurement is the stretch of the
           run before either ball can reach an elastic end wall, because the
           wall is outside the system and applies an external impulse. The
           first impact is inside that window (a ball-ball impact conserves p
           whatever e is), so the target is placed just after the impact when
           there is one, and otherwise just before the earliest wall contact. */
        function timeToWall(x, r, v) {
          const sp = v * 30; /* the original px-per-(m/s) scale */
          if (sp > 0) return (W - r - x) / sp;
          if (sp < 0) return (x - r) / -sp;
          return Infinity;
        }
        function computeTarget() {
          const rA = rad(S.m1);
          const rB = rad(S.m2);
          const tWall = Math.min(
            timeToWall(W * 0.22, rA, S.v1),
            timeToWall(W * 0.78, rB, S.v2)
          );
          const closing = (S.v1 - S.v2) * 30;
          const tHit =
            closing > 0 ? Math.max(0, (0.56 * W - (rA + rB)) / closing) : Infinity;
          const afterHit = tHit + 0.15;
          let T = Math.min(afterHit, tWall - 0.05);
          if (!isFinite(T)) T = isFinite(afterHit) ? afterHit : 1;
          return Math.max(0.05, Math.min(T, 8));
        }

        /* ---- physics: the collision resolution and the wall bounces,
           transcribed exactly. ---- */
        function relaunch() {
          S.a = { m: S.m1, v: S.v1, x: W * 0.22, r: rad(S.m1) };
          S.b = { m: S.m2, v: S.v2, x: W * 0.78, r: rad(S.m2) };
          S.ke0 = 0.5 * S.a.m * S.a.v * S.a.v + 0.5 * S.b.m * S.b.v * S.b.v || 1;
          S.t = 0;
          acc = 0;
          S.target = computeTarget();
          api.graphs.forEach((G) => G.clear());
          sync();
          /* keep a locked-in prediction pointing at the new target */
          if (S.pendingReveal) S.pendingReveal = S.target;
          if (S.pred && S.pred.prediction === null) S.pred.refresh();
        }

        function advance(h) {
          S.t += h;
          S.a.x += S.a.v * 30 * h;
          S.b.x += S.b.v * 30 * h;
          const gap = S.a.r + S.b.r;
          if (Math.abs(S.b.x - S.a.x) < gap && S.a.v !== S.b.v) {
            const u1 = S.a.v,
              u2 = S.b.v,
              e = S.e;
            const hit = collide1D(S.a.m, u1, S.b.m, u2, e);
            S.a.v = hit.v1;
            S.b.v = hit.v2;
            const mid = (S.a.x + S.b.x) / 2;
            S.a.x = mid - gap / 2;
            S.b.x = mid + gap / 2;
          }
          [S.a, S.b].forEach((p) => {
            if (p.x < p.r) {
              p.x = p.r;
              p.v = Math.abs(p.v);
            }
            if (p.x > W - p.r) {
              p.x = W - p.r;
              p.v = -Math.abs(p.v);
            }
          });
        }

        function sample() {
          const p = S.a.m * S.a.v + S.b.m * S.b.v;
          const ke = 0.5 * S.a.m * S.a.v * S.a.v + 0.5 * S.b.m * S.b.v * S.b.v;
          api.graphs[0].push({ t: S.t, p });
          api.graphs[1].push({ t: S.t, ke });
        }

        function sync() {
          const p = S.a.m * S.a.v + S.b.m * S.b.v;
          const ke = 0.5 * S.a.m * S.a.v * S.a.v + 0.5 * S.b.m * S.b.v * S.b.v;
          rP.set(p.toFixed(2) + ' kg·m/s');
          rK.set(ke.toFixed(1) + ' J');
          rSt.set(S.e >= 0.95 ? 'Elastic' : S.e <= 0.05 ? 'Sticky' : 'Partly elastic');
          rLoss.set(((1 - ke / S.ke0) * 100).toFixed(0) + ' %');
        }

        function reset() {
          relaunch();
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
          else drawTrack();
        }

        function drawTrack() {
          const gy_ = gy();
          /* the elastic end walls — external, which is why p may jump there */
          g.strokeStyle = 'rgba(251,191,36,.45)';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(0, gy_ - 46);
          g.lineTo(0, gy_ + 22);
          g.moveTo(W, gy_ - 46);
          g.lineTo(W, gy_ + 22);
          g.stroke();

          g.strokeStyle = '#33415c';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(0, gy_);
          g.lineTo(W, gy_);
          g.stroke();

          [S.a, S.b].forEach((p, i) => {
            g.fillStyle = i ? '#fbbf24' : '#22d3ee';
            g.beginPath();
            g.arc(p.x, gy_ - p.r, p.r, 0, 7);
            g.fill();
            api.SU.arrowH(g, p.x, gy_ - p.r * 2 - 18, p.v * 12, '#34d399');
            g.fillStyle = '#6b7a99';
            g.font = '11px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText(p.m + ' kg', p.x, gy_ + 16);
            g.textAlign = 'left';
          });

          api.pxLabel(g, 20, 22, 'PHYSIX COLLISION TRACK', 'rgba(232,237,247,0.7)');
          api.pxLabel(
            g,
            W - 230,
            22,
            'p = ' + (S.a.m * S.a.v + S.b.m * S.b.v).toFixed(2) + ' kg·m/s · e = ' + S.e.toFixed(2),
            'rgba(34,211,238,0.9)'
          );
          api.pxLabel(
            g,
            20,
            H - 14,
            'walls are elastic but external — momentum can jump at the end stops',
            'rgba(232,237,247,0.45)'
          );
        }

        function drawScience() {
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
          const p = S.a.m * S.a.v + S.b.m * S.b.v;
          const ke = 0.5 * S.a.m * S.a.v * S.a.v + 0.5 * S.b.m * S.b.v * S.b.v;
          g.fillStyle = 'rgba(232,237,247,0.92)';
          g.font = '13px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('p = m₁v₁ + m₂v₂', W / 2, H * 0.34);
          g.fillText('KE = ½m₁v₁² + ½m₂v₂²', W / 2, H * 0.34 + 22);
          g.fillStyle = 'rgba(34,211,238,0.9)';
          g.fillText(
            'p = ' + p.toFixed(2) + ' kg·m/s   ·   KE = ' + ke.toFixed(1) + ' J',
            W / 2,
            H * 0.34 + 50
          );
          g.fillStyle = 'rgba(251,191,36,0.85)';
          g.font = '12px "DM Mono", monospace';
          g.fillText(
            'm₁Δv₁ = −m₂Δv₂ at the impact  ·  ΔKE = −(1−e²)·½μ(v₁−v₂)²',
            W / 2,
            H * 0.34 + 74
          );
          g.textAlign = 'left';
          api.pxLabel(
            g,
            20,
            22,
            'momentum ledger — the impact swaps momentum, it never creates it',
            'rgba(232,237,247,0.75)'
          );
          api.pxLabel(
            g,
            20,
            40,
            'the end walls are outside the system: they can take momentum away',
            'rgba(232,237,247,0.45)'
          );
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
          if (acc > FIXED) acc = 0; /* drop the backlog, same fixed-step rule */
          sync();
        }

        relaunch();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sM1.set(S.m1);
            sM2.set(S.m2);
            sV1.set(S.v1);
            sV2.set(S.v2);
            sE.set(S.e);
            relaunch();
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
        return {
          t: S.t,
          p: S.a.m * S.a.v + S.b.m * S.b.v,
          p0: S.m1 * S.v1 + S.m2 * S.v2,
          ke: 0.5 * S.a.m * S.a.v * S.a.v + 0.5 * S.b.m * S.b.v * S.b.v,
          state: { ax: +S.a.x.toFixed(6), av: +S.a.v.toFixed(6) }
        };
      },
      predict(api) {
        const S = api.state;
        S.pendingReveal = null;
        function stopWatching() {
          if (S._watchTimer) {
            clearInterval(S._watchTimer);
            S._watchTimer = 0;
          }
        }
        function watchForTarget() {
          stopWatching();
          S._watchTimer = setInterval(() => {
            if (!S.pendingReveal || !S.pred) return;
            if (S.pred.prediction === null || S.pred.result) return;
            const range = api.graphs[0].timeRange('p');
            if (range && range.to >= S.pendingReveal) {
              if (S.pred.reveal()) {
                S.pendingReveal = null;
                stopWatching();
              }
            }
          }, 120);
        }
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'p',
          unit: 'kg·m/s',
          quantity: 'total momentum',
          absFloor: 1,
          context() {
            return {
              m1: S.m1,
              m2: S.m2,
              v1: S.v1,
              v2: S.v2,
              e: S.e,
              paramsText:
                'm₁ = ' +
                S.m1 +
                ' kg · v₁ = ' +
                S.v1 +
                ' m/s · m₂ = ' +
                S.m2 +
                ' kg · v₂ = ' +
                S.v2 +
                ' m/s · e = ' +
                S.e
            };
          },
          targetTime: () => S.target,
          question() {
            return (
              'Predict first: what is the total momentum p of the pair at t = ' +
              S.target.toFixed(2) +
              ' s?'
            );
          },
          observe() {
            const hit = api.graphs[0].valueAt('p', S.target);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const p0 = ctx.m1 * ctx.v1 + ctx.m2 * ctx.v2;
            return (
              'The total momentum of the pair is p = m₁v₁ + m₂v₂ = ' +
              p0.toFixed(2) +
              ' kg·m/s. The p trace stays flat straight through the impact: the impulse ball 1 receives is exactly ' +
              'the impulse ball 2 gives up, so the total is unchanged whatever e is. The one place p can jump is ' +
              'the elastic end wall — the track sits outside the system, so it applies an external impulse. ' +
              'Kinetic energy is the stricter test: it survives only when e = 1, and whatever is missing went into ' +
              'heat, sound and deformation, which is what the "KE lost" readout is counting.'
            );
          },
          onLock() {
            api.transport.reset();
            S.pendingReveal = S.target;
            api.transport.play();
            pred.refresh();
            watchForTarget();
          },
          onReset() {
            S.pendingReveal = null;
            stopWatching();
            api.transport.reset();
            pred.refresh();
          }
        });
        S.pred = pred;
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);
Sims.register(
  'orbit',
  'Orbit Simulator',
  'Sideways speed turns falling into orbiting.',
  '🛰️',
  (frame) =>
    Workstation.mount(frame, {
      id: 'orbit',
      title: 'Orbit Simulator',
      desc: 'Launch a satellite sideways at the right speed and free-fall curves into an orbit. Too slow and it re-enters; too fast and it escapes.',
      icon: '🛰️',
      topic: 'Gravitation',
      level: 'Grade 11–12',
      appKey: 'orbit',
      height: 340,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Mission view' },
        { id: 'science', label: 'Orbital elements' }
      ],
      presets: [
        { label: 'Circular LEO', apply: (s) => { s.v0 = 47; } },
        { label: 'Transfer ellipse', apply: (s) => { s.v0 = 66; } },
        { label: 'High-energy escape', apply: (s) => { s.v0 = 100; } },
        { label: 'Re-entry (grazing)', apply: (s) => { s.v0 = 38; } }
      ],
      graphs: [
        {
          title: 'Orbit Radius vs Time',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Radius',
          yUnit: 'px',
          height: 132,
          series: [{ id: 'r', label: 'r', unit: 'px', color: '#22d3ee' }]
        },
        {
          title: 'Speed vs Time',
          xLabel: 'Time',
          xUnit: 's',
          yLabel: 'Speed',
          yUnit: 'px/s',
          height: 132,
          series: [{ id: 'spd', label: '|v|', unit: 'px/s', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state } = api;
        const GM = 420000; /* px³/s² — the bench's gravitational parameter */
        const CX = () => W / 2;
        const CY = () => H / 2;
        const FIXED = 1 / 60;
        const MAX_SUB = 10;
        const KILL_R = 1500;
        const R_LAUNCH = 190;

        state.v0 = 66;
        state.pl = null;
        state.trail = [];
        state.dead = 0;
        state.t = 0;
        state.status = 'Bound';
        state.stars = null;

        let acc = 0;

        function launch() {
          state.pl = { x: CX() + R_LAUNCH, y: CY(), vx: 0, vy: -state.v0 };
          state.trail = [];
          state.dead = 0;
          /* The mission clock is NOT reset here: a crashed run that relaunches
             must not rewind the recorded graph. transport.reset() rewinds it. */
          state.status = 'Bound';
        }

        function reset() {
          state.t = 0;
          launch();
          acc = 0;
        }

        function rOf(pl) {
          return Math.hypot(pl.x - CX(), pl.y - CY()) || 1;
        }

        /* Velocity Verlet via stepOrbit — second-order and time-reversible, so a
           bound orbit keeps its radius instead of spiralling out. Unchanged. */
        function advance(h) {
          state.t += h;
          if (state.dead > 0) {
            state.dead -= h;
            if (state.dead <= 0) launch();
            return;
          }
          const pl = state.pl;
          if (!pl) return;
          stepOrbit(pl, GM, h, CX(), CY());
          state.trail.push([pl.x, pl.y]);
          if (state.trail.length > 600) state.trail.shift();
          const r = rOf(pl);
          if (r < 18 || r > KILL_R) state.dead = 1.2;
        }

        /* --- controls --- */
        const sV = api.SU.slider(api.panel, 'Launch speed', 30, 120, 1, 66, (v) => {
          state.v0 = v;
          reset();
          sync();
        }, (v) => v + ' px/s');
        api.SU.btn(api.panel, 'Relaunch', () => { reset(); sync(); }, true);

        /* --- measurements --- */
        const rSpeed = api.SU.readout(api.readouts, 'Speed', '—');
        const rDist = api.SU.readout(api.readouts, 'Radius r', '—');
        const rEn = api.SU.readout(api.readouts, 'Specific energy ε', '—');
        const rL = api.SU.readout(api.readouts, 'Angular momentum L', '—');
        const rStatus = api.SU.readout(api.readouts, 'Status', 'Bound');

        function sync() {
          const pl = state.pl;
          if (!pl || state.dead > 0) {
            rSpeed.set('—');
            rDist.set('—');
            rEn.set('—');
            rL.set('—');
            rStatus.set(rOf(pl) > KILL_R ? 'Lost to space' : 'Re-entry');
            return;
          }
          const dx = pl.x - CX(),
            dy = pl.y - CY();
          const r = Math.hypot(dx, dy) || 1;
          const en = orbitalEnergy(pl, GM, CX(), CY());
          rSpeed.set(Math.hypot(pl.vx, pl.vy).toFixed(0) + ' px/s');
          rDist.set(r.toFixed(0) + ' px');
          rEn.set(en.toFixed(1) + ' px²/s²');
          rL.set((dx * pl.vy - dy * pl.vx).toFixed(0) + ' px²/s');
          state.status = en < 0 ? 'Bound' : 'Escaping';
          rStatus.set(state.status);
        }

        /* --- drawing --- */
        function ensureStars() {
          if (state.stars) return state.stars;
          /* deterministic starfield so the scene does not shimmer frame to frame */
          let seed = 20261107;
          const rnd = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
          };
          state.stars = [];
          for (let i = 0; i < 110; i++) {
            state.stars.push({ x: rnd() * W, y: rnd() * H, r: 0.4 + rnd() * 1.1, a: 0.25 + rnd() * 0.6 });
          }
          return state.stars;
        }

        function drawStars() {
          for (const s of ensureStars()) {
            g.fillStyle = 'rgba(232,237,247,' + s.a.toFixed(2) + ')';
            g.beginPath();
            g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            g.fill();
          }
        }

        function drawTrail(alphaScale) {
          const tr = state.trail;
          if (tr.length < 2) return;
          g.lineWidth = 1.8;
          for (let i = 1; i < tr.length; i++) {
            const a = (i / tr.length) * 0.55 * alphaScale;
            g.strokeStyle = 'rgba(34,211,238,' + a.toFixed(3) + ')';
            g.beginPath();
            g.moveTo(tr[i - 1][0], tr[i - 1][1]);
            g.lineTo(tr[i][0], tr[i][1]);
            g.stroke();
          }
        }

        function drawEarth() {
          const cx = CX(),
            cy = CY();
          /* atmosphere */
          const atm = g.createRadialGradient(cx, cy, 40, cx, cy, 66);
          atm.addColorStop(0, 'rgba(34,211,238,0.25)');
          atm.addColorStop(1, 'rgba(34,211,238,0)');
          g.fillStyle = atm;
          g.beginPath();
          g.arc(cx, cy, 66, 0, Math.PI * 2);
          g.fill();
          /* ocean disc */
          const oce = g.createRadialGradient(cx - 18, cy - 20, 6, cx, cy, 52);
          oce.addColorStop(0, '#1d4ed8');
          oce.addColorStop(0.6, '#0f2f8c');
          oce.addColorStop(1, '#071a4a');
          g.fillStyle = oce;
          g.beginPath();
          g.arc(cx, cy, 52, 0, Math.PI * 2);
          g.fill();
          /* simplified landmasses */
          g.fillStyle = 'rgba(52,211,153,0.35)';
          g.beginPath();
          g.ellipse(cx - 16, cy - 12, 18, 11, -0.5, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.ellipse(cx + 20, cy + 16, 13, 9, 0.6, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.ellipse(cx + 6, cy - 30, 9, 6, 0.2, 0, Math.PI * 2);
          g.fill();
          /* terminator */
          const term = g.createLinearGradient(cx - 52, cy - 52, cx + 52, cy + 52);
          term.addColorStop(0, 'rgba(7,11,22,0)');
          term.addColorStop(1, 'rgba(7,11,22,0.55)');
          g.fillStyle = term;
          g.beginPath();
          g.arc(cx, cy, 52, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = 'rgba(34,211,238,0.55)';
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(cx, cy, 52, 0, Math.PI * 2);
          g.stroke();
        }

        function drawSatellite(pl) {
          const ang = Math.atan2(pl.y - CY(), pl.x - CX());
          g.save();
          g.translate(pl.x, pl.y);
          g.rotate(ang + Math.PI / 2);
          if (api.cfg.shadows) {
            g.shadowColor = 'rgba(34,211,238,0.9)';
            g.shadowBlur = 12;
          }
          /* solar panels */
          g.fillStyle = '#0e7490';
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 1;
          g.fillRect(-30, -5, 20, 10);
          g.strokeRect(-30, -5, 20, 10);
          g.fillRect(10, -5, 20, 10);
          g.strokeRect(10, -5, 20, 10);
          /* body */
          g.fillStyle = '#e8edf7';
          g.fillRect(-8, -7, 16, 14);
          g.fillStyle = '#22d3ee';
          g.fillRect(-4, -3, 8, 6);
          g.restore();
          /* downlink pulse to the ground station */
          g.strokeStyle = 'rgba(34,211,238,0.18)';
          g.lineWidth = 1;
          g.setLineDash([3, 6]);
          g.beginPath();
          g.moveTo(pl.x, pl.y);
          g.lineTo(CX() - 30, CY() + 44);
          g.stroke();
          g.setLineDash([]);
        }

        function drawMission() {
          drawStars();
          drawEarth();

          /* launch ring */
          g.strokeStyle = 'rgba(154,168,195,0.25)';
          g.setLineDash([4, 8]);
          g.lineWidth = 1;
          g.beginPath();
          g.arc(CX(), CY(), R_LAUNCH, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);

          drawTrail(1);

          const pl = state.pl;
          if (pl) drawSatellite(pl);

          /* mission HUD */
          g.textAlign = 'left';
          g.font = '9px "DM Mono", monospace';
          g.fillStyle = 'rgba(154,168,195,0.8)';
          g.fillText('PHYSIX ORBITAL BENCH', 14, 20);
          g.fillStyle = 'rgba(232,237,247,0.6)';
          g.fillText('μ = ' + GM.toLocaleString('en-US') + ' px³/s² · ideal two-body, no drag', 14, 34);
          if (state.dead > 0) {
            g.fillStyle = '#fbbf24';
            g.font = '12px "DM Mono", monospace';
            g.fillText('re-entry — relaunching…', CX() - 70, H / 2 + 78);
          }
        }

        function drawElements() {
          /* polar guide rings */
          g.strokeStyle = 'rgba(255,255,255,0.07)';
          g.lineWidth = 1;
          [70, 130, 190, 250].forEach((rr) => {
            g.beginPath();
            g.arc(CX(), CY(), rr, 0, Math.PI * 2);
            g.stroke();
          });
          g.textAlign = 'center';
          g.font = '9px "DM Mono", monospace';
          g.fillStyle = 'rgba(154,168,195,0.55)';
          [70, 130, 190].forEach((rr) => g.fillText(rr + ' px', CX(), CY() - rr - 3));

          drawTrail(0.7);

          const pl = state.pl;
          if (!pl) return;
          const dx = pl.x - CX(),
            dy = pl.y - CY();
          const r = Math.hypot(dx, dy) || 1;

          /* radius vector */
          g.strokeStyle = 'rgba(232,237,247,0.45)';
          g.lineWidth = 1.2;
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(CX(), CY());
          g.lineTo(pl.x, pl.y);
          g.stroke();
          g.setLineDash([]);

          /* velocity vector (cyan) and gravity vector (amber) */
          const vs = 1.4;
          api.pxArrow(g, pl.x, pl.y, pl.vx * vs, pl.vy * vs, '#22d3ee', 3);
          api.pxLabel(g, pl.x + pl.vx * vs + 6, pl.y + pl.vy * vs - 6, 'v', '#22d3ee');
          const accel = GM / (r * r);
          const gx = (-dx / r) * accel * 900;
          const gy2 = (-dy / r) * accel * 900;
          api.pxArrow(g, pl.x, pl.y, gx, gy2, '#fbbf24', 3);
          api.pxLabel(g, pl.x + gx + 6, pl.y + gy2 + 12, 'g = μ/r²', '#fbbf24');

          /* satellite marker */
          g.fillStyle = '#e8edf7';
          g.beginPath();
          g.arc(pl.x, pl.y, 5, 0, Math.PI * 2);
          g.fill();

          /* central body */
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc(CX(), CY(), 10, 0, Math.PI * 2);
          g.fill();

          const en = orbitalEnergy(pl, GM, CX(), CY());
          g.textAlign = 'left';
          g.font = '11px "DM Mono", monospace';
          g.fillStyle = 'rgba(232,237,247,0.8)';
          g.fillText('r = ' + r.toFixed(0) + ' px', 16, H - 54);
          g.fillText('|v| = ' + Math.hypot(pl.vx, pl.vy).toFixed(0) + ' px/s', 16, H - 38);
          g.fillStyle = en < 0 ? '#34d399' : '#fbbf24';
          g.fillText(
            'ε = ½v² − μ/r = ' + en.toFixed(1) + ' px²/s² ' + (en < 0 ? '(bound)' : '(escape)'),
            16,
            H - 20
          );
        }

        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#060a17');
          bg.addColorStop(1, '#02040a');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawElements();
          else drawMission();
          api.pxLabel(g, W - 118, 20, 't = ' + state.t.toFixed(1) + ' s', 'rgba(232,237,247,0.7)');
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
            const pl = state.pl;
            if (pl) {
              api.graphs[0].push({ t: state.t, r: rOf(pl) });
              api.graphs[1].push({ t: state.t, spd: Math.hypot(pl.vx, pl.vy) });
            }
          }
          sync();
        }

        function stopWatching() {
          if (state._watchTimer) {
            clearInterval(state._watchTimer);
            state._watchTimer = 0;
          }
        }

        reset();
        sync();

        return {
          update,
          draw,
          reset() {
            reset();
            sync();
          },
          onPreset() {
            sV.set(state.v0);
            reset();
            sync();
          },
          destroy: stopWatching
        };
      },
      predict(api) {
        const TARGET = 1.2;
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
            const range = api.graphs[0].timeRange('r');
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
          series: 'r',
          unit: 'px',
          quantity: 'orbit radius',
          absFloor: 5,
          context() {
            return {
              v0: api.state.v0,
              mu: 420000,
              paramsText: 'launch speed = ' + api.state.v0 + ' px/s · μ = 420,000 px³/s²'
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: what is the orbital radius at t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('r', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const circ = Math.sqrt(ctx.mu / 190);
            return (
              'At launch the satellite starts 190 px out with only sideways speed, so it begins to fall. ' +
              'Circular speed there is √(μ/r) = ' +
              circ.toFixed(0) +
              ' px/s; you launched at ' +
              ctx.v0 +
              ' px/s, so the free-fall path is ' +
              (ctx.v0 >= circ ? 'wider than the launch circle — r grows' : 'tighter than the launch circle — r shrinks') +
              '. The radius recorded at ' +
              TARGET.toFixed(1) +
              ' s is a real sample from the integrator, not a formula.'
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
      /* window.__tcProbe contract: orbital invariants (names unchanged). */
      probe(api) {
        const s = api.state;
        const pl = s.pl || { x: 0, y: 0, vx: 0, vy: 0 };
        const dx = pl.x - api.W / 2,
          dy = pl.y - api.H / 2;
        return {
          t: s.t,
          speed: Math.hypot(pl.vx, pl.vy),
          r: Math.hypot(dx, dy),
          dx,
          dy,
          vx: pl.vx,
          vy: pl.vy,
          mu: 420000,
          state: { x: +pl.x.toFixed(6), y: +pl.y.toFixed(6) }
        };
      }
    }),
  { chrome: 'workstation' }
);
