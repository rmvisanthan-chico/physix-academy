import { pxArrow, pxLabel, SU } from './core.js';
import { Sims } from './sims-a.js';
import { createGraph, GRAPH_COLORS as GC } from './graph-engine.js';
import { Workstation } from './sim-ui.js';
import { createPrediction } from './prediction.js';
/* PhysiX Academy — Simulations Part E: richer, more realistic, classroom-friendly sims */
('use strict');

/* local drawing helpers */

/* ---------------- 1. Inclined plane ---------------- */
Sims.register(
  'incline',
  'Inclined Plane',
  'Weight splits into a slide-force and a press-force; friction fights back.',
  '📐',
  (frame) =>
    Workstation.mount(frame, {
      id: 'incline',
      title: 'Inclined Plane',
      desc: 'A block on a ramp: g splits into a slide-force mg sinθ and a press-force mg cosθ, and friction holds back μmg cosθ. The block only slides when tanθ pushes past μ — a threshold, not a speed, and the v–t trace is exactly the straight line that proves it.',
      icon: '📐',
      topic: 'Mechanics',
      level: 'Grade 10–11',
      appKey: 'incline',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Ramp bench' },
        { id: 'science', label: 'Force analysis' }
      ],
      presets: [
        {
          label: 'Gentle slide',
          apply: (s) => {
            s.th = 15;
            s.m = 4;
            s.mu = 0.12;
          }
        },
        {
          label: 'Steep slide',
          apply: (s) => {
            s.th = 50;
            s.m = 4;
            s.mu = 0.12;
          }
        },
        {
          label: 'Rough static',
          apply: (s) => {
            s.th = 32;
            s.m = 4;
            s.mu = 0.6;
          }
        },
        {
          label: 'High friction',
          apply: (s) => {
            s.th = 25;
            s.m = 2;
            s.mu = 0.4;
          }
        }
      ],
      graphs: [
        {
          title: 'Velocity v–t: straight line while sliding, flat while held',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'Velocity',
          yUnit: 'm/s',
          height: 128,
          series: [{ id: 'v', label: 'Velocity v', unit: 'm/s', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const G = 9.8;
        const Lp = 220;
        const PX_PER_M = 100;
        const kf = 0.72;
        const FIXED = 1 / 60;
        let acc = 0;

        /* ---- state lives on the scene: probe, predict and reset all read it ---- */
        S.th = 32;
        S.m = 4;
        S.mu = 0.12;
        S.t = 0;
        S.s = 0;
        S.v = 0;

        /* ---- controls (DOM order: angle, mass, friction) ---- */
        const sTh = api.SU.slider(api.panel, 'Angle θ (°)', 0, 65, 1, 32, (v) => {
          S.th = v;
          reset();
        });
        const sM = api.SU.slider(api.panel, 'Mass m (kg)', 0.5, 12, 0.5, 4, (v) => {
          S.m = v;
          reset();
        }, (v) => v.toFixed(2) + ' kg');
        const sMu = api.SU.slider(api.panel, 'Friction μ', 0, 0.7, 0.01, 0.12, (v) => {
          S.mu = v;
          reset();
        }, (v) => v.toFixed(2));

        /* ---- readouts ---- */
        const rA = api.SU.readout(api.readouts, 'a', '—');
        const rN = api.SU.readout(api.readouts, 'Normal N', '—');
        const rFr = api.SU.readout(api.readouts, 'Friction f', '—');
        const rS = api.SU.readout(api.readouts, 'Distance s', '—');
        const rSt = api.SU.readout(api.readouts, 'Status', '—');

        /* ---- physics — the acceleration follows the threshold: the block is
           held by friction until tan θ > μ, then it accelerates at a constant
           g (sin θ − μ cos θ). Transcribed exactly. ---- */
        function advance(h) {
          S.t += h;
          const th = (S.th * Math.PI) / 180,
            mu = S.mu;
          const N = S.m * G * Math.cos(th),
            fp = S.m * G * Math.sin(th);
          const slides = fp > mu * N && th > 0.001;
          if (!slides) {
            /* Held (or flat): no acceleration, and any residual velocity is gone. */
            S.v = 0;
            return;
          }
          /* Constant acceleration over the sub-step, so this update is exact
             for the slide phase instead of first-order Euler. */
          const a = G * (Math.sin(th) - mu * Math.cos(th));
          S.s += S.v * h + 0.5 * a * h * h;
          S.v += a * h;
          if (S.s >= Lp) {
            S.s = Lp;
            S.v = 0;
          }
        }
        function sample() {
          api.graphs[0].push({ t: S.t, v: S.v });
        }

        function reset() {
          S.s = 0;
          S.v = 0;
          S.t = 0;
          acc = 0;
          api.graphs[0].clear();
          sync();
        }

        function sync() {
          const th = (S.th * Math.PI) / 180,
            mu = S.mu;
          const N = S.m * G * Math.cos(th),
            fp = S.m * G * Math.sin(th),
            fmax = mu * N;
          const slides = fp > fmax && th > 0.001;
          const a = slides ? G * (Math.sin(th) - mu * Math.cos(th)) : 0;
          rA.set(a.toFixed(2) + ' m/s²');
          rN.set(N.toFixed(1) + ' N');
          rFr.set((slides ? fmax : fp).toFixed(1) + ' N');
          rS.set((S.s / PX_PER_M).toFixed(2) + ' m');
          rSt.set(
            !slides && th < 0.001 ? 'Flat — no slide' : slides ? 'Sliding ⏷' : 'Held by friction'
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
          if (api.getLayer() === 'science') drawScience();
          else drawBench();
        }

        function drawBench() {
          const th = (S.th * Math.PI) / 180,
            m = S.m,
            mu = S.mu;
          const mg = m * G;
          const N = mg * Math.cos(th),
            fp = mg * Math.sin(th),
            fmax = mu * N;
          const slides = fp > fmax && th > 0.001;
          const a = slides ? G * (Math.sin(th) - mu * Math.cos(th)) : 0;
          const Bx = 70,
            By = H - 50,
            L = 220;
          const Tx = Bx + L * Math.cos(th),
            Ty = By - L * Math.sin(th);
          /* ramp edge and tick marks */
          g.fillStyle = '#1b2233';
          g.strokeStyle = '#3a4660';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(Bx, By);
          g.lineTo(Tx, Ty);
          g.lineTo(Tx, By);
          g.closePath();
          g.fill();
          g.stroke();
          g.strokeStyle = '#26314a';
          g.lineWidth = 1;
          for (let i = 0; i <= 10; i++) {
            const xx = Bx + (L * Math.cos(th) * i) / 10;
            g.beginPath();
            g.moveTo(xx, By - (L * Math.sin(th) * i) / 10);
            g.lineTo(xx, By + 8);
            g.stroke();
          }
          /* block */
          const bx = Tx - S.s * Math.cos(th),
            by = Ty + S.s * Math.sin(th);
          g.save();
          g.translate(bx, by);
          g.rotate(-th);
          g.fillStyle = '#6d5df6';
          g.fillRect(-20, -16, 40, 32);
          g.fillStyle = 'rgba(255,255,255,.12)';
          g.fillRect(-20, -16, 40, 8);
          g.restore();
          /* force arrows (scale kf is readout-only) */
          api.pxArrow(g, bx, by, 0, mg * kf, '#f87171'); // weight
          api.pxArrow(g, bx, by, -Math.sin(th) * N * kf, -Math.cos(th) * N * kf, '#22d3ee'); // normal
          const fNow = slides ? fmax : fp;
          api.pxArrow(g, bx, by, Math.cos(th) * fNow * kf, -Math.sin(th) * fNow * kf, '#34d399'); // friction (up-slope)
          api.pxArrow(g, bx, by, -Math.cos(th) * fp * kf, Math.sin(th) * fp * kf, 'rgba(251,191,36,.7)', 2); // parallel comp
          /* HUD */
          api.pxLabel(g, bx + 8, by + mg * kf + 4, 'mg', '#f87171');
          api.pxLabel(g, bx - Math.sin(th) * N * kf - 30, by - Math.cos(th) * N * kf, 'N', '#22d3ee');
          api.pxLabel(g, bx + Math.cos(th) * fNow * kf + 6, by - Math.sin(th) * fNow * kf, 'f', '#34d399');
          api.pxLabel(g, 20, 22, 'PHYSIX RAMP BENCH', 'rgba(232,237,247,0.7)');
          api.pxLabel(
            g,
            W - 260,
            22,
            'a = ' + a.toFixed(2) + ' m/s² · s = ' + (S.s / PX_PER_M).toFixed(2) + ' m',
            'rgba(34,211,238,0.9)'
          );
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
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }
          const th = (S.th * Math.PI) / 180,
            m = S.m,
            mu = S.mu;
          const mg = m * G;
          const N = mg * Math.cos(th),
            fp = mg * Math.sin(th),
            fmax = mu * N;
          const slides = fp > fmax && th > 0.001;
          const a = slides ? G * (Math.sin(th) - mu * Math.cos(th)) : 0;
          const ax = 30,
            ay = H * 0.5;
          const gv = 60;
          /* gravity vector down */
          api.pxArrow(g, ax, ay, 0, gv, '#f87171');
          api.pxLabel(g, ax + 8, ay + 22, 'g = 9.8 m/s²', '#f87171');
          /* components scaled into the slope frame */
          const ang = -th;
          g.save();
          g.translate(ax, ay);
          g.rotate(ang);
          api.pxArrow(g, 0, 0, 0, -(gv * (Math.sin(th) / 1)), '#22d3ee');
          api.pxLabel(g, -34, -(gv * Math.sin(th)) - 6, 'g sinθ', '#22d3ee');
          g.restore();
          g.save();
          g.translate(ax, ay);
          g.rotate(-ang);
          api.pxArrow(g, 0, 0, -(gv * Math.cos(th)), 0, '#34d399');
          api.pxLabel(g, -(gv * Math.cos(th)) - 22, -8, 'g cosθ', '#34d399');
          g.restore();
          /* friction arrow opposite motion */
          if (slides) {
            api.pxArrow(g, ax + 40, ay, -60 * mu, 0, '#fbbf24');
            api.pxLabel(g, ax + 20, ay + 22, 'μN = ' + fmax.toFixed(1) + ' N', '#fbbf24');
          }
          /* conclusion box */
          g.fillStyle = 'rgba(232,237,247,0.08)';
          g.font = '12px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText(
            slides ? 'a = g (sin θ − μ cos θ) = ' + a.toFixed(2) + ' m/s²' : 'Tan θ ≤ μ: held by friction',
            W / 2,
            H - 30
          );
          api.pxLabel(
            g,
            20,
            22,
            'N = mg cosθ · f = μN · F‖ = mg sinθ',
            'rgba(232,237,247,0.8)'
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
          if (acc > FIXED) acc = 0; /* drop backlog, same rule as a fixed-step spec */
          sync();
        }

        reset();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sTh.set(S.th);
            sM.set(S.m);
            sMu.set(S.mu);
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
        const G = 9.8;
        const th = (S.th * Math.PI) / 180,
          mu = S.mu;
        const N = S.m * G * Math.cos(th),
          fp = S.m * G * Math.sin(th);
        const slides = fp > mu * N && th > 0.001;
        return {
          t: S.t,
          s: S.s,
          v: S.v,
          /* Static case really has a = 0; reporting g(sin θ − μ cos θ) there
             was wrong - that is the sliding acceleration, not the block's. */
          a: slides ? G * (Math.sin(th) - mu * Math.cos(th)) : 0,
          N,
          friction: slides ? mu * N : fp,
          slides,
          state: { s: +S.s.toFixed(6), v: +S.v.toFixed(6) }
        };
      },
      predict(api) {
        const S = api.state;
        const TARGET = 1.0; /* 1 s of run — always under the ramp foot at any default angle */
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
          absFloor: 0.3,
          context() {
            return {
              theta: S.th,
              m: S.m,
              mu: S.mu,
              paramsText: 'θ = ' + S.th + '° · m = ' + S.m + ' kg · μ = ' + S.mu + ' · L = 2.2 m'
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: what is the block speed after t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('v', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const slides = () => {
              const th = (ctx.theta * Math.PI) / 180;
              return S.m * G * Math.sin(th) > ctx.mu * S.m * G * Math.cos(th) && ctx.theta > 0.001;
            };
            if (!slides()) return 'The angle is at or below the friction threshold, so the block is held and the graph stays flat at zero — a static law rather than a motion.';
            const a = G * (Math.sin((ctx.theta * Math.PI) / 180) - ctx.mu * Math.cos((ctx.theta * Math.PI) / 180));
            return (
              'While it slides the block has a constant acceleration a = g (sin θ − μ cos θ) = ' +
              a.toFixed(2) +
              ' m/s², so v(t) = a·t = ' +
              a.toFixed(2) +
              ' · ' +
              TARGET.toFixed(1) +
              ' ≈ ' +
              (a * TARGET).toFixed(2) +
              ' m/s. The v–t trace on the graph is that straight line — a constant slope is what "constant acceleration" looks like in data.'
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
/* ---------------- 2. Atwood machine ---------------- */
Sims.register(
  'atwood',
  'Atwood Machine',
  'Two masses, one rope, one acceleration: a = (m₂−m₁)g / (m₁+m₂).',
  '⚖️',
  (frame) =>
    Workstation.mount(frame, {
      id: 'atwood',
      title: 'Atwood Machine',
      desc: 'The simplest quantitative machine: two masses on one rope over a pulley, a = (m₂ − m₁)g/(m₁ + m₂) — a constant acceleration that a light sensor, or a good student, can measure straight from the v–t trace.',
      icon: '⚖️',
      topic: 'Mechanics',
      level: 'Grade 11–12',
      appKey: 'atwood',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Pulley rig' },
        { id: 'science', label: 'Dynamics' }
      ],
      presets: [
        {
          label: 'Balanced',
          apply: (s) => {
            s.m1 = 3;
            s.m2 = 3;
          }
        },
        {
          label: 'Two to one',
          apply: (s) => {
            s.m1 = 2;
            s.m2 = 5;
          }
        },
        {
          label: 'Big spread',
          apply: (s) => {
            s.m1 = 0.5;
            s.m2 = 8;
          }
        },
        {
          label: 'Light balance',
          apply: (s) => {
            s.m1 = 1.5;
            s.m2 = 1.5;
          }
        }
      ],
      graphs: [
        {
          title: 'Speed v–t: slope = a = (m₂−m₁)g/(m₁+m₂)',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'Speed',
          yUnit: 'm/s',
          height: 128,
          series: [{ id: 'v', label: 'Speed v', unit: 'm/s', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const G = 9.8;
        const kf = 0.9;
        const PMAX = 84;
        const FIXED = 1 / 60;
        let acc = 0;

        S.m1 = 2;
        S.m2 = 5;
        S.t = 0;
        S.d = 0;
        S.v = 0;

        /* ---- controls (DOM order: m1, m2 — the legacy contract) ---- */
        const sM1 = api.SU.slider(api.panel, 'Mass m₁ (kg)', 0.5, 8, 0.5, 2, (v) => {
          S.m1 = v;
          reset();
        }, (v) => v.toFixed(2) + ' kg');
        const sM2 = api.SU.slider(api.panel, 'Mass m₂ (kg)', 0.5, 8, 0.5, 5, (v) => {
          S.m2 = v;
          reset();
        }, (v) => v.toFixed(2) + ' kg');

        /* ---- readouts ---- */
        const rA = api.SU.readout(api.readouts, 'a', '—');
        const rT = api.SU.readout(api.readouts, 'Tension T', '—');
        const rDir = api.SU.readout(api.readouts, 'Heavier', '—');

        /* ---- physics (constant acceleration, exact over the sub-step) ---- */
        function advance(h) {
          S.t += h;
          const m1 = S.m1,
            m2 = S.m2;
          const aMag = (Math.abs(m2 - m1) * G) / (m1 + m2);
          if (aMag === 0 || S.d >= PMAX) return;
          S.d += S.v * h + 0.5 * aMag * h * h;
          S.v += aMag * h;
          if (S.d >= PMAX) {
            S.d = PMAX;
            S.v = 0;
          }
        }
        function sample() {
          api.graphs[0].push({ t: S.t, v: S.v });
        }

        function reset() {
          S.d = 0;
          S.v = 0;
          S.t = 0;
          acc = 0;
          api.graphs[0].clear();
          sync();
        }

        function sync() {
          const m1 = S.m1,
            m2 = S.m2;
          const balanced = m2 === m1;
          const heavyRight = m2 > m1;
          const aMag = (Math.abs(m2 - m1) * G) / (m1 + m2);
          const T = (2 * m1 * m2 * G) / (m1 + m2);
          rA.set(aMag.toFixed(2) + ' m/s²');
          rT.set(T.toFixed(1) + ' N');
          rDir.set(balanced ? 'balanced' : heavyRight ? 'm₂ ↓' : 'm₁ ↓');
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

        function drawRig() {
          const m1 = S.m1,
            m2 = S.m2;
          const balanced = m2 === m1;
          const heavyRight = m2 > m1;
          const dir = heavyRight ? 1 : -1;
          const aMag = (Math.abs(m2 - m1) * G) / (m1 + m2);
          const T = (2 * m1 * m2 * G) / (m1 + m2);
          const cx = W / 2,
            py = 42,
            y0 = 130;
          /* pulley */
          g.fillStyle = '#33415c';
          g.beginPath();
          g.arc(cx, py, 26, 0, 7);
          g.fill();
          g.fillStyle = '#0b1120';
          g.beginPath();
          g.arc(cx, py, 9, 0, 7);
          g.fill();
          /* rope */
          g.strokeStyle = '#9aa8c3';
          g.lineWidth = 2;
          const yL = y0 - dir * S.d,
            yR = y0 + dir * S.d;
          g.beginPath();
          g.moveTo(cx - 26, py);
          g.lineTo(cx - 26, yL);
          g.moveTo(cx + 26, py);
          g.lineTo(cx + 26, yR);
          g.stroke();
          const draw = (x, y, m, col) => {
            g.fillStyle = col;
            g.fillRect(x - 22, y - 22, 44, 44);
            g.fillStyle = '#fff';
            g.font = 'bold 12px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText(m + 'kg', x, y + 4);
            g.textAlign = 'left';
            api.pxArrow(g, x, y + 22, 0, m * G * kf, '#f87171');
            api.pxArrow(g, x, y - 22, 0, -T * kf, '#22d3ee');
          };
          if (heavyRight) {
            draw(cx - 26, yL, m1, '#22d3ee');
            draw(cx + 26, yR, m2, '#fbbf24');
          } else {
            draw(cx - 26, yL, m1, '#fbbf24');
            draw(cx + 26, yR, m2, '#22d3ee');
          }
          /* distance bracket */
          g.strokeStyle = 'rgba(232,237,247,0.5)';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(cx - 30, y0);
          g.lineTo(cx - 30, yL);
          g.moveTo(cx + 30, y0);
          g.lineTo(cx + 30, yR);
          g.stroke();
          api.pxLabel(g, 20, 22, 'PHYSIX PULLEY RIG', 'rgba(232,237,247,0.7)');
          api.pxLabel(
            g,
            W - 240,
            22,
            'a = ' + aMag.toFixed(2) + ' m/s² · d = ' + (S.d / 10).toFixed(2) + ' m',
            'rgba(34,211,238,0.9)'
          );
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
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }
          const m1 = S.m1,
            m2 = S.m2;
          const aMag = (Math.abs(m2 - m1) * G) / (m1 + m2);
          const T = (2 * m1 * m2 * G) / (m1 + m2);
          const cx = W / 2;
          /* free-body: net force = tension on one mass */
          g.fillStyle = '#33415c';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('m₁ = ' + m1 + ' kg', cx - 120, 70);
          g.fillText('m₂ = ' + m2 + ' kg', cx + 120, 70);
          /* force diagram boxes */
          g.fillStyle = 'rgba(248,113,113,0.1)';
          g.strokeStyle = '#f87171';
          g.lineWidth = 2;
          g.fillRect(cx - 180, 90, 160, 120);
          g.fillRect(cx + 20, 90, 160, 120);
          g.fillStyle = '#e8edf7';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('m₁:  T − m₁g = m₁a', cx - 160, 115);
          g.fillText('m₂:  m₂g − T = m₂a', cx + 40, 115);
          g.fillText('T = m₁(g + a) = ' + T.toFixed(1) + ' N', cx - 160, 145);
          g.fillText('a = |m₂ − m₁|·g/(m₁+m₂)', cx + 40, 145);
          g.fillText('a = ' + aMag.toFixed(2) + ' m/s²', cx + 40, 175);
          /* FBD weights */
          g.fillStyle = '#f87171';
          g.font = '10px "DM Mono", monospace';
          g.fillText('m₁g = ' + (m1 * G).toFixed(1) + ' N', cx - 160, 200);
          g.fillText('m₂g = ' + (m2 * G).toFixed(1) + ' N', cx + 40, 200);
          api.pxLabel(g, 20, 22, '1 rope · constant a · F = ma on each mass', 'rgba(232,237,247,0.8)');
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
          if (acc > FIXED) acc = 0;
          sync();
        }

        reset();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sM1.set(S.m1);
            sM2.set(S.m2);
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
        const G = 9.8;
        const m1 = S.m1,
          m2 = S.m2;
        return {
          t: S.t,
          d: S.d,
          v: S.v,
          a: (Math.abs(m2 - m1) * G) / (m1 + m2),
          T: (2 * m1 * m2 * G) / (m1 + m2),
          balanced: m2 === m1,
          heavier: m2 === m1 ? 'none' : m2 > m1 ? 'm2' : 'm1',
          state: { d: +S.d.toFixed(6), v: +S.v.toFixed(6) }
        };
      },
      predict(api) {
        const S = api.state;
        const TARGET = 1.0;
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
          quantity: 'speed',
          absFloor: 0.3,
          context() {
            return {
              m1: S.m1,
              m2: S.m2,
              paramsText: 'm₁ = ' + S.m1 + ' kg · m₂ = ' + S.m2 + ' kg · PMAX = 84 px'
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: what is the speed after t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('v', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const a = (Math.abs(ctx.m2 - ctx.m1) * G) / (ctx.m1 + ctx.m2);
            if (Math.abs(ctx.m2 - ctx.m1) === 0)
              return 'The masses are equal — the machine is balanced, a is zero, and the v–t trace is a flat line at zero.';
            return (
              'The acceleration is a = |m₂ − m₁|·g/(m₁ + m₂) = ' +
              a.toFixed(2) +
              ' m/s² and it is constant, so v(t) = a·t = ' +
              a.toFixed(2) +
              ' · ' +
              TARGET.toFixed(1) +
              ' ≈ ' +
              (a * TARGET).toFixed(2) +
              ' m/s. Notice the readout tension T = 2m₁m₂g/(m₁+m₂) is computed from the very same masses: the whole machine is one equation, not two.'
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
/* ---------------- 3. Standing waves on a string ---------------- */
Sims.register(
  'standing',
  'Standing Waves',
  'Two equal waves meet — fixed ends force nodes and antinodes.',
  '〰️',
  (frame) =>
    Workstation.mount(frame, {
      id: 'standing',
      title: 'Standing Waves',
      desc: 'A string pinned at both ends can only shake in patterns that fit the length: modes n = 1, 2, 3…, with nodes where the string never moves and antinodes where it moves the most. The envelope is a static shape; every point on the string oscillates at the same base frequency of 0.6 Hz.',
      icon: '〰️',
      topic: 'Waves',
      level: 'Grade 11–12',
      appKey: 'standing',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'String rig' },
        { id: 'science', label: 'Spatial analysis' }
      ],
      presets: [
        { label: 'Fundamental', apply: (s) => { s.n = 1; s.am = 36; } },
        { label: 'Second harmonic', apply: (s) => { s.n = 2; s.am = 36; } },
        { label: 'Third harmonic', apply: (s) => { s.n = 3; s.am = 36; } },
        { label: 'High, tight', apply: (s) => { s.n = 6; s.am = 20; } }
      ],
      graphs: [
        {
          title: 'Amplitude envelope — the static shape the string takes',
          xLabel: 'Position x',
          xUnit: 'px',
          xKey: 'x',
          yLabel: 'Amplitude',
          yUnit: 'px',
          height: 128,
          series: [{ id: 'amp', label: 'Amplitude', unit: 'px', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.n = 3;
        S.am = 36;
        S.t = 0;

        const sN = api.SU.slider(api.panel, 'Harmonic n', 1, 6, 1, 3, (v) => {
          S.n = v;
          sweep();
          if (S.onParam) S.onParam();
        });
        const sA = api.SU.slider(api.panel, 'Amplitude', 8, 60, 1, 36, (v) => {
          S.am = v;
          sweep();
          if (S.onParam) S.onParam();
        }, (v) => v + ' px');

        const rL = api.SU.readout(api.readouts, 'λ = 2L/n', '—');
        const rF = api.SU.readout(api.readouts, 'Frequency', '—');

        const x0 = 40;
        const L = W - 80;
        const mid = H / 2;

        /* nodes sit exactly at x0 + p·L/n — the testable claim */
        const nodePositions = () => Array.from({ length: S.n + 1 }, (_, p) => x0 + (p * L) / S.n);

        /* the spatial amplitude envelope — the data the prediction panel reads;
           the loop works in local coordinates and the graph stores the mapped
           canvas positions. */
        function sweep() {
          const G = api.graphs[0];
          if (!G) return;
          G.clear();
          for (let x = 0; x <= L; x += 2) {
            G.push({ x: x0 + x, amp: S.am * Math.abs(Math.sin((S.n * Math.PI * x) / L)) });
          }
        }

        /* ---- modelling: advance only advances the clock ---- */
        function advance(h) {
          S.t += h;
        }

        function reset() {
          S.t = 0;
          acc = 0;
          sweep();
          sync();
        }
        function sync() {
          rL.set(((2 * L) / S.n).toFixed(0) + ' px');
          rF.set(S.n + ' × f₁ = ' + (S.n * 0.6).toFixed(2) + ' Hz');
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

        function drawRig() {
          const n = S.n,
            amp = S.am;
          /* equilibrium line and end fixings */
          g.strokeStyle = '#26314a';
          g.lineWidth = 1;
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(x0, mid);
          g.lineTo(x0 + L, mid);
          g.stroke();
          g.setLineDash([]);
          g.fillStyle = '#6b7a99';
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('fixed', x0, mid + 14);
          g.fillText('fixed', x0 + L, mid + 14);
          /* the oscillating string */
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 3;
          g.beginPath();
          for (let x = 0; x <= L; x += 2) {
            const y = mid - amp * Math.sin((n * Math.PI * x) / L) * Math.cos(2 * Math.PI * 0.6 * S.t);
            x ? g.lineTo(x0 + x, y) : g.moveTo(x0 + x, y);
          }
          g.stroke();
          /* the envelope (thin) */
          g.strokeStyle = 'rgba(34,211,238,0.3)';
          g.lineWidth = 1;
          g.beginPath();
          for (let x = x0; x <= x0 + L; x += 2) {
            const y = mid - amp * Math.abs(Math.sin((n * Math.PI * x) / L));
            x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
          }
          g.stroke();
          g.beginPath();
          for (let x = x0; x <= x0 + L; x += 2) {
            const y = mid + amp * Math.abs(Math.sin((n * Math.PI * x) / L));
            x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
          }
          g.stroke();
          api.pxLabel(g, 20, 22, 'PHYSIX STRING RIG', 'rgba(232,237,247,0.7)');
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
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }
          const n = S.n,
            amp = S.am;
          /* nodes (never move) and antinodes (move most) */
          for (let p = 0; p <= n; p++) {
            const xn = x0 + (p * L) / n;
            g.fillStyle = '#f87171';
            g.beginPath();
            g.arc(xn, mid, 4, 0, 7);
            g.fill();
            g.fillStyle = '#e8edf7';
            g.font = '10px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText('node ' + p, xn, mid + 36);
          }
          for (let p = 0; p < n; p++) {
            const xn = x0 + ((p + 0.5) * L) / n;
            g.fillStyle = '#34d399';
            g.beginPath();
            g.arc(xn, mid, 4, 0, 7);
            g.fill();
            g.fillStyle = '#e8edf7';
            g.font = '10px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText('anti', xn, mid - 10);
          }
          /* wavelength bracket */
          g.strokeStyle = 'rgba(232,237,247,0.3)';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x0 + L / (2 * n), mid + 56);
          g.lineTo(x0 + 3 * L / (2 * n), mid + 56);
          g.moveTo(x0 + L / (2 * n), mid + 52);
          g.lineTo(x0 + L / (2 * n), mid + 60);
          g.moveTo(x0 + 3 * L / (2 * n), mid + 52);
          g.lineTo(x0 + 3 * L / (2 * n), mid + 60);
          g.stroke();
          g.fillStyle = '#6b7a99';
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('λ = 2L/' + n + ' px', x0 + L / n, mid + 70);
          api.pxLabel(g, 20, 22, 'y = A · sin(nπx/L) · cos(2π·0.6·t)', 'rgba(232,237,247,0.8)');
          api.pxLabel(g, 20, 40, 'nodes never move · every point at 0.6 Hz', 'rgba(107,122,153,0.9)');
        }

        /* ---- per-frame pump ---- */
        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < 10) {
            advance(FIXED);
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
            sN.set(S.n);
            sA.set(S.am);
            reset();
          },
          destroy() {}
        };
      },
      probe(api) {
        const S = api.state;
        const x0 = 40;
        const L = api.W - 80;
        const n = S.n;
        return {
          t: S.t,
          n,
          nodes: n + 1,
          L,
          nodeX: Array.from({ length: n + 1 }, (_, p) => x0 + (p * L) / n),
          phase: (2 * Math.PI * 0.6 * S.t) % (2 * Math.PI),
          fnHz: n * 0.6,
          state: {}
        };
      },
      predict(api) {
        const S = api.state;
        const xAntinode = 40 + (api.W - 80) / (2 * S.n);
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'amp',
          unit: 'px',
          quantity: 'amplitude at the first antinode',
          absFloor: 3,
          context() {
            return {
              n: S.n,
              x: xAntinode,
              paramsText: 'n = ' + S.n + ' · A = ' + S.am + ' px · L = ' + (api.W - 80) + ' px'
            };
          },
          question() {
            return 'Predict first: what is the amplitude at the first antinode, x = ' + xAntinode.toFixed(0) + ' px?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('amp', xAntinode);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const L = api.W - 80;
            return (
              'The string is pinned at x = 40 and x = ' +
              (40 + L) +
              ', so the standing pattern must fit n half-wavelengths: λ = 2L/n and the nodes sit at x = 40 + p·L/n — exactly the red dots. The first antinode is halfway between two nodes, x = ' +
              xAntinode.toFixed(0) +
              ' px, and it oscillates with the full amplitude A. Open the explanation to see that every point on the same string oscillates at the base frequency 0.6 Hz, and that the amplitude envelope on the graph is a real measurable standing wave.'
            );
          },
          onLock() {
            pred.reveal();
          },
          onReset() {
            pred.refresh();
          }
        });
        S.onParam = () => {
          pred.refresh();
        };
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);
/* ---------------- 4. Wave interference (ripple tank) ---------------- */
Sims.register(
  'interference',
  'Wave Interference',
  'Two sources: crests add (bright) or cancel (dark). Path difference rules it.',
  '🌐',
  (frame) =>
    Workstation.mount(frame, {
      id: 'interference',
      title: 'Wave Interference',
      desc: 'Two point sources send out identical ripples; where the path difference is a whole number of wavelengths the crests join and go bright, a half-wavelength and they cancel dark. A ripple tank, or the double slit, or two engines on one hull — the rule Δ = nλ is the rule everywhere.',
      icon: '🌐',
      topic: 'Waves',
      level: 'Grade 11–12',
      appKey: 'interference',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Ripple tank' },
        { id: 'science', label: 'Path analysis' }
      ],
      presets: [
        { label: 'Close sources', apply: (s) => { s.d = 60; s.lam = 48; } },
        { label: 'Default sweep', apply: (s) => { s.d = 150; s.lam = 48; } },
        { label: 'Wide shipping', apply: (s) => { s.d = 320; s.lam = 48; } },
        { label: 'Big water', apply: (s) => { s.d = 150; s.lam = 96; } }
      ],
      graphs: [
        {
          title: 'Edge amplitude z vs source separation d',
          xLabel: 'Separation d',
          xUnit: 'px',
          xKey: 'd',
          yLabel: 'Edge amplitude |z|',
          yUnit: '',
          height: 128,
          series: [{ id: 'edgeAmp', label: 'Edge amplitude', unit: '', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        const OW = 200,
          OH = 100;
        const oc = document.createElement('canvas');
        oc.width = OW;
        oc.height = OH;
        const octx = oc.getContext('2d');
        const img = octx.createImageData(OW, OH);
        const data = img.data;

        const oScale = OW / W; /* OS → main canvas scale */
        const mid = OH / 2;

        S.d = 150;
        S.lam = 48;
        S.t = 0;

        const sD = api.SU.slider(api.panel, 'Separation d', 40, 320, 2, 150, (v) => {
          S.d = v;
          sweep();
          if (S.onParam) S.onParam();
        });
        const sL = api.SU.slider(api.panel, 'Wavelength λ', 18, 120, 1, 48, (v) => {
          S.lam = v;
          sweep();
          if (S.onParam) S.onParam();
        }, (v) => v + ' px');

        /* ---- readouts ---- */
        const rNote = api.SU.readout(api.readouts, 'Note', '');

        const k = () => (2 * Math.PI) / S.lam;
        const w = () => 2 * Math.PI * 0.5;

        /* ---- modelling: advance only advances the clock ---- */
        function advance(h) {
          S.t += h;
        }

        /* the interference field is rebuilt every frame from the current t */
        function tank() {
          const sx1 = OW / 2 - S.d * oScale / 2;
          const sx2 = OW / 2 + S.d * oScale / 2;
          const kk = k();
          const ww = w();
          for (let j = 0; j < OH; j++) {
            for (let i = 0; i < OW; i++) {
              const x = i,
                y = j;
              const r1 = Math.hypot(x - sx1, y - mid),
                r2 = Math.hypot(x - sx2, y - mid);
              const z = Math.sin(kk * r1 - ww * S.t) + Math.sin(kk * r2 - ww * S.t);
              const inten = z * 0.5 + 1;
              const c = Math.max(0, Math.min(255, inten * 190 + 20));
              const o = (j * OW + i) * 4;
              data[o] = c * 0.4;
              data[o + 1] = c * 0.8;
              data[o + 2] = c;
              data[o + 3] = 255;
            }
          }
          octx.putImageData(img, 0, 0);
        }

        /* the right-edge oscillation and its envelope as a function of d */
        function edgeAmpOf(d) {
          const s2 = d * oScale;
          return 2 * Math.abs(Math.cos(k() * s2 / 2));
        }

        /* the edge amplitude as a function of separation — the graph data.
           Rebuilt on every parameter change so the panel always has current
           data to read. */
        function sweep() {
          const G = api.graphs[0];
          if (!G) return;
          G.clear();
          for (let d = 40; d <= 320; d += 2) {
            G.push({ d, edgeAmp: edgeAmpOf(d) });
          }
        }

        function reset() {
          S.t = 0;
          acc = 0;
          sweep();
          tank();
          sync();
        }
        function sync() {
          rNote.set('Bright where Δ = nλ — max order ' + Math.floor(S.d / S.lam));
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
          else drawTank();
        }

        function drawTank() {
          const psx1 = OW / 2 - S.d / 2,
            psx2 = OW / 2 + S.d / 2;
          g.drawImage(oc, 0, 0, W, H);
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc((psx1 / OW) * W, H / 2, 7, 0, 7);
          g.fill();
          g.beginPath();
          g.arc((psx2 / OW) * W, H / 2, 7, 0, 7);
          g.fill();
          g.strokeStyle = 'rgba(255,255,255,.25)';
          g.setLineDash([5, 5]);
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(0, H / 2);
          g.lineTo(W, H / 2);
          g.stroke();
          g.setLineDash([]);
          api.pxLabel(g, 20, 22, 'PHYSIX RIPPLE TANK', 'rgba(232,237,247,0.7)');
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
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }
          const psx1 = OW / 2 - S.d / 2,
            psx2 = OW / 2 + S.d / 2;
          /* sources */
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc((psx1 / OW) * W, H / 2, 8, 0, 7);
          g.fill();
          g.beginPath();
          g.arc((psx2 / OW) * W, H / 2, 8, 0, 7);
          g.fill();
          g.fillStyle = '#e8edf7';
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('source 1', (psx1 / OW) * W - 18, H / 2 - 20);
          g.fillText('source 2', (psx2 / OW) * W - 18, H / 2 - 20);
          /* path-difference measurement along the centreline */
          g.strokeStyle = '#fbbf24';
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo((psx1 / OW) * W + 10, H / 2);
          g.lineTo((psx2 / OW) * W - 10, H / 2);
          g.stroke();
          g.fillStyle = '#fbbf24';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('Δ = ' + (S.d * oScale).toFixed(0) + ' px', (W / 4), H / 2 - 10);
          g.fillText("Δ = " + S.d + ' px', (W / 4), H / 2 + 30);
          api.pxLabel(g, 20, 22, 'Δx between a point and the two sources decides bright or dark', 'rgba(232,237,247,0.8)');
          api.pxLabel(g, 20, 40, 'z = 2·cos(π·Δ/λ) at every point of equal Δ', 'rgba(107,122,153,0.9)');
        }

        /* ---- per-frame pump ---- */
        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < 10) {
            advance(FIXED);
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0;
          tank();
          sync();
        }

        reset();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sD.set(S.d);
            sL.set(S.lam);
            reset();
          },
          destroy() {}
        };
      },
      probe(api) {
        const S = api.state;
        const OW = 200,
          OH = 100;
        const oScale = OW / api.W;
        const mid = OH / 2;
        const sx1 = OW / 2 - S.d * oScale / 2;
        const sx2 = OW / 2 + S.d * oScale / 2;
        const kk = (2 * Math.PI) / S.lam;
        const ww = 2 * Math.PI * 0.5;
        const sampleZ = (x, y) => {
          const r1 = Math.hypot(x - sx1, y - mid),
            r2 = Math.hypot(x - sx2, y - mid);
          return Math.sin(kk * r1 - ww * S.t) + Math.sin(kk * r2 - ww * S.t);
        };
        const pdEdge = sx2 - sx1;
        return {
          t: S.t,
          d: S.d,
          lambda: S.lam,
          phase: (ww * S.t) % (2 * Math.PI),
          maxOrder: Math.floor(S.d / S.lam),
          zAtOrigin: +sampleZ(OW / 2, mid).toFixed(6),
          pDiffEdge: +pdEdge.toFixed(4),
          edgeAmp: +(2 * Math.abs(Math.cos(kk * S.d * oScale / 2))).toFixed(4),
          zAtRightEdge: +sampleZ(OW - 1, mid).toFixed(6),
          state: {}
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'edgeAmp',
          unit: 'px',
          quantity: 'maximum right-edge amplitude',
          absFloor: 0.25,
          context() {
            return {
              d: S.d,
              lam: S.lam,
              paramsText: 'd = ' + S.d + ' px · λ = ' + S.lam + ' px · Δ = ' + (S.d * (200 / api.W)).toFixed(0) + ' px'
            };
          },
          question() {
            return (
              'Predict first: what is the maximum amplitude at the right edge for a separation of ' +
              S.d +
              ' px and λ = ' +
              S.lam +
              ' px?'
            );
          },
          observe() {
            const hit = api.graphs[0].valueAt('edgeAmp', S.d);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const d = ctx.d;
            const lam = ctx.lam;
            const kk = (2 * Math.PI) / lam;
            const amp = 2 * Math.abs(Math.cos(kk * d * (200 / api.W) / 2));
            return (
              'The right-edge point sees the two wavefronts with a path difference Δ = d·OW/W = ' +
              (d * (200 / api.W)).toFixed(0) +
              ' px, so the amplitude there is 2·|cos(π·Δ/λ)| = ' +
              amp.toFixed(3) +
              ' - bright where Δ is an integer multiple of λ and dark where it is a half. ' +
              'The graph shows the whole relation across every separation d.'
            );
          },
          onLock() {
            pred.reveal();
          },
          onReset() {
            pred.refresh();
          }
        });
        S.onParam = () => {
          pred.refresh();
        };
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);
/* ---------------- 5. Refraction / Snell's law ---------------- */
Sims.register(
  'refraction',
  'Refraction (Snell)',
  'Light bends toward the normal entering a denser medium; past the critical angle it reflects.',
  '🔆',
  (frame) =>
    Workstation.mount(frame, {
      id: 'refraction',
      title: 'Refraction (Snell)',
      desc: 'Snell\'s law — n₁ sinθ₁ = n₂ sinθ₂ — is the rule a lens maker, or a fish watching light bend at the surface, uses every day. At the critical angle the boundary reflects everything: total internal reflection is the trick behind fibre optics and rainbow mirages.',
      icon: '🔆',
      topic: 'Optics',
      level: 'Grade 11–12',
      appKey: 'refraction',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Optics bench' },
        { id: 'science', label: 'Angles' }
      ],
      presets: [
        { label: 'Air to glass', apply: (s) => { s.n1 = 1; s.n2 = 1.5; s.th = 40; } },
        { label: 'Water to air', apply: (s) => { s.n1 = 1.33; s.n2 = 1; s.th = 40; } },
        { label: 'Near critical', apply: (s) => { s.n1 = 1.5; s.n2 = 1; s.th = 40; } },
        { label: 'Deep TIR', apply: (s) => { s.n1 = 1.5; s.n2 = 1; s.th = 60; } }
      ],
      graphs: [
        {
          title: 'Refracted angle θ₂ versus incident angle θ₁',
          xLabel: 'Incident angle θ₁',
          xUnit: '°',
          xKey: 'th1',
          yLabel: 'θ₂',
          yUnit: '°',
          height: 128,
          series: [{ id: 'th2', label: 'θ₂', unit: '°', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.n1 = 1;
        S.n2 = 1.5;
        S.th = 40;
        S.t = 0;

        const sN1 = api.SU.slider(api.panel, 'n₁ (top)', 1, 2, 0.01, 1, (v) => {
          S.n1 = v;
          sweep();
          if (S.onParam) S.onParam();
        }, (v) => v.toFixed(2));
        const sN2 = api.SU.slider(api.panel, 'n₂ (bottom)', 1, 2.4, 0.01, 1.5, (v) => {
          S.n2 = v;
          sweep();
          if (S.onParam) S.onParam();
        }, (v) => v.toFixed(2));
        const sTh = api.SU.slider(api.panel, 'θ₁ (°)', 5, 85, 1, 40, (v) => {
          S.th = v;
          sweep();
          if (S.onParam) S.onParam();
        }, (v) => v + '°');

        /* ---- readouts ---- */
        const rT2 = api.SU.readout(api.readouts, 'θ₂', '—');
        const rC = api.SU.readout(api.readouts, 'Critical', '—');
        const rSt = api.SU.readout(api.readouts, 'Result', '—');

        /* ---- modelling: optics is a pure function of the three sliders ---- */
        function physics() {
          const n1 = S.n1,
            n2 = S.n2;
          const th1 = (S.th * Math.PI) / 180;
          const sin2 = (n1 / n2) * Math.sin(th1);
          const tir = sin2 > 1;
          const th2 = tir ? 0 : Math.asin(sin2);
          const crit = n2 > n1 ? (Math.asin(n1 / n2) * 180) / Math.PI : null;
          return { n1, n2, th1, sin2, tir, th2, crit };
        }

        /* θ₂ vs θ₁ sweep — graph data built at every parameter change.
           Values beyond the critical angle are simply absent. */
        function sweep() {
          const G = api.graphs[0];
          if (!G) return;
          G.clear();
          for (let th1 = 5; th1 <= 85; th1 += 1) {
            const n1 = S.n1,
              n2 = S.n2;
            const sin2 = (n1 / n2) * Math.sin((th1 * Math.PI) / 180);
            if (sin2 > 1) continue;
            G.push({ th1, th2: (Math.asin(sin2) * 180) / Math.PI });
          }
        }

        function reset() {
          acc = 0;
          sweep();
          sync();
        }
        function sync() {
          const { th2, crit, tir } = physics();
          rT2.set(tir ? '—' : ((th2 * 180) / Math.PI).toFixed(1) + '°');
          rC.set(crit ? crit.toFixed(1) + '°' : 'none');
          rSt.set(tir ? '💡 Total internal reflection' : 'Refracted');
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawBench();
          else drawRig();
        }

        function drawRig() {
          const { n1, n2, th1, th2, tir } = physics();
          const mid = H / 2,
            ix = W * 0.3;
          /* half-planes + interface + normal */
          g.fillStyle = 'rgba(34,211,238,.06)';
          g.fillRect(0, mid, W, H - mid);
          g.fillStyle = '#6b7a99';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('medium n₁', 12, 18);
          g.fillText('medium n₂', 12, mid + 18);
          g.strokeStyle = 'rgba(154,168,195,.5)';
          g.lineWidth = 1;
          g.setLineDash([5, 5]);
          g.beginPath();
          g.moveTo(0, mid);
          g.lineTo(W, mid);
          g.stroke();
          g.setLineDash([]);
          g.strokeStyle = 'rgba(154,168,195,.4)';
          g.beginPath();
          g.moveTo(ix, 0);
          g.lineTo(ix, H);
          g.stroke();
          const inc = [Math.sin(th1), Math.cos(th1)];
          api.pxArrow(g, ix - inc[0] * 110, 6, inc[0] * 110, inc[1] * 110, '#fbbf24');
          if (tir) {
            const ref = [Math.sin(th1), -Math.cos(th1)];
            api.pxArrow(g, ix, mid, ref[0] * 100, ref[1] * 100, '#22d3ee');
          } else {
            const refr = [Math.sin(th2), Math.cos(th2)];
            api.pxArrow(g, ix, mid, refr[0] * 100, refr[1] * 100, '#22d3ee');
          }
          g.fillStyle = '#9aa8c3';
          g.font = '11px "DM Mono", monospace';
          g.fillText('θ₁=' + S.th + '°', ix + 14, mid - 8);
          if (!tir) g.fillText('θ₂=' + ((physics().th2 * 180) / Math.PI).toFixed(0) + '°', ix + 14, mid + 22);
          api.pxLabel(g, 20, 22, 'PHYSIX SNIFF RIG', 'rgba(232,237,247,0.7)');
          api.pxLabel(
            g,
            W - 230,
            22,
            'n₁ sinθ₁ = n₂ sinθ₂  ·  n₁ = ' + S.n1 + ' · n₂ = ' + S.n2,
            'rgba(34,211,238,0.9)'
          );
        }

        function drawBench() {
          /* instrument grid */
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
          const { n1, n2, th1, th2, tir, crit } = physics();
          const th1Deg = (th1 * 180) / Math.PI;
          g.fillStyle = 'rgba(232,237,247,0.1)';
          g.font = '12px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText(
            'n₁·sin θ₁ = n₂·sin θ₂  ·  θ₂ = asin(' + n1 + '·sin' + th1Deg.toFixed(0) + '°/' + n2 + ')',
            W * 0.4,
            H * 0.4
          );
          g.fillText(
            'θ₂ = ' + (tir ? '—' : ((th2 * 180) / Math.PI).toFixed(1)) + '°',
            W * 0.4,
            H * 0.4 + 26
          );
          g.fillText('θc = ' + (crit != null ? crit.toFixed(1) + '°' : '—'), W * 0.4, H * 0.4 + 52);
          g.fillText(tir ? 'TIR: no refracted angle' : 'refracted at theta₂', W * 0.4, H * 0.4 + 78);
          g.textAlign = 'left';
          api.pxLabel(g, 20, 22, 'n₁ sinθ₁ = n₂ sinθ₂ · critical angle defines TIR', 'rgba(232,237,247,0.8)');
          api.pxLabel(g, 20, 40, 'sin θ₂ = n₁/n₂ · sin θ₁ · past θc: TIR', 'rgba(107,122,153,0.9)');
        }

        function update(dt) {
          S.t += dt;
          sync();
        }

        reset();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sN1.set(S.n1);
            sN2.set(S.n2);
            sTh.set(S.th);
            sweep();
            sync();
          },
          destroy() {}
        };
      },
      probe(api) {
        const S = api.state;
        const n1 = S.n1,
          n2 = S.n2;
        const th1 = (S.th * Math.PI) / 180;
        const sin2 = (n1 / n2) * Math.sin(th1);
        const tir = sin2 > 1;
        const th2 = tir ? 0 : Math.asin(sin2);
        const crit = n2 > n1 ? (Math.asin(n1 / n2) * 180) / Math.PI : null;
        return {
          t: S.t,
          n1,
          n2,
          th1,
          sin2,
          tir,
          th2Deg: tir ? null : (th2 * 180) / Math.PI,
          critDeg: crit,
          state: {}
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'th2',
          unit: '°',
          quantity: 'refracted angle',
          absFloor: 0.5,
          context() {
            return {
              n1: S.n1,
              n2: S.n2,
              th1: S.th,
              paramsText: 'n₁ = ' + S.n1 + ' · n₂ = ' + S.n2 + ' · θ₁ = ' + S.th + '°'
            };
          },
          question() {
            return 'Predict first: what is θ₂ at θ₁ = 30° for n₁ = ' + S.n1 + ', n₂ = ' + S.n2 + '?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('th2', 30);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const sin2 = (ctx.n1 / ctx.n2) * 0.5;
            return (
              'Snell\'s law n₁·sin θ₁ = n₂·sin θ₂ gives sin θ₂ = ' +
              ctx.n1 +
              '/' +
              ctx.n2 +
              ' · sin 30° = ' +
              sin2.toFixed(4) +
              ', so θ₂ = asin(sin θ₂) = ' +
              Math.asin(sin2).toFixed(1) +
              '° — the graph on the panel holds that as a real sample. When sin θ₂ exceeds 1 there is no refracted angle: the ray is totally internally reflected, which is the very same physics a fibre optic cable, or a prism, routes light with.'
            );
          },
          onLock() {
            pred.reveal();
          },
          onReset() {
            pred.refresh();
          }
        });
        S.onParam = () => {
          pred.refresh();
        };
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);
/* ---------------- 6. Buoyancy / Archimedes ---------------- */
Sims.register(
  'buoyancy',
  'Buoyancy',
  'Buoyant force = weight of displaced fluid. Float if ρ < ρ_fluid.',
  '🛟',
  (frame) =>
    Workstation.mount(frame, {
      id: 'buoyancy',
      title: 'Buoyancy',
      desc: 'A block dropped into water drops until it displaces its own weight. Liquid-levels grow as the block enters the water, so the drop is a real two-force problem — gravity and a buoyant force that grows with depth, damped by drag that settles the block at Archimedes\' balance.',
      icon: '🛟',
      topic: 'Mechanics',
      level: 'Grade 10–11',
      appKey: 'buoyancy',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Drop tank' },
        { id: 'science', label: 'Force balance' }
      ],
      presets: [
        { label: 'Float steady', apply: (s) => { s.rho = 600; s.rf = 1000; s.side = 0.4; } },
        { label: 'Sinker', apply: (s) => { s.rho = 1500; s.rf = 1000; s.side = 0.4; } },
        { label: 'Neutral density', apply: (s) => { s.rho = 1000; s.rf = 1000; s.side = 0.4; } },
        { label: 'Float light', apply: (s) => { s.rho = 800; s.rf = 1200; s.side = 0.3; } }
      ],
      graphs: [
        {
          title: 'Submerged fraction over time — settles at ρ/ρf when floating',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'Submerged',
          yUnit: '',
          height: 128,
          series: [{ id: 'sub', label: 'Submerged', unit: '', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const G = 9.8;
        const sc = 120; /* px per metre */
        const FIXED = 1 / 60;
        let acc = 0;

        S.rho = 600;
        S.rf = 1000;
        S.side = 0.4;
        S.t = 0;
        S.y = 96 - S.side * sc - 24; /* block starts above the waterline */
        S.vy = 0;
        S.sub = 0;
        S.W = 0;
        S.B = 0;

        const sRho = api.SU.slider(api.panel, 'Block density ρ (kg/m³)', 200, 2000, 10, 600, (v) => {
          S.rho = v;
          reset();
        }, (v) => v + ' kg/m³');
        const sRf = api.SU.slider(api.panel, 'Fluid density ρ_f', 500, 1500, 10, 1000, (v) => {
          S.rf = v;
          reset();
        }, (v) => v + ' kg/m³');
        const sSide = api.SU.slider(api.panel, 'Block side (m)', 0.2, 0.6, 0.02, 0.4, (v) => {
          S.side = v;
          reset();
        }, (v) => v.toFixed(2) + ' m');

        /* ---- readouts ---- */
        const rW = api.SU.readout(api.readouts, 'Weight', '—');
        const rB = api.SU.readout(api.readouts, 'Buoyant', '—');
        const rSub = api.SU.readout(api.readouts, 'Submerged', '—');
        const rSt = api.SU.readout(api.readouts, 'Status', '—');

        /* ---- physics: Archimedes with position-dependent submersion ---- */
        function geo() {
          const side = S.side;
          return {
            side,
            V: side * side * side,
            bs: side * sc,
            waterTop: 96,
            tankBot: H - 18
          };
        }

        function advance(h) {
          S.t += h;
          /* Integrating in metres. With vy in m/s the energies are the textbook
             ones, unlike a px-velocity draft that ran away to kilojoules. */
          const { side, V, waterTop, tankBot } = geo();
          const A = side * side;
          const rb = S.rho;
          const m = rb * V;
          if (m <= 0) return;
          const omega = Math.sqrt((S.rf * G * A) / m);
          /* Linear drag tuned to ζ ≈ 0.55 so a dropped block settles in a few
             bobs instead of ringing essentially forever. */
          const c = 1.1 * m * omega;
          const waterM = waterTop / sc;
          const yM = S.y / sc;
          const floorM = tankBot / sc - side;
          const depth = Math.max(0, Math.min(side, yM + side - waterM));
          S.sub = side > 0 ? depth / side : 0;
          S.W = rb * G * V;
          const Bf = S.rf * G * A * depth;
          S.B = Bf;
          const a1 = (S.W - Bf - c * S.vy) / m;
          const y2 = yM + S.vy * h + 0.5 * a1 * h * h;
          const vHalf = S.vy + 0.5 * a1 * h;
          const depth2 = Math.max(0, Math.min(side, y2 + side - waterM));
          const a2 = (S.W - S.rf * G * A * depth2 - c * vHalf) / m;
          S.vy = vHalf + 0.5 * a2 * h;
          if (y2 > floorM) {
            S.y = floorM * sc;
            S.vy = 0;
          } else {
            S.y = y2 * sc;
          }
        }
        function sample() {
          api.graphs[0].push({ t: S.t, sub: S.sub });
        }

        function reset() {
          S.y = 96 - S.side * sc - 24;
          S.vy = 0;
          S.t = 0;
          acc = 0;
          api.graphs[0].clear();
          sync();
        }

        function sync() {
          const { side, waterTop, tankBot } = geo();
          const rb = S.rho;
          const floats = rb < S.rf;
          const subFrac = S.sub;
          rW.set((S.W / 1000).toFixed(2) + ' kN');
          rB.set((S.B / 1000).toFixed(2) + ' kN');
          rSub.set((subFrac * 100).toFixed(0) + ' %');
          rSt.set(
            floats
              ? Math.abs(S.vy) > 0.05
                ? '🌊 Bobbing'
                : '🟢 Floating equilibrium'
              : S.y >= tankBot - side * sc
                ? '⛔ On the bottom'
                : '🔴 Sinking'
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
          if (api.getLayer() === 'science') drawScience();
          else drawDrop();
        }

        function drawDrop() {
          const { side, waterTop, tankBot } = geo();
          const rb = S.rho;
          const floats = rb < S.rf;
          const px = W / 2;
          g.fillStyle = 'rgba(34,211,238,.18)';
          g.fillRect(px - 110, waterTop, 220, tankBot - waterTop);
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(px - 110, waterTop);
          g.lineTo(px + 110, waterTop);
          g.stroke();
          g.fillStyle = rb < S.rf ? '#34d399' : '#f87171';
          g.fillRect(px - (side * sc) / 2, S.y, side * sc, side * sc);
          g.fillStyle = 'rgba(255,255,255,.15)';
          g.fillRect(px - (side * sc) / 2, S.y, side * sc, 6);
          const cyc = S.y + (side * sc) / 2;
          api.pxArrow(g, px, cyc, 0, 42, '#f87171'); // weight (down)
          api.pxArrow(g, px, cyc, 0, -42 * S.sub, '#22d3ee'); // buoyant: grows with submersion
          api.pxLabel(g, px + 10, cyc + 46, 'W', '#f87171');
          api.pxLabel(g, px + 10, cyc - 42 * S.sub - 6, 'B', '#22d3ee');
          api.pxLabel(g, 20, 22, 'PHYSIX DROPTANK', 'rgba(232,237,247,0.7)');
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
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }
          const { side, waterTop, tankBot } = geo();
          const rb = S.rho;
          const floats = rb < S.rf;
          const Wv = rb * G * side * side * side;
          const subFrac = S.sub;
          const Bv = subFrac * side * side * side * S.rf * G;
          /* same linear-drag coefficient advance() integrates with:
             c = 1.1·m·ω,  ω = √(ρf·g·A/m) */
          const mV = rb * side * side * side;
          const cDrag = mV > 0 ? 1.1 * mV * Math.sqrt((S.rf * G * side * side) / mV) : 0;
          /* axes: W vs sub for the three force curves */
          g.fillStyle = 'rgba(255,255,255,0.08)';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('Weight W = ' + Wv.toFixed(1) + ' N  (constant)', 30, 60);
          g.fillText('Buoyant B = ' + Bv.toFixed(1) + ' N  at current submersion', 30, 85);
          g.fillText('Drag coefficient c = ' + cDrag.toFixed(1) + ' N·s/m  (ζ ≈ 0.55)', 30, 110);
          g.fillText(floats ? 'Float at ρ/ρf = ' + (rb / S.rf).toFixed(3) : 'Sink — network down', 30, 140);
          api.pxLabel(g, 20, 22, 'sub = depth/side · B = ρf·g·A·depth · F = ma settled', 'rgba(232,237,247,0.8)');
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
          if (acc > FIXED) acc = 0;
          sync();
        }

        reset();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sRho.set(S.rho);
            sRf.set(S.rf);
            sSide.set(S.side);
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
        const SC = 120;
        return {
          t: S.t,
          y: S.y,
          vyMs: +S.vy.toFixed(4),
          subFrac: +S.sub.toFixed(4),
          floats: S.rho < S.rf,
          W: +(S.W / 1000).toFixed(4),
          B: +(S.B / 1000).toFixed(4),
          state: { y: +S.y.toFixed(6), vy: +S.vy.toFixed(6) }
        };
      },
      predict(api) {
        const S = api.state;
        const TARGET = 3.0;
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
            const range = api.graphs[0].timeRange('sub');
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
          series: 'sub',
          unit: 'fraction',
          quantity: 'submerged fraction',
          absFloor: 0.06,
          context() {
            return {
              rho: S.rho,
              rf: S.rf,
              side: S.side,
              paramsText: '(body) ρ = ' + S.rho + ' kg/m³ · ρf = ' + S.rf + ' kg/m³'
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: what fraction of the block is submerged at t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('sub', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const floats = ctx.rho < ctx.rf;
            const eq = floats ? (ctx.rho / ctx.rf).toFixed(3) : '—';
            return (
              'As the block enters the water the buoyant force B = ρf·g·A·depth grows with submersion — a heavier body pushes more force. Gravity W = ρ·g·V is constant, drag damps the bobbing at ζ ≈ 0.55, and the settled fraction is ρ/ρf = ' +
              eq +
              " — the block's own density decides how much it must push past the water to balance its weight, whether it floats or sinks."
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
/* ---------------- 7. RC circuit (capacitor charging) ---------------- */
Sims.register(
  'rc',
  'RC Circuit',
  'Capacitor fills as Vc = V(1−e^(−t/RC)); the time constant τ = RC.',
  '🔋',
  (frame) =>
    Workstation.mount(frame, {
      id: 'rc',
      title: 'RC Circuit',
      desc: 'The capacitor charges through R with a curve that does not care if the window is part of a power supply or your hand evolution. Vc = V(1 − e^(−t/τ)) at every second, τ = RC is the single constant, and the current falls the moment the capacitor takes the load.',
      icon: '🔋',
      topic: 'Electromagnetism',
      level: 'Grade 11–12',
      appKey: 'rc',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Circuit bench' },
        { id: 'science', label: 'Charge curve' }
      ],
      presets: [
        { label: 'Default charge', apply: (s) => { s.v = 9; s.r = 4; s.c = 2; } },
        { label: 'Fast small', apply: (s) => { s.v = 6; s.r = 1; s.c = 2; } },
        { label: 'Slow charge', apply: (s) => { s.v = 12; s.r = 2; s.c = 5; } },
        { label: 'Big cap', apply: (s) => { s.v = 9; s.r = 4; s.c = 4; } }
      ],
      graphs: [
        {
          title: "Capacitor voltage Vc(t) — exponential curve, τ = RC",
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'Vc',
          yUnit: 'V',
          height: 128,
          series: [{ id: 'Vc', label: 'Vc', unit: 'V', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.v = 9;
        S.r = 4;
        S.c = 2;
        S.mode = 1; /* 1 = charge, 0 = discharge */
        S.t = 0;
        S.VcS = 0;
        S.IS = 0;
        S.ph = 0;
        S.VcS = 0;

        const sV = api.SU.slider(api.panel, 'Battery V', 1, 12, 0.5, 9, (v) => {
          S.v = v;
          if (S.onParam) S.onParam();
        }, (v) => v.toFixed(2) + ' V');
        const sR = api.SU.slider(api.panel, 'R (kΩ)', 0.5, 20, 0.5, 4, (v) => {
          S.r = v;
          if (S.onParam) S.onParam();
        }, (v) => v.toFixed(2) + ' kΩ');
        const sC = api.SU.slider(api.panel, 'C (mF)', 0.1, 10, 0.1, 2, (v) => {
          S.c = v;
          if (S.onParam) S.onParam();
        }, (v) => v.toFixed(2) + ' mF');

        const btnCharge = api.SU.btn(api.panel, '⚡ Charge', () => {
          S.mode = 1;
          restart();
        }, true);
        const btnDischarge = api.SU.btn(api.panel, '⬇ Discharge', () => {
          S.mode = 0;
          restart();
        }, true);

        /* ---- readouts ---- */
        const rTau = api.SU.readout(api.readouts, 'τ = RC', '—');
        const rVc = api.SU.readout(api.readouts, 'V_cap', '—');
        const rI = api.SU.readout(api.readouts, 'Current I', '—');

        /* ---- modelling: the exponential is evaluated at the exact sub-step ---- */
        function tauOf() {
          return S.r * 1000 * S.c * 1e-3;
        }

        function advance(h) {
          S.t += h;
          const tau = tauOf();
          const V0 = S.v;
          S.VcS = S.mode ? V0 * (1 - Math.exp(-S.t / tau)) : V0 * Math.exp(-S.t / tau);
          S.IS = S.mode
            ? (V0 / (S.r * 1000)) * Math.exp(-S.t / tau)
            : (-V0 / (S.r * 1000)) * Math.exp(-S.t / tau);
          S.ph = (S.ph + Math.min(1, Math.abs(S.IS) * 4000) * h) % 1;
          api.graphs[0].push({ t: S.t, Vc: S.VcS });
        }

        function restart() {
          S.t = 0;
          S.ph = 0;
          S.VcS = 0;
          S.IS = 0;
          acc = 0;
          api.graphs[0].clear();
          sync();
        }

        function sync() {
          const tau = tauOf();
          const V0 = S.v;
          rTau.set((tau * 1000).toFixed(0) + ' ms');
          rVc.set(S.VcS.toFixed(2) + ' V');
          rI.set((S.IS * 1000).toFixed(2) + ' mA');
        }

        function reset() {
          S.t = 0;
          S.VcS = 0;
          S.IS = 0;
          S.ph = 0;
          acc = 0;
          api.graphs[0].clear();
          sync();
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
          else drawCircuit();
        }

        function drawCircuit() {
          const L = 60,
            T = 60,
            Rt = W - 70,
            B = H - 70,
            midX = (L + Rt) / 2;
          /* wire to and around the capacitor */
          g.strokeStyle = '#4a5878';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(L, T);
          g.lineTo(midX - 14, T);
          g.stroke();
          g.beginPath();
          g.moveTo(midX + 14, T);
          g.lineTo(Rt, T);
          g.stroke();
          g.beginPath();
          g.moveTo(Rt, T);
          g.lineTo(Rt, B);
          g.stroke();
          g.beginPath();
          g.moveTo(L, B);
          g.lineTo(Rt, B);
          g.stroke();
          g.beginPath();
          g.moveTo(L, T);
          g.lineTo(L, B);
          g.stroke();
          /* capacitor plates */
          g.strokeStyle = '#fbbf24';
          g.lineWidth = 2.5;
          g.beginPath();
          g.moveTo(midX - 14, T - 16);
          g.lineTo(midX - 14, T + 16);
          g.moveTo(midX + 14, T - 16);
          g.lineTo(midX + 14, T + 16);
          g.stroke();
          /* charge level in the capacitor */
          const level = Math.min(1, Math.max(0, S.VcS / (S.v > 0 ? S.v : 1)));
          g.fillStyle = 'rgba(251,191,36,' + (level * 0.8 + 0.05) + ')';
          g.fillRect(midX - 14, T + 16 - level * 30, 28, level * 30);
          /* battery symbol on the left wire */
          g.fillStyle = '#4a5878';
          g.fillRect(L - 4, T + 10, 8, 6);
          g.fillStyle = '#f87171';
          g.fillRect(L - 4, T + 10, 8, 6);
          g.fillStyle = '#e8edf7';
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('+', L, T + 4);
          g.fillText('−', L, T + 30);
          /* ten charge dots travelling the wire */
          const mode = S.mode;
          for (let n = 0; n < 14; n++) {
            const want = (S.ph + n / 14) % 1;
            const px = L + (Rt - L) * (want < 0.5 ? want * 2 : (want - 0.5) * 2);
            const onTop = want < 0.5;
            const py = onTop ? T : B;
            g.fillStyle = mode ? '#22d3ee' : '#f87171';
            g.beginPath();
            g.arc(px, py, 3, 0, 7);
            g.fill();
          }
          api.pxLabel(g, 20, 22, 'PHYSIX RC BENCH', 'rgba(232,237,247,0.7)');
        }

        function drawScience() {
          const tau = tauOf();
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
          g.fillStyle = 'rgba(232,237,247,0.1)';
          g.font = '12px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('Vc(t) = V(1 − e^(−t/τ))' , 30, 60);
          g.fillText('I(t) = V/(R·1000) · e^(−t/τ)' , 30, 85);
          g.fillText('τ = RC = ' + (tau * 1000).toFixed(0) + ' ms · V = ' + S.v + ' V', 30, 110);
          g.fillText('τ = RC · R·V gives the current shape', 30, 135);
          api.pxLabel(g, 20, 22, 'Vc(t) = V·(1 − e^(−t/RC))  ·  I = V/(R·1000)·e^(−t/RC)', 'rgba(232,237,247,0.8)');
        }

        /* ---- per-frame pump ---- */
        function update(dt) {
          acc += dt;
          let n = 0;
          while (acc >= FIXED && n < 10) {
            advance(FIXED);
            acc -= FIXED;
            n++;
          }
          if (acc > FIXED) acc = 0;
          sync();
        }

        restart();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sV.set(S.v);
            sR.set(S.r);
            sC.set(S.c);
            restart();
          },
          destroy() {}
        };
      },
      probe(api) {
        const S = api.state;
        const tau = S.r * 1000 * S.c * 1e-3;
        const Vc = S.VcS;
        const I = S.IS;
        return {
          t: S.t,
          mode: S.mode,
          V0: S.v,
          Rk: S.r,
          Cm: S.c,
          tauMs: +(tau * 1000).toFixed(3),
          Vc: +Vc.toFixed(4),
          I: +I.toFixed(6),
          frac: S.v > 0 ? +(Vc / S.v).toFixed(4) : 0,
          state: {}
        };
      },
      predict(api) {
        const S = api.state;
        const TARGET = 3.0;
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
            const range = api.graphs[0].timeRange('Vc');
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
          series: 'Vc',
          unit: 'V',
          quantity: 'capacitor voltage',
          absFloor: 0.3,
          context() {
            return {
              v: S.v,
              r: S.r,
              c: S.c,
              mode: S.mode,
              paramsText: 'V = ' + S.v + ' V · R = ' + S.r + ' kΩ · C = ' + S.c + ' mF'
            };
          },
          targetTime: () => TARGET,
          question() {
            return (
              'Predict first: what is Vc at t = ' +
              TARGET.toFixed(1) +
              ' s? (the sim is in ' +
              (S.mode === 1 ? 'charge' : 'discharge') +
              ' mode)'
            );
          },
          observe() {
            const hit = api.graphs[0].valueAt('Vc', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const tau = ctx.r * 1000 * ctx.c * 1e-3;
            const Vc = ctx.mode ? ctx.v * (1 - Math.exp(-TARGET / tau)) : ctx.v * Math.exp(-TARGET / tau);
            return (
              'The charge curve Vc = V(1 − e^(−t/τ)) with τ = RC = ' +
              tau +
              ' s gives Vc at t = ' +
              TARGET.toFixed(1) +
              ' s = ' +
              Vc.toFixed(3) +
              ' V. In discharge the capacitor falls the same way backwards. When the capacitor is exactly one τ wide, the voltage reaches or drops 63% of the way between its values, the point that every capacitor-filler designs by.'
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
/* ---------------- 8. Newton's law of cooling ---------------- */
Sims.register(
  'cooling',
  'Cooling Curve',
  'T(t) = T_amb + (T₀−T_amb)·e^(−kt). Hot bodies lose heat exponentially.',
  '🌡️',
  (frame) =>
    Workstation.mount(frame, {
      id: 'cooling',
      title: 'Cooling Curve',
      desc: 'Every molten coil, every cooling cup, every kiln follows the same law: near to order the rate of cooling is the excess over the ambient room, and the substance loses heat at a rate proportional to its own temperature.' + ' The curve T(t) = T_a + (T₀ − T_a)·e^(−kt) is the closed-form, exact at every instant in the sim.',
      icon: '🌡️',
      topic: 'Thermodynamics',
      level: 'Grade 11–12',
      appKey: 'cooling',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Thermometer' },
        { id: 'science', label: 'Decay analysis' }
      ],
      presets: [
        { label: 'Hot air', apply: (s) => { s.ta = 20; s.t0 = 90; s.k = 0.12; } },
        { label: 'Cool room', apply: (s) => { s.ta = 0; s.t0 = 100; s.k = 0.2; } },
        { label: 'Fast decay', apply: (s) => { s.ta = 20; s.t0 = 60; s.k = 0.3; } },
        { label: 'Slow cool', apply: (s) => { s.ta = 35; s.t0 = 90; s.k = 0.05; } }
      ],
      graphs: [
        {
          title: 'Temperature T(t) — exponential decay toward the ambient',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'T',
          yUnit: '°C',
          height: 128,
          series: [{ id: 'T', label: 'T', unit: '°C', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.ta = 20;
        S.t0 = 90;
        S.k = 0.12;
        S.t = 0;
        S.T = S.t0;

        /* ---- controls (the rate, ambient and the start are live monitors) ---- */
        const sTa = api.SU.slider(api.panel, 'Ambient T_amb', 0, 40, 1, 20, (v) => {
          S.ta = v;
        });
        const sT0 = api.SU.slider(api.panel, 'Start T₀', 50, 100, 1, 90, (v) => {
          S.t0 = v;
        });
        const sK = api.SU.slider(api.panel, 'Rate k', 0.02, 0.4, 0.01, 0.12, (v) => {
          S.k = v;
        }, (v) => v.toFixed(2));

        /* ---- readouts ---- */
        const rT = api.SU.readout(api.readouts, 'T now', '—');
        const rHalf = api.SU.readout(api.readouts, 'Half-life', '—');

        /* ---- modelling: closed form at the exact sub-step time ---- */
        function advance(h) {
          S.t += h;
          S.T = S.ta + (S.t0 - S.ta) * Math.exp(-S.k * S.t);
        }
        function sample() {
          api.graphs[0].push({ t: S.t, T: S.T });
        }

        function reset() {
          S.t = 0;
          S.T = S.t0;
          acc = 0;
          api.graphs[0].clear();
          sync();
        }
        function sync() {
          rT.set(S.T.toFixed(1) + ' °C');
          rHalf.set((Math.log(2) / S.k).toFixed(1) + ' s');
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
          else drawThermo();
        }

        function drawThermo() {
          const ta = S.ta;
          const tx = 70,
            top = 40,
            bot = 230,
            tubeH = bot - top;
          const TtoY = (Tv) => bot - (Tv / 100) * tubeH;
          /* outer form */
          g.strokeStyle = '#4a5878';
          g.lineWidth = 3;
          g.beginPath();
          g.roundRect(tx - 14, top, 28, tubeH, 14);
          g.stroke();
          g.fillStyle = '#f87171';
          const my = TtoY(Math.max(0, Math.min(100, S.T)));
          g.fillRect(tx - 10, my, 20, bot - my);
          g.fillStyle = '#e8edf7';
          g.beginPath();
          g.arc(tx, top - 6, 16, 0, 7);
          g.fill();
          g.fillStyle = '#6b7a99';
          g.font = '11px "DM Mono", monospace';
          g.fillText(S.T.toFixed(0) + '°C', tx + 24, my + 4);
          api.pxLabel(g, 20, 22, 'PHYSIX THERMOMETER', 'rgba(232,237,247,0.7)');
          api.pxLabel(
            g,
            W - 200,
            22,
            'T_a = ' + ta + ' °C · t_½ = ' + (Math.log(2) / S.k).toFixed(1) + ' s',
            'rgba(34,211,238,0.9)'
          );
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
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }
          const ta = S.ta;
          g.fillStyle = 'rgba(52,211,153,.5)';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('ambient T_a = ' + ta + '°C', W / 2, H * 0.3);
          g.fillText('T(t) = T_a + (T₀ − T_a)·e^(−kt)', W / 2, H * 0.3 + 26);
          g.fillText('k = ' + S.k + ' 1/s · T₀ = ' + S.t0 + '°C · t₁/₂ = ' + (Math.log(2) / S.k).toFixed(1) + 's', W / 2, H * 0.3 + 52);
          /* fresh ink baseline */
          g.strokeStyle = 'rgba(52,211,153,.4)';
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(30, H - 24 - (ta / 100) * (H - 50));
          g.lineTo(W - 30, H - 24 - (ta / 100) * (H - 50));
          g.stroke();
          g.setLineDash([]);
          api.pxLabel(g, 20, 22, 'dT/dt = −k(T − T_a) · the rate follows the excess', 'rgba(232,237,247,0.8)');
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
          if (acc > FIXED) acc = 0;
          sync();
        }

        reset();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sTa.set(S.ta);
            sT0.set(S.t0);
            sK.set(S.k);
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
        return {
          t: S.t,
          T: +S.T.toFixed(3),
          Ta: +S.ta,
          t0: +S.t0,
          k: +S.k,
          half: Math.log(2) / S.k,
          excess: S.T - S.ta,
          state: {}
        };
      },
      predict(api) {
        const S = api.state;
        const TARGET = 3.0;
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
            const range = api.graphs[0].timeRange('T');
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
          series: 'T',
          unit: '°C',
          quantity: 'temperature',
          absFloor: 0.3,
          context() {
            return {
              ta: S.ta,
              t0: S.t0,
              k: S.k,
              paramsText: 'T_a = ' + S.ta + '°C · T₀ = ' + S.t0 + '°C · k = ' + S.k + ' 1/s'
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: what is the temperature at t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('T', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'Newton\'s law, dT/dt = −k·(T − T_a), is the shorthand for the exact curve T(t) = T_a + (T₀ − T_a)·e^(−kt). With T₀ = ' +
              ctx.t0 +
              '°C, T_a = ' +
              ctx.ta +
              '°C and k = ' +
              ctx.k +
              ' 1/s the temperature at t = ' +
              TARGET.toFixed(1) +
              ' s is ' +
              (ctx.ta + (ctx.t0 - ctx.ta) * Math.exp(-ctx.k * TARGET)).toFixed(1) +
              '°C — and at the half-life t₁/₂ = ln2/k = ' +
              (Math.log(2) / ctx.k).toFixed(1) +
              ' s the excess over ambient has halved; the curve shows exactly that drop.'
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
/* ---------------- 9. 2D collision lab ---------------- */
Sims.register(
  'collision2d',
  '2D Collision Lab',
  'Real elastic collisions in two dimensions — momentum & energy conserved.',
  '💥',
  (frame) =>
    Workstation.mount(frame, {
      id: 'collision2d',
      title: '2D Collision Lab',
      desc: 'The momentum and kinetic energy that go in are the momentum and kinetic energy that stay — any energy "missing" from the count is the part that went into sound, heat and deformation. The labs of particle physics rest on exactly the same equation.',
      icon: '💥',
      topic: 'Mechanics',
      level: 'Grade 10–12',
      appKey: 'collision2d',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Arena' },
        { id: 'science', label: 'Verification' }
      ],
      presets: [
        { label: 'Equal finesse', apply: (s) => { s.m1 = 3; s.m2 = 3; s.s1 = 5; s.s2 = 3; s.a1 = 20; s.e = 1; } },
        { label: 'Heavy light', apply: (s) => { s.m1 = 2; s.m2 = 8; s.s1 = 5; s.s2 = 3; s.a1 = 20; s.e = 1; } },
        { label: 'Small stopper', apply: (s) => { s.m1 = 8; s.m2 = 0.5; s.s1 = 5; s.s2 = 0; s.a1 = 20; s.e = 1; } },
        { label: 'Inelastic hash', apply: (s) => { s.m1 = 3; s.m2 = 3; s.s1 = 5; s.s2 = 2; s.a1 = 20; s.e = 0.5; } }
      ],
      graphs: [
        {
          title: 'Total momentum |p| against time — conservation is the claim',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: '|p|',
          yUnit: 'kg·m/s',
          height: 128,
          series: [{ id: 'p', label: '|p|', unit: 'kg·m/s', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        const rad = (m) => 12 + Math.sqrt(m) * 6;

        /* ---- state lives on the scene: probe, relaunch and predict read it ---- */
        S.m1 = 3;
        S.m2 = 3;
        S.s1 = 5;
        S.s2 = 3;
        S.a1 = 20;
        S.e = 1;
        S.t = 0;
        S.p0S = 0;
        S.ke0S = 1;
        S.pS = 0;
        S.keS = 0;
        S.a = { m: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0, col: '#22d3ee' };
        S.b = { m: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0, col: '#fbbf24' };
        S.trailA = [];
        S.trailB = [];

        const sM1 = api.SU.slider(api.panel, 'Mass 1 (kg)', 0.5, 8, 0.5, 3, (v) => {
          S.m1 = v;
          relaunch();
        });
        const sM2 = api.SU.slider(api.panel, 'Mass 2 (kg)', 0.5, 8, 0.5, 3, (v) => {
          S.m2 = v;
          relaunch();
        });
        const sS1 = api.SU.slider(api.panel, 'Speed 1 (m/s)', 1, 10, 0.5, 5, (v) => {
          S.s1 = v;
          relaunch();
        });
        const sS2 = api.SU.slider(api.panel, 'Speed 2 (m/s)', 0, 10, 0.5, 3, (v) => {
          S.s2 = v;
          relaunch();
        });
        const sA1 = api.SU.slider(api.panel, 'Angle 1 (°)', -80, 80, 1, 20, (v) => {
          S.a1 = v;
          relaunch();
        }, (v) => v + '°');
        const sE = api.SU.slider(api.panel, 'Restitution e', 0.2, 1, 0.05, 1, (v) => {
          S.e = v;
          relaunch();
        }, (v) => v.toFixed(2));

        const btnRelaunch = api.SU.btn(api.panel, '⟲ Relaunch', () => relaunch(), true);

        /* ---- readouts ---- */
        const rP = api.SU.readout(api.readouts, '|p|', '—');
        const rK = api.SU.readout(api.readouts, 'KE', '—');
        const rSt = api.SU.readout(api.readouts, 'Type', '—');

        /* ---- modelling: the impulse formula per fixed step ---- */
        function relaunch() {
          const m1 = S.m1,
            m2 = S.m2;
          S.a = {
            m: m1,
            x: W * 0.3,
            y: H * 0.4,
            vx: Math.cos((S.a1 * Math.PI) / 180) * S.s1,
            vy: Math.sin((S.a1 * Math.PI) / 180) * S.s1,
            r: rad(m1),
            col: '#22d3ee'
          };
          S.b = {
            m: m2,
            x: W * 0.7,
            y: H * 0.6,
            vx: -S.s2,
            vy: 0,
            r: rad(m2),
            col: '#fbbf24'
          };
          S.trailA = [];
          S.trailB = [];
          S.t = 0;
          /* Baseline for the conservation claim |p| and KE at the relaunch moment —
             "conserved" is a statement against a recorded initial value. */
          S.p0S = Math.hypot(S.a.m * S.a.vx + S.b.m * S.b.vx, S.a.m * S.a.vy + S.b.m * S.b.vy);
          S.ke0S =
            0.5 * S.a.m * (S.a.vx * S.a.vx + S.a.vy * S.a.vy) +
            0.5 * S.b.m * (S.b.vx * S.b.vx + S.b.vy * S.b.vy);
          sync();
          if (S.onParam) S.onParam();
        }

        function bump(p) {
          if (p.x < p.r) {
            p.x = p.r;
            p.vx = Math.abs(p.vx);
          }
          if (p.x > W - p.r) {
            p.x = W - p.r;
            p.vx = -Math.abs(p.vx);
          }
          if (p.y < p.r) {
            p.y = p.r;
            p.vy = Math.abs(p.vy);
          }
          if (p.y > H - p.r) {
            p.y = H - p.r;
            p.vy = -Math.abs(p.vy);
          }
        }

        function advance(h) {
          S.t += h;
          S.a.x += S.a.vx * 22 * h;
          S.a.y += S.a.vy * 22 * h;
          S.b.x += S.b.vx * 22 * h;
          S.b.y += S.b.vy * 22 * h;
          const dx = S.b.x - S.a.x,
            dy = S.b.y - S.a.y,
            dist = Math.hypot(dx, dy);
          if (dist < S.a.r + S.b.r && dist > 0) {
            const nx = dx / dist,
              ny = dy / dist;
            const rvx = S.b.vx - S.a.vx,
              rvy = S.b.vy - S.a.vy,
              vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              const e = S.e,
                j = (-(1 + e) * vn) / (1 / S.a.m + 1 / S.b.m);
              S.a.vx -= (j * nx) / S.a.m;
              S.a.vy -= (j * ny) / S.a.m;
              S.b.vx += (j * nx) / S.b.m;
              S.b.vy += (j * ny) / S.b.m;
            }
            const ov = (S.a.r + S.b.r - dist) / 2;
            S.a.x -= nx * ov;
            S.a.y -= ny * ov;
            S.b.x += nx * ov;
            S.b.y += ny * ov;
          }
          bump(S.a);
          bump(S.b);
          S.trailA.push([S.a.x, S.a.y]);
          if (S.trailA.length > 80) S.trailA.shift();
          S.trailB.push([S.b.x, S.b.y]);
          if (S.trailB.length > 80) S.trailB.shift();
          S.pS = Math.hypot(S.a.m * S.a.vx + S.b.m * S.b.vx, S.a.m * S.a.vy + S.b.m * S.b.vy);
          S.keS =
            0.5 * S.a.m * (S.a.vx * S.a.vx + S.a.vy * S.a.vy) +
            0.5 * S.b.m * (S.b.vx * S.b.vx + S.b.vy * S.b.vy);
        }
        function sample() {
          api.graphs[0].push({ t: S.t, p: S.pS });
        }

        function reset() {
          relaunch();
        }

        function sync() {
          rP.set(S.pS.toFixed(1) + ' kg·m/s');
          rK.set(S.keS.toFixed(1) + ' J');
          rSt.set(S.e >= 0.95 ? 'Elastic' : 'Inelastic');
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
          else drawArena();
        }

        function drawArena() {
          const drawTrail = (tr, col) => {
            g.strokeStyle = col;
            g.lineWidth = 1.5;
            g.beginPath();
            tr.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
            g.stroke();
          };
          drawTrail(S.trailA, 'rgba(34,211,238,.4)');
          drawTrail(S.trailB, 'rgba(251,191,36,.4)');
          [S.a, S.b].forEach((p) => {
            g.fillStyle = p.col;
            g.beginPath();
            g.arc(p.x, p.y, p.r, 0, 7);
            g.fill();
            api.pxArrow(g, p.x, p.y, p.vx * 4, p.vy * 4, '#34d399');
            g.fillStyle = '#6b7a99';
            g.font = '11px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText(p.m + 'kg', p.x, p.y - p.r - 6);
            g.textAlign = 'left';
          });
          api.pxLabel(g, 20, 22, 'PHYSIX COLLISION LAB', 'rgba(232,237,247,0.7)');
          api.pxLabel(
            g,
            W - 220,
            22,
            '|p| = ' + S.pS.toFixed(1) + ' · KE = ' + S.keS.toFixed(1) + ' · e = ' + S.e.toFixed(2),
            'rgba(34,211,238,0.9)'
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
          const p = S.a,
            q = S.b;
          /* independent particle before and after, same total */
          const same = Math.abs(S.ke0S - S.keS) / S.ke0S < 0.02;
          g.fillStyle = 'rgba(232,237,247,0.1)';
          g.font = '12px "DM Mono", monospace';
          g.textAlign = 'left';
          g.fillText('initial |p| = ' + S.p0S.toFixed(1) + ' kg·m/s', 30, 60);
          g.fillText('initial KE = ' + S.ke0S.toFixed(1) + ' J', 30, 85);
          g.fillText('current |p| = ' + S.pS.toFixed(1) + ' kg·m/s', 30, 110);
          g.fillText('current KE = ' + S.keS.toFixed(1) + ' J', 30, 135);
          g.fillText('total |ΔKE| = ' + Math.abs(S.keS - S.ke0S).toFixed(3) + ' J · ' + (same ? 'elastic' : 'inelastic'), 30, 160);
          g.fillText('|p|-momentum is conserved in every mode.', 30, 185);
          api.pxLabel(g, 20, 22, 'Σp = const · ΣKE conserved when e = 1', 'rgba(232,237,247,0.8)');
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
          if (acc > FIXED) acc = 0;
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
            sS1.set(S.s1);
            sS2.set(S.s2);
            sA1.set(S.a1);
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
        const a = S.a,
          b = S.b;
        return {
          t: S.t,
          e: S.e,
          m1: a.m,
          m2: b.m,
          p: +S.pS.toFixed(4),
          ke: +S.keS.toFixed(4),
          p0: +S.p0S.toFixed(4),
          ke0: +S.ke0S.toFixed(4),
          v1: +Math.hypot(a.vx, a.vy).toFixed(4),
          v2: +Math.hypot(b.vx, b.vy).toFixed(4),
          state: {
            ax: +a.x.toFixed(6),
            ay: +a.y.toFixed(6),
            bx: +b.x.toFixed(6),
            by: +b.y.toFixed(6)
          }
        };
      },
      predict(api) {
        const S = api.state;
        const TARGET = 2.0;
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
            const range = api.graphs[0].timeRange('p');
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
          series: 'p',
          unit: 'kg·m/s',
          quantity: 'total momentum',
          absFloor: 2,
          context() {
            return {
              m1: S.m1,
              m2: S.m2,
              s1: S.s1,
              s2: S.s2,
              e: S.e,
              paramsText: 'm₁ = ' + S.m1 + 'kg · m₂ = ' + S.m2 + 'kg · e = ' + S.e
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: what is the total momentum |p| at t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('p', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'The impulse j = -(1+e)·v_rel·n̂/(1/m₁+1/m₂) swaps momentum between the bodies without changing the total. |p| is conserved regardless of e: in elastic mode (e = 1) the kinetic energy is conserved too, and in inelastic mode the missing KE is the heat, sound and deformation the readout can\'t see. The graph on the panel should be a flat line at the recorded initial value, which is why the panel records |p| and KE at the instant of the run start.'
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
