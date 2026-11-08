import { Sims } from './sims-a.js';
import { Workstation } from './sim-ui.js';
import { createPrediction } from './prediction.js';
/* PhysiX Academy — NCERT Simulations: 9th / 10th / 11th */
('use strict');
function ncLabel(g, x, y, t, col) {
  g.fillStyle = col || '#9aa8c3';
  g.font = '11px Segoe UI';
  g.fillText(t, x, y);
}

/* 9th — Sound: Echo & SONAR */
Sims.register(
  'ncert9-echo',
  'Echo & SONAR (Class 9 Sound)',
  'Clap → echo if wall ≥17.2 m. SONAR: d = vt/2.',
  '🔊',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ncert9-echo',
      title: 'Echo & SONAR',
      desc: 'A submarine pings and the sea floor answers; a handclap in a hall comes back a fraction of a second later; a small room does not answer at all. The rule is one line — the sound travels out and comes back, so the total path is 2d and the delay is t = 2d/v. Below about 17 m the returning sound arrives too fast for the ear to separate it from the original and the room simply rings.',
      icon: '🔊',
      topic: 'Sound',
      level: 'Grade 9–10',
      appKey: 'ncert9-echo',
      height: 260,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Echo corridor' },
        { id: 'science', label: 'Travel-time analysis' }
      ],
      presets: [
        {
          label: 'Clap in a hall',
          apply: (s) => {
            s.d = 34;
            s.v = 344;
          }
        },
        {
          label: 'Submarine ping',
          apply: (s) => {
            s.d = 60;
            s.v = 1500;
          }
        },
        {
          label: 'Hallway reverb',
          apply: (s) => {
            s.d = 8;
            s.v = 344;
          }
        },
        {
          label: 'Mountain echo',
          apply: (s) => {
            s.d = 80;
            s.v = 330;
          }
        }
      ],
      graphs: [
        {
          title: 'Round-trip time vs wall distance',
          xLabel: 'Wall distance d',
          xUnit: 'm',
          xKey: 'd',
          yLabel: 't',
          yUnit: 's',
          height: 128,
          series: [{ id: 'rt', label: 'Round-trip t', unit: 's', color: '#22d3ee' }]
        },
        {
          title: 'Minimum distance for a distinct echo (t ≥ 0.1 s)',
          xLabel: 'Sound speed v',
          xUnit: 'm/s',
          xKey: 'v',
          yLabel: 'd_min',
          yUnit: 'm',
          height: 128,
          series: [{ id: 'dmin', label: 'd_min', unit: 'm', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.d = 34;
        S.v = 344;
        S.t = 0;
        S.ping = 0;

        /* ---- controls (slider order: distance, speed) ---- */
        const sD = api.SU.slider(api.panel, 'Distance to wall d (m)', 5, 80, 1, 34.4, (v) => {
          S.d = v;
          rebuild();
        });
        const sV = api.SU.slider(api.panel, 'Speed v (m/s)', 300, 1600, 10, 344, (v) => {
          S.v = v;
          rebuild();
        });
        /* The original slider carried 34.4 on a step-1 range, so the browser
           snapped it to 34 m. Read the element back so the bench and the
           readouts agree with what the control actually shows. */
        S.d = sD.get();
        S.v = sV.get();

        /* ---- readouts ---- */
        const rT = api.SU.readout(api.readouts, 'Round-trip time t', '—');
        const rH = api.SU.readout(api.readouts, 'Heard as', '—');

        /* ---- physics: the round trip is a pure function of d and v, so the
           clock only drives the ping animation. ---- */
        function advance(h) {
          S.t += h;
          if (S.t > 1.4) {
            S.t = 0;
            S.ping = 1;
          }
        }

        function sync() {
          const tt = (2 * S.d) / S.v;
          rT.set(tt.toFixed(3) + ' s');
          rH.set(tt >= 0.1 ? '✅ Distinct echo' : '❌ Reverberation (merges)');
        }

        /* ---- live sweeps: the real data the POR panel reads ---- */
        function rebuild() {
          const G0 = api.graphs[0],
            G1 = api.graphs[1];
          if (G0) {
            G0.clear();
            for (let i = 0; i <= 150; i++) {
              const d = 5 + i * 0.5;
              G0.push({ d, rt: (2 * d) / S.v });
            }
          }
          if (G1) {
            G1.clear();
            for (let v = 300; v <= 1600; v += 10) {
              /* t = 2d/v ≥ 0.1 s  ⟺  d ≥ 0.05·v */
              G1.push({ v, dmin: 0.05 * v });
            }
          }
          if (S.onParam) S.onParam();
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
          else drawCorridor();
        }

        function drawCorridor() {
          const d = S.d,
            v = S.v,
            tt = (2 * d) / v;
          const wallX = W - 60,
            srcX = 60,
            mid = H / 2;
          g.strokeStyle = '#33415c';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(wallX, 20);
          g.lineTo(wallX, H - 20);
          g.stroke();
          g.fillStyle = '#6b7a99';
          g.font = '11px "DM Mono", monospace';
          g.fillText('WALL', wallX - 18, 18);
          g.fillStyle = '#22d3ee';
          g.beginPath();
          g.arc(srcX, mid, 10, 0, 7);
          g.fill();
          ncLabel(g, srcX - 14, mid - 14, 'SOURCE', '#22d3ee');
          const prog = Math.min(1, S.t / 0.7);
          const outX = srcX + (wallX - srcX) * Math.min(1, prog * 1.4);
          const backProg = Math.max(0, prog - 0.5) * 2;
          const backX = wallX - (wallX - srcX) * Math.min(1, backProg);
          if (S.ping) {
            g.fillStyle = 'rgba(34,211,238,.9)';
            g.beginPath();
            g.arc(outX, mid, 6, 0, 7);
            g.fill();
            if (prog > 0.5) {
              g.fillStyle = 'rgba(251,191,36,.9)';
              g.beginPath();
              g.arc(backX, mid, 6, 0, 7);
              g.fill();
            }
          }
          g.strokeStyle = 'rgba(154,168,195,.18)';
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(srcX, mid);
          g.lineTo(wallX, mid);
          g.stroke();
          g.setLineDash([]);
          ncLabel(g, srcX, mid + 38, 'd = ' + d + ' m', '#9aa8c3');
          ncLabel(g, wallX - 40, mid + 38, '2d = ' + 2 * d + ' m', '#9aa8c3');
          g.fillStyle = 'rgba(255,255,255,.06)';
          g.fillRect(12, H - 36, W - 24, 24);
          g.fillStyle = '#9aa8c3';
          g.font = '11px "DM Mono", monospace';
          g.fillText('t = 2d/v = ' + 2 * d + ' / ' + v + ' = ' + tt.toFixed(3) + ' s', 18, H - 20);
          api.pxLabel(g, 20, 22, 'PHYSIX ECHO CORRIDOR', 'rgba(232,237,247,0.7)');
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
          const d = S.d,
            v = S.v,
            tt = (2 * d) / v,
            dmin = 0.05 * v;
          /* out-and-back geometry */
          const y0 = H * 0.46,
            x0 = 60,
            x1 = W - 60;
          g.strokeStyle = 'rgba(34,211,238,.75)';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(x0, y0);
          g.lineTo(x1, y0);
          g.stroke();
          api.pxArrow(g, x0, y0 - 18, x1 - x0, 0, 'rgba(34,211,238,.75)', 2);
          api.pxArrow(g, x1, y0 + 18, x0 - x1, 0, 'rgba(251,191,36,.8)', 2);
          api.pxLabel(g, x0, y0 - 26, 'out: d', 'rgba(34,211,238,0.9)');
          api.pxLabel(g, x1 - 40, y0 + 36, 'back: d', 'rgba(251,191,36,0.9)');
          api.pxLabel(g, 20, 22, 't = 2d / v  —  the path is out and back', 'rgba(232,237,247,0.8)');
          api.pxLabel(
            g,
            20,
            40,
            'd = ' + d + ' m · 2d = ' + 2 * d + ' m · v = ' + v + ' m/s',
            'rgba(34,211,238,0.9)'
          );
          api.pxLabel(
            g,
            20,
            H - 52,
            'distinct echo needs t ≥ 0.1 s  ⟹  d ≥ 0.05·v = ' + dmin.toFixed(1) + ' m',
            'rgba(251,191,36,0.9)'
          );
          api.pxLabel(
            g,
            20,
            H - 30,
            't = ' + tt.toFixed(3) + ' s → ' + (tt >= 0.1 ? '✅ distinct echo' : '❌ reverberation'),
            tt >= 0.1 ? 'rgba(52,211,153,0.95)' : 'rgba(248,113,113,0.95)'
          );
        }

        /* ---- pump ---- */
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

        function reset() {
          S.t = 0;
          S.ping = 0;
          acc = 0;
          rebuild();
          sync();
        }

        rebuild();
        sync();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sD.set(S.d);
            sV.set(S.v);
            rebuild();
            sync();
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
        const rt = (2 * S.d) / S.v;
        return {
          t: S.t,
          d: S.d,
          v: S.v,
          roundTrip: +rt.toFixed(6),
          echo: rt >= 0.1,
          ping: S.ping,
          state: {}
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'rt',
          unit: 's',
          quantity: 'round-trip echo delay',
          absFloor: 0.02,
          context() {
            return {
              d: S.d,
              v: S.v,
              paramsText: 'd = ' + S.d + ' m, v = ' + S.v + ' m/s'
            };
          },
          question() {
            return 'Predict first: how long after the clap does the echo return from a wall ' + S.d + ' m away?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('rt', S.d);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const dmin = 0.05 * ctx.v;
            return (
              'The sound covers the distance d on the way out and the same distance on the way back, so the total ' +
              'path is 2d = ' +
              2 * ctx.d +
              ' m and the delay is t = 2d/v = ' +
              2 * ctx.d +
              '/' +
              ctx.v +
              ' = ' +
              r.observed.toFixed(3) +
              ' s. The ear needs about 0.1 s to tell a reflection from the original clap, so the wall has to be at ' +
              'least d_min = 0.05·v = ' +
              dmin.toFixed(1) +
              ' m away at ' +
              ctx.v +
              ' m/s; nearer than that the two sounds merge into reverberation. That is the whole of sonar: d = v·t/2.'
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

/* 10th — Spherical Mirror Bench */
Sims.register(
  'ncert10-mirror',
  'Spherical Mirror Bench (Class 10 Light)',
  'Concave (f<0) and convex (f>0): 1/f = 1/v + 1/u.',
  '🪞',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ncert10-mirror',
      title: 'Spherical Mirror Bench',
      desc: 'Every curved mirror in the world — a satellite dish, a shaving mirror, a dentist\'s mirror, a telescope\'s primary — is this one bench. One equation decides everything: 1/f = 1/v + 1/u. Change the sign of f and the whole nature of the image flips: concave mirrors make real inverted images in front of the glass, convex mirrors make virtual erect images behind it.',
      icon: '🪞',
      topic: 'Light',
      level: 'Grade 10',
      appKey: 'ncert10-mirror',
      height: 280,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Mirror bench' },
        { id: 'science', label: 'Sign convention' }
      ],
      presets: [
        {
          label: 'Concave f = 15 cm',
          apply: (s) => {
            s.mode = 0;
            s.f = 15;
            s.u = -25;
            s.h = 4;
          }
        },
        {
          label: 'Convex f = 15 cm',
          apply: (s) => {
            s.mode = 1;
            s.f = 15;
            s.u = -25;
            s.h = 4;
          }
        },
        {
          label: 'Object at F',
          apply: (s) => {
            s.mode = 0;
            s.f = 15;
            s.u = -15;
            s.h = 4;
          }
        },
        {
          label: 'Dental mirror',
          apply: (s) => {
            s.mode = 1;
            s.f = 6;
            s.u = -20;
            s.h = 3;
          }
        },
        {
          label: 'Satellite dish',
          apply: (s) => {
            s.mode = 1;
            s.f = 30;
            s.u = -40;
            s.h = 6;
          }
        }
      ],
      graphs: [
        {
          title: 'Image distance v vs object distance u',
          xLabel: 'Object distance u',
          xUnit: 'cm',
          xKey: 'u',
          yLabel: 'v',
          yUnit: 'cm',
          height: 128,
          series: [{ id: 'v', label: 'Image v', unit: 'cm', color: '#22d3ee' }]
        },
        {
          title: 'Magnification m = −v/u vs object distance u',
          xLabel: 'Object distance u',
          xUnit: 'cm',
          xKey: 'u',
          yLabel: 'm',
          yUnit: '×',
          height: 128,
          series: [{ id: 'm', label: 'Magnification m', unit: '×', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;

        S.mode = 0;
        S.f = 15;
        S.u = -25;
        S.h = 4;
        S.sweep = [];

        /* ---- controls (slider order matters: mode, |f|, u, h) ---- */
        const sMode = api.SU.slider(
          api.panel,
          'Mirror',
          0,
          1,
          1,
          0,
          (v) => {
            S.mode = v;
            rebuild();
          },
          (v) => (v ? 'Convex' : 'Concave')
        );
        const sF = api.SU.slider(api.panel, '|f| (cm)', 6, 30, 1, 15, (v) => {
          S.f = v;
          rebuild();
        });
        const sU = api.SU.slider(api.panel, 'Object distance u (cm)', -60, -8, 1, -25, (v) => {
          S.u = v;
          sync();
        });
        const sH = api.SU.slider(api.panel, 'Object height h (cm)', 1, 8, 0.5, 4, (v) => {
          S.h = v;
          sync();
        });

        /* ---- readouts ---- */
        const rV = api.SU.readout(api.readouts, 'Image v', '—');
        const rM = api.SU.readout(api.readouts, 'm = -v/u', '—');
        const rN = api.SU.readout(api.readouts, 'Nature', '—');

        /* ---- physics: the mirror formula, verbatim ---- */
        const fOf = () => (S.mode ? 1 : -1) * Math.abs(S.f);
        const vOf = (f, u) => 1 / (1 / f - 1 / u);
        const mOf = (v, u) => -v / u;

        function sync() {
          const f = fOf(),
            u = S.u,
            h = S.h;
          const v = vOf(f, u);
          const m = mOf(v, u);
          const finite = isFinite(v);
          rV.set(finite ? v.toFixed(1) + ' cm' : '∞');
          rM.set(finite ? m.toFixed(2) : '—');
          rN.set(!finite ? 'At infinity' : v < 0 ? 'Real, inverted' : 'Virtual, erect');
        }

        /* ---- live sweep of v(u) and m(u) for the current mirror ---- */
        function rebuild() {
          const G0 = api.graphs[0],
            G1 = api.graphs[1];
          const f = fOf();
          const rows = [];
          if (G0) G0.clear();
          if (G1) G1.clear();
          for (let i = 0; i <= 104; i++) {
            const u = -60 + i * 0.5;
            const v = vOf(f, u);
            /* the image runs off the bench near the focus, and past ±150 cm it
               is off the drawing entirely — those samples are skipped */
            if (!isFinite(v) || Math.abs(v) > 150) continue;
            const m = mOf(v, u);
            rows.push([u, v, m]);
            if (G0) G0.push({ u, v });
            if (G1) G1.push({ u, m });
          }
          S.sweep = rows;
          sync();
          if (S.onParam) S.onParam();
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          bench(api.getLayer() === 'science');
        }

        function bench(analysis) {
          const f = fOf(),
            u = S.u,
            h = S.h;
          const v = vOf(f, u);
          const m = mOf(v, u);
          const hi = h * m;
          const finite = isFinite(v);
          const cx = W / 2,
            py = H / 2;
          const sc = 3;
          g.strokeStyle = '#26314a';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(0, py);
          g.lineTo(W, py);
          g.stroke();
          g.beginPath();
          g.moveTo(cx, 20);
          g.lineTo(cx, H - 20);
          g.stroke();
          const isConcave = S.mode === 0;
          g.strokeStyle = isConcave ? '#22d3ee' : '#fbbf24';
          g.lineWidth = 3;
          g.beginPath();
          if (isConcave) {
            g.moveTo(cx - 70, 20);
            g.quadraticCurveTo(cx - 90, py, cx - 70, H - 20);
          } else {
            g.moveTo(cx + 70, 20);
            g.quadraticCurveTo(cx + 90, py, cx + 70, H - 20);
          }
          g.stroke();
          const ox = cx + u * sc,
            oy = py - h * 12;
          g.fillStyle = '#f87171';
          g.fillRect(ox - 2, oy, 4, h * 12);
          g.beginPath();
          g.arc(ox, oy, 4, 0, 7);
          g.fill();
          ncLabel(g, ox - 10, oy - 6, 'O', '#f87171');
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc(cx + f * sc, py, 5, 0, 7);
          g.fill();
          ncLabel(g, cx + f * sc - 6, py - 10, 'F', '#fbbf24');
          g.fillStyle = '#38bdf8';
          g.beginPath();
          g.arc(cx + 2 * f * sc, py, 5, 0, 7);
          g.fill();
          ncLabel(g, cx + 2 * f * sc - 6, py - 10, 'C', '#38bdf8');
          if (finite && Math.abs(v) < 90) {
            const ix = cx + v * sc,
              iy = py - hi * 12;
            g.fillStyle = m < 0 ? '#34d399' : '#a78bfa';
            g.fillRect(ix - 2, iy, 4, Math.abs(hi) * 12);
            g.beginPath();
            g.arc(ix, iy, 4, 0, 7);
            g.fill();
            ncLabel(g, ix + 6, iy, 'I', '#34d399');
            g.strokeStyle = 'rgba(52,211,153,.45)';
            g.setLineDash([5, 5]);
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(ox, oy);
            g.lineTo(ix, iy);
            g.stroke();
            g.setLineDash([]);
          }
          g.fillStyle = '#6b7a99';
          g.font = '10px "DM Mono", monospace';
          g.fillText(isConcave ? 'Concave (f<0)' : 'Convex (f>0)', 12, 18);
          g.fillText('1/f = 1/v + 1/u', 12, H - 10);
          if (analysis) analysisOverlay(f, u, v, m, finite);
        }

        function analysisOverlay(f, u, v, m, finite) {
          /* the v(u) trace, drawn from the same sweep the graph engine holds */
          const gx0 = 24,
            gy0 = H - 34,
            gw = W - 48,
            gh = 76;
          g.strokeStyle = 'rgba(255,255,255,.07)';
          g.lineWidth = 1;
          g.strokeRect(gx0, gy0 - gh, gw, gh);
          g.strokeStyle = 'rgba(107,122,153,.6)';
          g.beginPath();
          g.moveTo(gx0, gy0 - gh / 2);
          g.lineTo(gx0 + gw, gy0 - gh / 2);
          g.stroke();
          const rows = S.sweep;
          if (rows.length > 1) {
            const vMax = 150;
            g.strokeStyle = 'rgba(34,211,238,.9)';
            g.lineWidth = 2;
            g.beginPath();
            rows.forEach((row, i) => {
              const X = gx0 + ((row[0] + 60) / 52) * gw;
              const Y = gy0 - gh / 2 - (row[1] / vMax) * (gh / 2);
              i ? g.lineTo(X, Y) : g.moveTo(X, Y);
            });
            g.stroke();
          }
          g.fillStyle = '#6b7a99';
          g.font = '9px "DM Mono", monospace';
          g.fillText('v(u)', gx0 + 4, gy0 - gh + 12);
          g.fillText('−60 cm', gx0 + 2, gy0 + 10);
          g.fillText('−8 cm', gx0 + gw - 34, gy0 + 10);
          api.pxLabel(
            g,
            20,
            38,
            'f = ' + f.toFixed(0) + ' cm · u = ' + u.toFixed(0) + ' cm · v = ' + (finite ? v.toFixed(1) : '∞') + ' cm',
            'rgba(232,237,247,0.85)'
          );
          api.pxLabel(
            g,
            20,
            56,
            finite
              ? 'm = ' + m.toFixed(2) + ' → ' + (v < 0 ? 'real, inverted (in front of the mirror)' : 'virtual, erect (behind the mirror)')
              : 'object at F → the image is formed at infinity',
            finite ? 'rgba(34,211,238,0.9)' : 'rgba(251,191,36,0.95)'
          );
        }

        rebuild();

        return {
          update() {},
          draw,
          reset() {
            rebuild();
          },
          onPreset() {
            sMode.set(S.mode);
            sF.set(S.f);
            sU.set(S.u);
            sH.set(S.h);
            rebuild();
          }
        };
      },
      probe(api) {
        const S = api.state;
        const f = (S.mode ? 1 : -1) * Math.abs(S.f);
        const u = S.u;
        const h = S.h;
        const v = 1 / (1 / f - 1 / u);
        const m = -v / u;
        const finite = isFinite(v);
        return {
          mode: S.mode ? 'convex' : 'concave',
          f,
          u,
          h,
          v: finite ? v : null,
          m: finite ? m : null,
          hi: finite ? h * m : null,
          nature: !finite ? 'infinity' : v < 0 ? 'real' : 'virtual',
          W: api.W
        };
      },
      predict(api) {
        const S = api.state;
        const TARGET_U = -40;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'v',
          unit: 'cm',
          quantity: 'image distance',
          absFloor: 0.5,
          context() {
            return {
              mode: S.mode,
              f: (S.mode ? 1 : -1) * Math.abs(S.f),
              u: S.u,
              h: S.h,
              paramsText:
                (S.mode ? 'convex' : 'concave') + ' mirror, f = ' + Math.abs(S.f) + ' cm'
            };
          },
          question() {
            return 'Predict first: with this mirror, where does the image of an object 40 cm away form (v in cm)?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('v', TARGET_U);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const u = TARGET_U;
            const v = 1 / (1 / ctx.f - 1 / u);
            const m = -v / u;
            return (
              'The mirror formula 1/f = 1/v + 1/u rearranges to v = 1/(1/f − 1/u). With f = ' +
              ctx.f.toFixed(0) +
              ' cm and u = ' +
              u +
              ' cm that gives v = ' +
              v.toFixed(1) +
              ' cm. ' +
              (ctx.f < 0
                ? 'A negative f is a concave mirror: v comes out negative, so the image is real and lies in front of ' +
                  'the glass, and m = −v/u = ' +
                  m.toFixed(2) +
                  ' is negative, so the image is inverted.'
                : 'A positive f is a convex mirror: v comes out positive, so the image is virtual and lies behind the ' +
                  'glass, and m = −v/u = ' +
                  m.toFixed(2) +
                  ' is positive, so the image is erect. That is why a convex mirror always shows you a small, upright, ' +
                  'undistorted-looking face — it is the same geometry as a satellite dish and a dental mirror.') +
              ' Watch what happens as u approaches f: v runs away to infinity and the image fades out.'
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

/* 10th — Human Eye Defects */
Sims.register(
  'ncert10-eye',
  'Human Eye Defects (Class 10)',
  'Myopia concave, hypermetropia convex. Power P=1/f (m).',
  '👁️',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ncert10-eye',
      title: 'Human Eye Defects',
      desc: 'Every pair of glasses in the world is this bench. A myopic eye focuses distant light in front of the retina, so it is corrected with a diverging (concave) lens of negative power; a hypermetropic eye focuses near light behind the retina and needs a converging (convex) lens of positive power. One number does all of it: the lens power P in dioptres, with f = 1/P.',
      icon: '👁️',
      topic: 'Light',
      level: 'Grade 10',
      appKey: 'ncert10-eye',
      height: 280,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Eye bench' },
        { id: 'science', label: 'Power vs focal length' }
      ],
      presets: [
        {
          label: 'Myopia −2.00 D',
          apply: (s) => {
            s.mode = 0;
            s.p = -2;
          }
        },
        {
          label: 'Mild myopia −0.50 D',
          apply: (s) => {
            s.mode = 0;
            s.p = -0.5;
          }
        },
        {
          label: 'Hypermetropia +2.00 D',
          apply: (s) => {
            s.mode = 1;
            s.p = 2;
          }
        },
        {
          label: 'Reading glasses +1.50 D',
          apply: (s) => {
            s.mode = 1;
            s.p = 1.5;
          }
        },
        {
          label: 'Severe myopia −4.00 D',
          apply: (s) => {
            s.mode = 0;
            s.p = -4;
          }
        }
      ],
      graphs: [
        {
          title: 'Focal length f = 1/P — diverging lens (myopia)',
          xLabel: 'Lens power P',
          xUnit: 'D',
          xKey: 'P',
          yLabel: 'f',
          yUnit: 'cm',
          height: 128,
          series: [{ id: 'f', label: 'f (diverging)', unit: 'cm', color: '#38bdf8' }]
        },
        {
          title: 'Focal length f = 1/P — converging lens (hypermetropia)',
          xLabel: 'Lens power P',
          xUnit: 'D',
          xKey: 'P',
          yLabel: 'f',
          yUnit: 'cm',
          height: 128,
          series: [{ id: 'f', label: 'f (converging)', unit: 'cm', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;

        S.mode = 0;
        S.p = -2;

        /* ---- controls (slider order: defect, power) ---- */
        const sMode = api.SU.slider(
          api.panel,
          'Defect',
          0,
          1,
          1,
          0,
          (v) => {
            S.mode = v;
            sync();
          },
          (v) => (v ? 'Hypermetropia' : 'Myopia')
        );
        const sP = api.SU.slider(
          api.panel,
          'Lens power P (D)',
          -4,
          4,
          0.25,
          -2,
          (v) => {
            S.p = v;
            sync();
          },
          (v) => (v > 0 ? '+' : '') + v.toFixed(2) + ' D'
        );

        /* ---- readouts ---- */
        const rF = api.SU.readout(api.readouts, 'f = 1/P', '—');
        const rC = api.SU.readout(api.readouts, 'Correction', '—');

        /* ---- physics: the lens power / focal length relation, verbatim ---- */
        const fOf = (p) => (p ? 100 / p : Infinity); // cm
        const isMyopia = () => S.mode === 0;
        const isCorrect = () => (isMyopia() ? S.p < 0 : S.p > 0);

        function sync() {
          const p = S.p;
          const f = fOf(p);
          rF.set(isFinite(f) ? f.toFixed(1) + ' cm' : '∞');
          rC.set(
            isMyopia()
              ? p < 0
                ? '✅ Concave — diverges to retina'
                : '❌ Needs concave'
              : p > 0
                ? '✅ Convex — converges to retina'
                : '❌ Needs convex'
          );
        }

        /* ---- live sweeps of f against lens power, both signs ---- */
        function rebuild() {
          const G0 = api.graphs[0],
            G1 = api.graphs[1];
          if (G0) {
            G0.clear();
            for (let i = 0; i <= 15; i++) {
              const P = -4 + i * 0.25;
              G0.push({ P, f: fOf(P) });
            }
          }
          if (G1) {
            G1.clear();
            for (let i = 0; i <= 15; i++) {
              const P = 0.25 + i * 0.25;
              G1.push({ P, f: fOf(P) });
            }
          }
          if (S.onParam) S.onParam();
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          eyeDiagram(api.getLayer() === 'science');
        }

        function eyeDiagram(analysis) {
          const myopia = isMyopia(),
            p = S.p;
          const f = fOf(p);
          const ex = 90,
            ey = H / 2,
            rx = 320;
          g.fillStyle = '#1a2338';
          g.beginPath();
          g.ellipse(ex, ey, 42, 34, 0, 0, 7);
          g.fill();
          g.strokeStyle = '#3a4a6a';
          g.lineWidth = 2;
          g.stroke();
          g.fillStyle = '#22d3ee';
          g.beginPath();
          g.ellipse(ex + 12, ey, 18, 22, 0, 0, 7);
          g.fill();
          g.fillStyle = '#0b1020';
          g.beginPath();
          g.arc(ex + 16, ey, 7, 0, 7);
          g.fill();
          g.fillStyle = '#cbd5e1';
          g.fillRect(rx - 2, ey - 40, 4, 80);
          g.fillStyle = '#6b7a99';
          g.font = '11px "DM Mono", monospace';
          g.fillText('RETINA', rx - 16, ey + 56);
          const lensX = 190;
          const isConcave = p < 0;
          g.strokeStyle = myopia ? '#38bdf8' : '#fbbf24';
          g.lineWidth = 3;
          if (Math.abs(p) > 0.2) {
            g.beginPath();
            if (isConcave) {
              g.moveTo(lensX, ey - 36);
              g.quadraticCurveTo(lensX + 10, ey, lensX, ey + 36);
            } else {
              g.moveTo(lensX, ey - 36);
              g.quadraticCurveTo(lensX - 12, ey, lensX, ey + 36);
            }
            g.stroke();
            ncLabel(
              g,
              lensX - 18,
              ey - 42,
              (p > 0 ? '+' : '') + p.toFixed(1) + 'D',
              myopia ? '#38bdf8' : '#fbbf24'
            );
          } else {
            ncLabel(g, lensX - 14, ey - 42, 'No lens', '#6b7a99');
          }
          const focus = myopia ? ex + 28 : rx + 18;
          const correct = isCorrect();
          const target = correct ? rx : focus;
          g.strokeStyle = correct ? '#34d399' : '#f87171';
          g.setLineDash([5, 5]);
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(ex + 30, ey);
          g.lineTo(target, ey);
          g.stroke();
          g.setLineDash([]);
          g.fillStyle = correct ? '#34d399' : '#f87171';
          g.beginPath();
          g.arc(target, ey, 6, 0, 7);
          g.fill();
          ncLabel(g, target + 8, ey - 8, correct ? 'On retina' : 'Before/Behind', '#34d399');
          g.fillStyle = '#6b7a99';
          g.font = '10px "DM Mono", monospace';
          g.fillText(
            myopia ? 'Myopia: far image before retina' : 'Hypermetropia: near image behind',
            12,
            18
          );
          if (analysis) {
            api.pxLabel(
              g,
              20,
              38,
              'P = ' + (p > 0 ? '+' : '') + p.toFixed(2) + ' D  →  f = 1/P = ' + (isFinite(f) ? f.toFixed(1) + ' cm' : '∞'),
              'rgba(232,237,247,0.85)'
            );
            api.pxLabel(
              g,
              20,
              56,
              correct
                ? 'the image lands on the retina — this lens is the right one for this defect'
                : 'the image misses the retina — this lens makes the defect worse',
              correct ? 'rgba(52,211,153,0.95)' : 'rgba(248,113,113,0.95)'
            );
            api.pxLabel(
              g,
              20,
              H - 22,
              'dioptre = 1/m  ·  P (D) = 1/f (m)  ·  f (cm) = 100 / P',
              'rgba(107,122,153,0.95)'
            );
          }
        }

        rebuild();
        sync();

        return {
          update() {},
          draw,
          reset() {
            rebuild();
            sync();
          },
          onPreset() {
            sMode.set(S.mode);
            sP.set(S.p);
            rebuild();
            sync();
          }
        };
      },
      probe(api) {
        const S = api.state;
        const myopia = S.mode === 0;
        const p = S.p;
        const f = p ? 100 / p : Infinity;
        return {
          mode: myopia ? 'myopia' : 'hypermetropia',
          P: p,
          fCm: isFinite(f) ? +f.toFixed(3) : null,
          correct: myopia ? p < 0 : p > 0
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'f',
          unit: 'cm',
          quantity: 'focal length of the corrective lens',
          absFloor: 0.5,
          context() {
            return {
              mode: S.mode,
              p: S.p,
              paramsText:
                (S.mode ? 'hypermetropia' : 'myopia') + ', lens power ' + (S.p > 0 ? '+' : '') + S.p.toFixed(2) + ' D'
            };
          },
          question() {
            return 'Predict first: what is the focal length of this corrective lens (in cm)?';
          },
          observe() {
            const p = S.p;
            if (!p) return null; /* no lens at all — there is no focal length */
            const G = p < 0 ? api.graphs[0] : api.graphs[1];
            const hit = G.valueAt('f', p);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const f = ctx.p ? 100 / ctx.p : Infinity;
            return (
              'Lens power is measured in dioptres, and one dioptre is 1 metre⁻¹, so P = 1/f with f in metres — ' +
              'equivalently f (cm) = 100 / P. With P = ' +
              (ctx.p > 0 ? '+' : '') +
              ctx.p.toFixed(2) +
              ' D that gives f = ' +
              (isFinite(f) ? f.toFixed(1) + ' cm' : '∞') +
              '. ' +
              (ctx.p < 0
                ? 'Negative power means a diverging (concave) lens: it spreads the rays so the image of a far-away ' +
                  'object is pushed back onto the retina. That is exactly the correction a myopic eye needs, and a ' +
                  '−2.00 D lens is what a −2.00 D prescription means.'
                : ctx.p > 0
                ? 'Positive power means a converging (convex) lens: it bends the rays together so the image of a near ' +
                  'object is pulled forward onto the retina, which is the correction a hypermetropic eye needs.'
                : 'With P = 0 there is no lens at all, so there is no focal length to quote.') +
              ' The same number also orders the world: a stronger lens means a shorter focal length.'
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

/* 10th — Joule Heating & Bill */
Sims.register(
  'ncert10-heating',
  'Joule Heating & Bill (Class 10 Electricity)',
  'H=I²Rt. Bill in kWh (1 kWh=3.6 MJ).',
  '🔌',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ncert10-heating',
      title: 'Joule Heating & Bill',
      desc: 'The electricity bill is the physics of heating, written out in money. A device drawing P watts for h hours turns P·h joules into heat, and 1 kWh = 3.6 × 10⁶ J. The same number decides two other things: what the monthly bill is at your tariff, and how much current the device pulls on a 220 V supply — which is why a 3000 W heater needs a 15 A fuse and not a 5 A one.',
      icon: '🔌',
      topic: 'Electricity',
      level: 'Grade 10',
      appKey: 'ncert10-heating',
      height: 280,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Appliance bench' },
        { id: 'science', label: 'Energy ledger' }
      ],
      presets: [
        {
          label: 'Kettle 1500 W, 4 h',
          apply: (s) => {
            s.p = 1500;
            s.h = 4;
            s.rate = 7;
          }
        },
        {
          label: 'Bulb 100 W, 5 h',
          apply: (s) => {
            s.p = 100;
            s.h = 5;
            s.rate = 7;
          }
        },
        {
          label: 'Fan 200 W, 8 h',
          apply: (s) => {
            s.p = 200;
            s.h = 8;
            s.rate = 7;
          }
        },
        {
          label: 'Heater 3000 W (fuse!)',
          apply: (s) => {
            s.p = 3000;
            s.h = 2;
            s.rate = 7;
          }
        },
        {
          label: 'Cheap tariff ₹4',
          apply: (s) => {
            s.p = 1500;
            s.h = 4;
            s.rate = 4;
          }
        }
      ],
      graphs: [
        {
          title: 'Daily energy (kWh) vs device power',
          xLabel: 'Device power P',
          xUnit: 'W',
          xKey: 'P',
          yLabel: 'kWh',
          yUnit: 'kWh/day',
          height: 128,
          series: [{ id: 'kwh', label: 'Daily kWh', unit: 'kWh/day', color: '#22d3ee' }]
        },
        {
          title: 'Monthly bill (₹) vs device power',
          xLabel: 'Device power P',
          xUnit: 'W',
          xKey: 'P',
          yLabel: '₹',
          yUnit: '₹/month',
          height: 128,
          series: [{ id: 'cost', label: 'Monthly ₹', unit: '₹/month', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;

        S.p = 1500;
        S.h = 4;
        S.rate = 7;

        /* ---- controls (slider order: power, hours, tariff) ---- */
        const sP = api.SU.slider(api.panel, 'Device power P (W)', 100, 3000, 100, 1500, (v) => {
          S.p = v;
          sync();
        });
        const sH = api.SU.slider(api.panel, 'Daily use (h)', 0.5, 10, 0.5, 4, (v) => {
          S.h = v;
          sync();
        });
        const sRT = api.SU.slider(api.panel, 'Rate ₹/kWh', 4, 15, 0.5, 7, (v) => {
          S.rate = v;
          sync();
        });

        /* ---- readouts ---- */
        const rE = api.SU.readout(api.readouts, 'Daily kWh', '—');
        const rM = api.SU.readout(api.readouts, 'Monthly kWh', '—');
        const rC = api.SU.readout(api.readouts, 'Monthly ₹', '—');
        const rI = api.SU.readout(api.readouts, 'Current @220V', '—');

        /* ---- physics: joule heating and the tariff, verbatim ---- */
        const dailyOf = (p, h) => (p * h) / 1000;
        const monthlyOf = (p, h) => dailyOf(p, h) * 30;
        const costOf = (p, h, rate) => monthlyOf(p, h) * rate;
        const currentOf = (p) => p / 220;

        function sync() {
          const p = S.p,
            h = S.h,
            rate = S.rate;
          rE.set(dailyOf(p, h).toFixed(2));
          rM.set(monthlyOf(p, h).toFixed(1));
          rC.set('₹' + costOf(p, h, rate).toFixed(0));
          rI.set(currentOf(p).toFixed(2) + ' A');
        }

        /* ---- live sweeps at the current hours and tariff ---- */
        function rebuild() {
          const G0 = api.graphs[0],
            G1 = api.graphs[1];
          if (G0) {
            G0.clear();
            for (let p = 100; p <= 3000; p += 50) {
              G0.push({ P: p, kwh: dailyOf(p, S.h) });
            }
          }
          if (G1) {
            G1.clear();
            for (let p = 100; p <= 3000; p += 50) {
              G1.push({ P: p, cost: costOf(p, S.h, S.rate) });
            }
          }
          if (S.onParam) S.onParam();
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') ledger();
          else bars();
        }

        function bars() {
          const p = S.p,
            h = S.h;
          const barW = W - 80,
            barH = 18,
            x0 = 60;
          const fuels = [
            { label: 'Heater', p: p, h: h },
            { label: 'Bulb 60W', p: 60, h: 5 },
            { label: 'Fan 75W', p: 75, h: 8 }
          ];
          g.fillStyle = '#9aa8c3';
          g.font = '11px "DM Mono", monospace';
          g.fillText('Daily energy comparison (kWh)', 12, 22);
          fuels.forEach((f, i) => {
            const kwh = (f.p * f.h) / 1000;
            const w = Math.min(barW, (kwh / 6) * barW);
            const y = 48 + i * 44;
            g.fillStyle = '#26314a';
            g.fillRect(x0, y, barW, barH);
            g.fillStyle = i === 0 ? '#fbbf24' : '#33415c';
            g.fillRect(x0, y, w, barH);
            g.fillStyle = '#e2e8f0';
            g.font = '11px "DM Mono", monospace';
            g.fillText(f.label + ' — ' + kwh.toFixed(2) + ' kWh', x0 + 6, y + 13);
          });
          g.fillStyle = '#6b7a99';
          g.font = '11px "DM Mono", monospace';
          g.fillText('1 kWh = 3.6×10⁶ J', 12, H - 14);
          const cur = currentOf(p);
          g.fillStyle = cur > 5 ? '#f87171' : '#34d399';
          g.font = '11px "DM Mono", monospace';
          g.fillText(cur > 5 ? '⚠️ Use >5A fuse' : '✅ 5A fuse OK', W - 110, H - 14);
          api.pxLabel(g, 20, 22, 'PHYSIX APPLIANCE BENCH', 'rgba(232,237,247,0.7)');
        }

        function ledger() {
          const p = S.p,
            h = S.h,
            rate = S.rate;
          const daily = dailyOf(p, h),
            monthly = monthlyOf(p, h),
            cost = costOf(p, h, rate),
            cur = currentOf(p);
          const steps = [
            ['P', p + ' W'],
            ['×  h', h + ' h'],
            ['=  E', (p * h).toFixed(0) + ' J'],
            ['÷ 3.6×10⁶', daily.toFixed(2) + ' kWh'],
            ['× 30 d', monthly.toFixed(1) + ' kWh'],
            ['× ₹' + rate.toFixed(1), '₹' + cost.toFixed(0)]
          ];
          const y0 = 54,
            rowH = 30;
          steps.forEach((s, i) => {
            const y = y0 + i * rowH;
            g.fillStyle = 'rgba(255,255,255,.04)';
            g.fillRect(24, y - 18, W - 48, 24);
            g.fillStyle = '#6b7a99';
            g.font = '11px "DM Mono", monospace';
            g.fillText(s[0], 32, y);
            g.fillStyle = i >= 3 ? '#fbbf24' : '#e2e8f0';
            g.font = 'bold 12px "DM Mono", monospace';
            g.fillText(s[1], 150, y);
          });
          api.pxLabel(
            g,
            20,
            22,
            'energy ledger: watts × hours → joules → kWh → rupees',
            'rgba(232,237,247,0.8)'
          );
          api.pxLabel(
            g,
            20,
            40,
            'H = I²Rt  ·  I = P/V = ' + p + '/220 = ' + cur.toFixed(2) + ' A',
            'rgba(34,211,238,0.9)'
          );
          g.fillStyle = cur > 5 ? '#f87171' : '#34d399';
          g.font = '11px "DM Mono", monospace';
          g.fillText(cur > 5 ? '⚠️ above 5 A — fit a higher-rated fuse' : '✅ 5 A fuse is enough', 24, H - 16);
        }

        rebuild();
        sync();

        return {
          update() {},
          draw,
          reset() {
            rebuild();
            sync();
          },
          onPreset() {
            sP.set(S.p);
            sH.set(S.h);
            sRT.set(S.rate);
            rebuild();
            sync();
          }
        };
      },
      probe(api) {
        const S = api.state;
        const p = S.p,
          h = S.h,
          rate = S.rate;
        const daily = (p * h) / 1000;
        return {
          P: p,
          h,
          rate,
          dailyKWh: +daily.toFixed(6),
          monthlyKWh: +(daily * 30).toFixed(4),
          monthlyCost: +(daily * 30 * rate).toFixed(4),
          current: p / 220
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'kwh',
          unit: 'kWh',
          quantity: 'daily energy use',
          absFloor: 0.02,
          context() {
            return {
              p: S.p,
              h: S.h,
              rate: S.rate,
              paramsText: 'P = ' + S.p + ' W for ' + S.h + ' h/day at ₹' + S.rate + '/kWh'
            };
          },
          question() {
            return 'Predict first: how many kWh does this device use in one day?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('kwh', S.p);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const daily = (ctx.p * ctx.h) / 1000;
            const cur = ctx.p / 220;
            return (
              'A device drawing ' +
              ctx.p +
              ' W for ' +
              ctx.h +
              ' h turns P·h = ' +
              (ctx.p * ctx.h).toFixed(0) +
              ' J into heat, and 1 kWh = 3.6 × 10⁶ J, so the daily use is ' +
              daily.toFixed(2) +
              ' kWh. Over a 30-day month that is ' +
              (daily * 30).toFixed(1) +
              ' kWh and at ₹' +
              ctx.rate.toFixed(1) +
              '/kWh the bill is ₹' +
              (daily * 30 * ctx.rate).toFixed(0) +
              '. The same power has a second consequence on the 220 V supply: I = P/V = ' +
              ctx.p +
              '/220 = ' +
              cur.toFixed(2) +
              ' A, and a 5 A fuse cannot carry that — which is exactly why high-power appliances carry their own ' +
              'higher-rated fuse and their own thicker wire.'
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

/* 11th — Vernier Callipers (fully original rebuild) */
Sims.register(
  'ncert11-measure',
  'Vernier Callipers (Class 11 Units)',
  'Reading = MSR + VC × LC, where LC = 1 MSD − 1 VSD. Drag the object or the jaw.',
  '📏',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ncert11-measure',
      title: 'Vernier Callipers',
      desc: 'The instrument that lets a workshop measure a hair more than a millimetre. The main scale is graduated in millimetres; the vernier scale has ten divisions spanning nine, so one vernier division is 0.9 mm and the least count is 1 − 0.9 = 0.1 mm. Read the main scale, find the vernier line that lines up with a main-scale line, and the reading is MSR + VC × LC.',
      icon: '📏',
      topic: 'Units & Measurement',
      level: 'Grade 11',
      appKey: 'ncert11-measure',
      height: 340,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Callipers' },
        { id: 'science', label: 'Least count' }
      ],
      presets: [
        {
          label: '23.7 mm shaft',
          apply: (s) => {
            s.l = 23.7;
          }
        },
        {
          label: '10.0 mm pin',
          apply: (s) => {
            s.l = 10;
          }
        },
        {
          label: '5.4 mm wire',
          apply: (s) => {
            s.l = 5.4;
          }
        },
        {
          label: '30.6 mm plate',
          apply: (s) => {
            s.l = 30.6;
          }
        },
        {
          label: '18.2 mm bolt',
          apply: (s) => {
            s.l = 18.2;
          }
        }
      ],
      graphs: [
        {
          title: 'Reading vs true length — the identity line and the MSR staircase',
          xLabel: 'True length L',
          xUnit: 'mm',
          xKey: 'L',
          yLabel: 'mm',
          yUnit: 'mm',
          height: 128,
          series: [
            { id: 'reading', label: 'Reading', unit: 'mm', color: '#22d3ee' },
            { id: 'msr', label: 'MSR', unit: 'mm', color: '#fbbf24' }
          ]
        },
        {
          title: 'Coinciding division n vs true length — the tenths digit',
          xLabel: 'True length L',
          xUnit: 'mm',
          xKey: 'L',
          yLabel: 'n',
          yUnit: 'div',
          height: 128,
          series: [{ id: 'vc', label: 'Coinciding n', unit: 'div', color: '#a78bfa' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        /* 1 MSD = 1 mm. Vernier: 10 VSD = 9 mm, so LC = 1 − 0.9 = 0.1 mm. */
        const LC = 0.1,
          MSD = 1,
          VSD = 0.9,
          NVS = 10;
        const rnd = (v, n) => +(Math.round(v * Math.pow(10, n)) / Math.pow(10, n));

        S.l = 23.7;
        S.msr = 23;
        S.rem = 0.7;
        S.vc = 7;
        S.reading = 23.7;

        /* world mapping: scale start x0, mm per px */
        const x0 = 64,
          pxPerMm = 6.5,
          mmMax = 36;
        const toX = (mm) => x0 + mm * pxPerMm;

        /* ---- controls ---- */
        const sL = api.SU.slider(api.panel, 'Object length L (mm)', 0, 33, 0.1, 23.7, (v) => {
          S.l = v;
          rebuild();
        });
        S.l = sL.get();

        /* ---- readouts ---- */
        const rLC = api.SU.readout(api.readouts, 'Least count', '—');
        const rMSR = api.SU.readout(api.readouts, 'MSR', '—');
        const rVC = api.SU.readout(api.readouts, 'Coinciding div', '—');
        const rR = api.SU.readout(api.readouts, 'Reading', '—');

        /* ---- the coincidence search ----
           BUG FIX (pre-existing, live): the old search tested
           (n·VSD − rem) % 1, but the drawing puts vernier zero ON the measured
           face, so a vernier line sits on a main-scale line when
           n·VSD + rem is a whole number of millimetres. With the old sign a
           23.7 mm object "read" 23.3 mm and the amber line the bench called
           coinciding visibly did not line up with anything. The sign is fixed
           here; every other number, unit and equation is untouched. */
        function vcOf(rem) {
          let VC = 0,
            best = 1e9;
          for (let n = 0; n < NVS; n++) {
            const d = Math.abs((n * VSD + rem) % 1);
            const c = Math.min(d, 1 - d);
            if (c < best) {
              best = c;
              VC = n;
            }
          }
          return VC;
        }

        function compute() {
          const MSR = Math.floor(S.l);
          const rem = S.l - MSR;
          const VC = vcOf(rem);
          const reading = rnd(MSR + VC * LC, 1);
          S.msr = MSR;
          S.rem = rem;
          S.vc = VC;
          S.reading = reading;
          rLC.set(LC + ' mm');
          rMSR.set(MSR + ' mm');
          rVC.set(VC);
          rR.set(reading.toFixed(1) + ' mm');
        }

        /* ---- live sweeps: the real data the POR panel reads ---- */
        function rebuild() {
          const G0 = api.graphs[0],
            G1 = api.graphs[1];
          if (G0) G0.clear();
          if (G1) G1.clear();
          for (let i = 0; i <= 360; i++) {
            const L = +(i / 10).toFixed(1);
            const MSR = Math.floor(L);
            const rem = L - MSR;
            const VC = vcOf(rem);
            const reading = rnd(MSR + VC * LC, 1);
            if (G0) {
              G0.push({ L, reading, msr: MSR });
            }
            if (G1) {
              G1.push({ L, vc: VC });
            }
          }
          compute();
          if (S.onParam) S.onParam();
        }

        /* ---- drag the object (or the jaw) ---- */
        let dragging = null;
        const c = api.cv;
        c.addEventListener('pointerdown', (e) => {
          dragging = 'obj';
          c.setPointerCapture(e.pointerId);
        });
        c.addEventListener('pointermove', (e) => {
          if (!dragging) return;
          const rect = c.getBoundingClientRect();
          const mm = (e.clientX - rect.left - x0) / pxPerMm;
          S.l = rnd(Math.min(mmMax - 3, Math.max(0, mm)), 1);
          sL.set(S.l);
          rebuild();
        });
        const up = () => (dragging = null);
        c.addEventListener('pointerup', up);
        c.addEventListener('pointercancel', up);

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          instrument(api.getLayer() === 'science');
        }

        function instrument(analysis) {
          const Lmm = S.l;
          const MSR = S.msr,
            VC = S.vc,
            reading = S.reading;

          /* ---- object being measured (blue block) ---- */
          const objH = 46,
            objY = H / 2 - objH / 2 + 4;
          g.fillStyle = 'rgba(56,189,248,.25)';
          g.strokeStyle = '#38bdf8';
          g.lineWidth = 1.5;
          g.fillRect(toX(0), objY, Lmm * pxPerMm, objH);
          g.strokeRect(toX(0), objY, Lmm * pxPerMm, objH);
          g.fillStyle = '#38bdf8';
          g.font = '10px "DM Mono", monospace';
          g.fillText('L = ' + Lmm.toFixed(1) + ' mm', toX(0) + 4, objY + 14);

          /* ---- upper jaw / main scale beam (fixed) ---- */
          const beamY = objY + objH + 16;
          g.fillStyle = '#1c2740';
          g.strokeStyle = '#3a4a6a';
          g.lineWidth = 1.5;
          g.fillRect(x0 - 14, beamY, W - (x0 - 14) - 10, 30);
          g.stroke();
          for (let i = 0; i <= mmMax; i++) {
            const x = toX(i),
              major = i % 5 === 0;
            g.strokeStyle = major ? '#e2e8f0' : '#64748b';
            g.lineWidth = major ? 1.6 : 1;
            g.beginPath();
            g.moveTo(x, beamY);
            g.lineTo(x, beamY + (major ? 16 : 9));
            g.stroke();
            if (major) {
              g.fillStyle = '#9aa8c3';
              g.font = '9px "DM Mono", monospace';
              g.fillText(i, x - 4, beamY + 26);
            }
          }
          g.fillStyle = '#f87171';
          g.beginPath();
          g.moveTo(toX(0), beamY + 16);
          g.lineTo(toX(0) - 4, beamY + 9);
          g.lineTo(toX(0) + 4, beamY + 9);
          g.fill();

          /* ---- sliding vernier block (zeroed to the measured face) ---- */
          const vernX = toX(Lmm);
          const vBlockW = 48,
            vTop = beamY - 6;
          g.fillStyle = '#2b3550';
          g.strokeStyle = '#55658a';
          g.lineWidth = 1.5;
          g.fillRect(vernX - vBlockW / 2, vTop, vBlockW, 40);
          g.stroke();
          for (let n = 0; n <= NVS; n++) {
            const vx = vernX + n * VSD * pxPerMm;
            g.strokeStyle = n === VC ? '#fbbf24' : '#a5b4cb';
            g.lineWidth = n === VC ? 2 : 1;
            g.beginPath();
            g.moveTo(vx, vTop);
            g.lineTo(vx, vTop + 12);
            g.stroke();
          }
          const cxp = vernX + VC * VSD * pxPerMm;
          g.fillStyle = '#fbbf24';
          g.fillRect(cxp - 1, vTop + 12, 2, 8);
          g.fillStyle = '#fbbf24';
          g.font = '11px "DM Mono", monospace';
          g.fillText('n=' + VC, cxp - 16, vTop + 34);

          /* ---- bottom jaw area ---- */
          g.strokeStyle = '#3a4a6a';
          g.lineWidth = 20;
          g.beginPath();
          g.moveTo(toX(0), objY);
          g.lineTo(toX(0), H - 18);
          g.stroke();
          g.strokeStyle = '#e2e8f0';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(toX(Lmm), objY);
          g.lineTo(toX(Lmm), H - 18);
          g.stroke();

          /* ---- annotations ---- */
          g.fillStyle = '#f87171';
          g.font = '12px "DM Mono", monospace';
          g.fillText('0 (main)', toX(0) - 14, H - 6);
          g.fillStyle = '#fbbf24';
          g.fillText('vernier 0', toX(Lmm) - 22, H - 6);
          g.fillStyle = '#6b7a99';
          g.font = '11px "DM Mono", monospace';
          g.fillText('Drag the blue object (or the jaw) to change L — the vernier 0 rides the measured face.', 12, 16);
          g.fillStyle = '#e2e8f0';
          g.font = '12px "DM Mono", monospace';
          g.fillText(
            'LC = ' + LC + ' mm · MSR ' + MSR + ' + VC ' + VC + '×' + LC + ' = ' + reading.toFixed(1) + ' mm',
            12,
            H - 42
          );
          if (analysis) {
            api.pxLabel(
              g,
              W - 250,
              16,
              '1 MSD = 1 mm · 10 VSD = 9 mm → 1 VSD = 0.9 mm',
              'rgba(232,237,247,0.8)'
            );
            api.pxLabel(
              g,
              W - 250,
              34,
              'LC = 1 MSD − 1 VSD = 0.1 mm  →  ±0.05 mm resolution',
              'rgba(251,191,36,0.9)'
            );
          }
        }

        /* teaching note helper */
        const note = api.SU.el(
          'div',
          'sim-note',
          'Vernier callipers: 10 vernier divisions (VSD) span 9 mm, so 1 VSD = 0.9 mm. Least count LC = 1 MSD − 1 VSD = 1 − 0.9 = <b>0.1 mm</b>. Measurement = MSR + coinciding VC × LC.'
        );
        api.readouts.appendChild(note);

        rebuild();

        return {
          update() {},
          draw,
          reset() {
            rebuild();
          },
          onPreset() {
            sL.set(S.l);
            rebuild();
          }
        };
      },
      probe(api) {
        const S = api.state;
        const MSR = Math.floor(S.l);
        const rem = S.l - MSR;
        let VC = 0,
          best = 1e9;
        for (let n = 0; n < 10; n++) {
          const d = Math.abs((n * 0.9 + rem) % 1);
          const c = Math.min(d, 1 - d);
          if (c < best) {
            best = c;
            VC = n;
          }
        }
        return {
          Lmm: +S.l.toFixed(2),
          MSR,
          VC,
          LC: 0.1,
          reading: +(Math.round((MSR + VC * 0.1) * 10) / 10),
          byFormula: +(MSR + VC * 0.1).toFixed(2)
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'reading',
          unit: 'mm',
          quantity: 'vernier reading',
          absFloor: 0.05,
          context() {
            return {
              l: S.l,
              msr: S.msr,
              vc: S.vc,
              paramsText: 'object length L = ' + S.l.toFixed(1) + ' mm'
            };
          },
          question() {
            return 'Predict first: what does the callipers read for this object?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('reading', S.l);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'The main scale reads the whole millimetres: MSR = ' +
              ctx.msr +
              ' mm. The vernier is graduated so that ten of its divisions span nine main-scale divisions, which ' +
              'makes one vernier division 0.9 mm and the least count LC = 1 − 0.9 = 0.1 mm. The ' +
              ctx.vc +
              'th vernier line is the one that lines up with a main-scale line, so the reading is MSR + VC × LC = ' +
              ctx.msr +
              ' + ' +
              ctx.vc +
              '×' +
              0.1 +
              ' = ' +
              r.observed.toFixed(1) +
              ' mm. That tenth-of-a-millimetre is why a vernier can measure what a plain scale cannot, and why ' +
              'every machinist checks the zero error of the instrument before trusting it.'
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

/* 11th — Spinning Skater (Conservation of L) */
Sims.register(
  'ncert11-rotation',
  'Spinning Skater (Class 11 Rotation)',
  'L=Iω conserved. Arms in → I↓ → ω↑.',
  '🌀',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ncert11-rotation',
      title: 'Spinning Skater',
      desc: 'A figure skater pulls her arms in and the spin doubles. Nothing external twists her: the angular momentum she started with is the angular momentum she finishes with, so the only way to spin faster is to make herself smaller. Every flywheel, every motor rotor and every turbine stage obeys the same ledger — L = Iω is fixed, so ω is whatever I allows it to be.',
      icon: '🌀',
      topic: 'Rotational Motion',
      level: 'Grade 11',
      appKey: 'ncert11-rotation',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Rink' },
        { id: 'science', label: 'Angular-momentum ledger' }
      ],
      presets: [
        {
          label: 'Arms out',
          apply: (s) => {
            s.r = 0.8;
          }
        },
        {
          label: 'Arms half in',
          apply: (s) => {
            s.r = 0.4;
          }
        },
        {
          label: 'Arms tucked',
          apply: (s) => {
            s.r = 0.2;
          }
        },
        {
          label: 'Wide spin',
          apply: (s) => {
            s.r = 0.9;
          }
        },
        {
          label: 'Mid tuck',
          apply: (s) => {
            s.r = 0.55;
          }
        }
      ],
      graphs: [
        {
          title: 'Turn angle θ(t) — the spin integrates',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'θ',
          yUnit: '°',
          height: 128,
          series: [{ id: 'theta', label: 'Turn angle θ', unit: '°', color: '#22d3ee' }]
        },
        {
          title: 'Spin rate ω = L₀/I against arm radius r — L stays flat',
          xLabel: 'Arm radius r',
          xUnit: 'm',
          xKey: 'r',
          yLabel: 'ω, L',
          yUnit: 'rad/s, kg·m²/s',
          height: 128,
          series: [
            { id: 'omega', label: 'ω = L₀/r²', unit: 'rad/s', color: '#fbbf24' },
            { id: 'L', label: 'L = Iω (constant)', unit: 'kg·m²/s', color: '#34d399' }
          ]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        /* One conservation law drives everything: the skater's angular momentum
           L0 = I0·ω0 is fixed (set at the default r = 0.8 m, ω0 = 2 rad/s), so
           pulling the arms in changes I and the spin rate follows: ω = L0/I. */
        const I0 = 0.64,
          W0 = 2,
          L0 = I0 * W0;

        S.r = 0.8;
        S.t = 0;
        S.ang = 0;

        /* ---- controls (slider order: radius) ---- */
        const sR = api.SU.slider(api.panel, 'Arm radius r (m)', 0.2, 0.9, 0.05, 0.8, (v) => {
          S.r = v;
          sync();
          if (S.onParam) S.onParam();
        }, (v) => v.toFixed(2) + ' m');

        /* ---- readouts ---- */
        const rI = api.SU.readout(api.readouts, 'I = r²', '—');
        const rW = api.SU.readout(api.readouts, 'ω = L/I', '—');
        const rK = api.SU.readout(api.readouts, 'K = ½Iω²', '—');

        const omegaAt = (r) => L0 / (r * r);

        /* ---- physics: verbatim from the original bench ---- */
        function advance(h) {
          S.t += h;
          S.ang += omegaAt(S.r) * h;
        }

        function sample() {
          api.graphs[0].push({ t: S.t, theta: (S.ang * 180) / Math.PI });
        }

        function sync() {
          const r = S.r,
            I = r * r,
            w = omegaAt(r);
          rI.set(I.toFixed(2) + ' kg·m²');
          rW.set(w.toFixed(2) + ' rad/s');
          rK.set((0.5 * I * w * w).toFixed(2) + ' J');
        }

        /* ---- the bench-wide sweep: what the spin rate must be for every arm
           radius, and the angular momentum that never changes. ---- */
        function rebuildSweep() {
          const G = api.graphs[1];
          if (!G) return;
          G.clear();
          for (let r = 0.2; r <= 0.9001; r += 0.01) {
            const rr = +r.toFixed(2);
            G.push({ r: rr, omega: omegaAt(rr), L: L0 });
          }
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawLedger();
          else drawRink();
        }

        function drawRink() {
          const r = S.r,
            I = r * r,
            w = omegaAt(r);
          const cx = W / 2,
            cy = H / 2 + 10;
          g.strokeStyle = '#33415c';
          g.lineWidth = 1;
          g.beginPath();
          g.arc(cx, cy, r * 55, 0, 7);
          g.stroke();
          g.save();
          g.translate(cx, cy);
          g.rotate(S.ang);
          g.fillStyle = '#22d3ee';
          g.beginPath();
          g.arc(0, 0, 18, 0, 7);
          g.fill();
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc(r * 55, 0, 10, 0, 7);
          g.fill();
          g.beginPath();
          g.arc(-r * 55, 0, 10, 0, 7);
          g.fill();
          g.restore();
          ncLabel(g, cx - 16, cy - 44, 'Iω = const', '#38bdf8');
          g.fillStyle = '#6b7a99';
          g.font = '11px "DM Mono", monospace';
          g.fillText('Arms in → I↓ → spin faster', 12, 18);
          api.pxLabel(
            g,
            W - 250,
            18,
            'I = ' + I.toFixed(2) + ' kg·m² · ω = ' + w.toFixed(2) + ' rad/s · L = ' + L0.toFixed(2),
            'rgba(34,211,238,0.9)'
          );
          api.pxLabel(g, 20, H - 18, 'θ = ' + ((S.ang * 180) / Math.PI).toFixed(0) + '° turned', 'rgba(232,237,247,0.7)');
        }

        function drawLedger() {
          const r = S.r,
            I = r * r,
            w = omegaAt(r),
            KE = 0.5 * I * w * w;
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
          /* radius ruler, 0.2 m … 0.9 m */
          const rx = 40,
            rw = W - 80,
            ry = H - 46;
          g.strokeStyle = '#33415c';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(rx, ry);
          g.lineTo(rx + rw, ry);
          g.stroke();
          for (let q = 0.2; q <= 0.9001; q += 0.1) {
            const xx = rx + ((q - 0.2) / 0.7) * rw;
            g.strokeStyle = '#475569';
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(xx, ry);
            g.lineTo(xx, ry + 6);
            g.stroke();
            g.fillStyle = '#6b7a99';
            g.font = '9px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText(q.toFixed(1), xx, ry + 18);
          }
          g.textAlign = 'left';
          const mx = rx + ((r - 0.2) / 0.7) * rw;
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.moveTo(mx, ry - 6);
          g.lineTo(mx + 6, ry - 16);
          g.lineTo(mx - 6, ry - 16);
          g.closePath();
          g.fill();
          api.pxLabel(g, mx - 16, ry - 22, 'r = ' + r.toFixed(2) + ' m', '#fbbf24');
          /* the ledger itself */
          api.pxLabel(g, 20, 22, 'ANGULAR-MOMENTUM LEDGER', 'rgba(232,237,247,0.7)');
          api.pxLabel(g, 20, 48, 'I = m·r² = ' + I.toFixed(3) + ' kg·m²', 'rgba(232,237,247,0.85)');
          api.pxLabel(g, 20, 70, 'ω = L₀ / I = ' + w.toFixed(2) + ' rad/s', 'rgba(232,237,247,0.85)');
          api.pxLabel(g, 20, 92, 'K = ½Iω² = ' + KE.toFixed(2) + ' J', 'rgba(232,237,247,0.85)');
          api.pxLabel(
            g,
            20,
            122,
            'L = I·ω = ' + I.toFixed(3) + ' × ' + w.toFixed(3) + ' = ' + (I * w).toFixed(3) + ' kg·m²/s',
            'rgba(52,211,153,0.95)'
          );
          api.pxLabel(g, 20, 146, 'L₀ = 1.28 kg·m²/s — the same at every r', 'rgba(52,211,153,0.8)');
          api.pxLabel(
            g,
            20,
            170,
            'halve r → I ÷ 4 → ω × 4 → K × 4 (the energy comes from the arms)',
            'rgba(251,191,36,0.9)'
          );
        }

        /* ---- pump ---- */
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
        }

        function reset() {
          S.t = 0;
          S.ang = 0;
          acc = 0;
          api.graphs[0].clear();
          rebuildSweep();
          sync();
        }

        rebuildSweep();
        sync();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sR.set(S.r);
            S.r = sR.get();
            sync();
            if (S.onParam) S.onParam();
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
        const r = S.r,
          I = r * r,
          w = (0.64 * 2) / (r * r);
        return {
          t: S.t,
          r,
          I,
          omega: w,
          L: I * w,
          KE: 0.5 * I * w * w,
          state: { ang: +S.ang.toFixed(6) }
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
          unit: '°',
          quantity: 'turn angle',
          absFloor: 0.2,
          rel: 0.1,
          context() {
            const w = (0.64 * 2) / (S.r * S.r);
            return {
              r: S.r,
              w,
              paramsText: 'r = ' + S.r.toFixed(2) + ' m, ω = ' + w.toFixed(2) + ' rad/s'
            };
          },
          targetTime: () => TARGET,
          question() {
            return (
              'Predict first: through how many degrees has the skater turned after ' +
              TARGET.toFixed(1) +
              ' s with the arms at r = ' +
              S.r.toFixed(2) +
              ' m?'
            );
          },
          observe() {
            const hit = api.graphs[0].valueAt('theta', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const L0 = 1.28;
            const I = ctx.r * ctx.r;
            const w = L0 / I;
            return (
              'The angular momentum L = Iω = 1.28 kg·m²/s is fixed, so at r = ' +
              ctx.r.toFixed(2) +
              ' m the moment of inertia is I = mr² = ' +
              I.toFixed(3) +
              ' kg·m² and the spin rate must be ω = L₀/I = ' +
              w.toFixed(2) +
              ' rad/s. Constant spin means the turn angle grows linearly, θ = ω·t = ' +
              w.toFixed(2) +
              ' × ' +
              TARGET.toFixed(1) +
              ' = ' +
              (w * TARGET).toFixed(2) +
              ' rad = ' +
              ((w * TARGET * 180) / Math.PI).toFixed(1) +
              '°. Halving the radius would divide I by four and multiply ω by four — the same angular momentum, four times the spin, and the extra kinetic energy came out of the arms.'
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
        S.onParam = () => {
          pred.refresh();
        };
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);

/* 11th — Stress–Strain */
Sims.register(
  'ncert11-solids',
  'Stress–Strain Curve (Class 11 Solids)',
  'Steel Y≈2×10¹¹ Pa vs rubber ~10⁷ Pa.',
  '🧱',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ncert11-solids',
      title: 'Stress–Strain Bench',
      desc: 'Every structural material is reduced to one curve on a tensile-testing machine: pull a specimen at a known rate, measure the force, and divide by the cross-section to get stress. The slope of the first straight part of that curve is Young’s modulus — about 200 GPa for steel and 10 000 times softer for rubber. The same bench is what qualifies a bridge cable or a spacecraft strut.',
      icon: '🧱',
      topic: 'Mechanical Properties of Solids',
      level: 'Grade 11',
      appKey: 'ncert11-solids',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Tensile rig' },
        { id: 'science', label: 'Stress–strain curve' }
      ],
      presets: [
        {
          label: 'Steel, 2 % strain',
          apply: (s) => {
            s.mat = 0;
            s.eps = 0.02;
          }
        },
        {
          label: 'Steel, 4 % strain',
          apply: (s) => {
            s.mat = 0;
            s.eps = 0.04;
          }
        },
        {
          label: 'Rubber, 4 % strain',
          apply: (s) => {
            s.mat = 1;
            s.eps = 0.04;
          }
        },
        {
          label: 'Rubber, 12 % strain',
          apply: (s) => {
            s.mat = 1;
            s.eps = 0.12;
          }
        },
        {
          label: 'Steel, past yield',
          apply: (s) => {
            s.mat = 0;
            s.eps = 0.1;
          }
        }
      ],
      graphs: [
        {
          title: 'Stress σ against strain ε — the linear law and the response the rig draws',
          xLabel: 'Strain ε',
          xUnit: '',
          xKey: 'eps',
          yLabel: 'σ',
          yUnit: 'MPa',
          height: 128,
          series: [
            { id: 'sigma', label: 'σ = Y·ε (linear law)', unit: 'MPa', color: '#22d3ee' },
            { id: 'drawn', label: 'drawn material response', unit: 'MPa', color: '#fbbf24' }
          ]
        },
        {
          title: 'Young modulus E = σ/ε — flat while the material stays linear',
          xLabel: 'Strain ε',
          xUnit: '',
          xKey: 'eps',
          yLabel: 'E',
          yUnit: 'GPa',
          height: 128,
          series: [{ id: 'E', label: 'E = σ/ε', unit: 'GPa', color: '#34d399' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.mat = 0; /* 0 = steel, 1 = rubber */
        S.eps = 0.04;

        const steel = () => S.mat === 0;
        const Y = () => (steel() ? 2e11 : 1e7);
        const sig = () => Y() * S.eps;

        /* ---- controls (slider order: material, strain) ---- */
        const sMat = api.SU.slider(api.panel, 'Material', 0, 1, 1, 0, (v) => {
          S.mat = v;
          rebuild();
          sync();
          if (S.onParam) S.onParam();
        }, (v) => (v ? 'Rubber' : 'Steel'));
        const sEps = api.SU.slider(api.panel, 'Strain ε', 0, 0.12, 0.005, 0.04, (v) => {
          S.eps = v;
          sync();
          if (S.onParam) S.onParam();
        }, (v) => v.toFixed(3));

        /* ---- readouts ---- */
        const rS = api.SU.readout(api.readouts, 'Stress σ', '—');
        const rY = api.SU.readout(api.readouts, 'Y', '—');
        const rE = api.SU.readout(api.readouts, 'E = σ/ε', '—');

        /* The bench draws a richer response than the linear law: steel yields
           and then hardens, rubber curves as it stiffens. That drawn law is
           transcribed exactly, because it is what the canvas puts on screen. */
        function drawnStress(e) {
          const y = Y();
          if (steel()) {
            if (e < 0.01) return y * e;
            if (e < 0.06) return y * 0.01 + y * 0.08 * (e - 0.01);
            return y * 0.01 + y * 0.08 * 0.05 - y * 0.02 * (e - 0.06);
          }
          return (y * e) / (1 + e * 8);
        }

        function sync() {
          const s = sig();
          rS.set((s / 1e6).toFixed(1) + ' MPa');
          rY.set(steel() ? '200 GPa' : '0.01 GPa');
          rE.set(S.eps > 0 ? (s / S.eps / 1e9).toFixed(3) + ' GPa' : '—');
        }

        /* ---- the sweep the POR panel reads: the whole curve, sampled ---- */
        function rebuild() {
          const G0 = api.graphs[0],
            G1 = api.graphs[1];
          const y = Y();
          if (G0) {
            G0.clear();
            for (let i = 0; i <= 120; i++) {
              const e = +(i / 1000).toFixed(3);
              G0.push({ eps: e, sigma: (y * e) / 1e6, drawn: drawnStress(e) / 1e6 });
            }
          }
          if (G1) {
            G1.clear();
            for (let i = 1; i <= 120; i++) {
              const e = +(i / 1000).toFixed(3);
              G1.push({ eps: e, E: y / 1e9 });
            }
          }
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawCurve();
          else drawRig();
        }

        function axes() {
          const ox = 50,
            oy = H - 40,
            pw = W - 70,
            ph = H - 70;
          g.strokeStyle = '#26314a';
          g.lineWidth = 1;
          g.strokeRect(ox, oy - ph, pw, ph);
          g.strokeStyle = '#475569';
          g.beginPath();
          g.moveTo(ox, oy);
          g.lineTo(ox + pw, oy);
          g.moveTo(ox, oy);
          g.lineTo(ox, oy - ph);
          g.stroke();
          g.fillStyle = '#9aa8c3';
          g.font = '11px "DM Mono", monospace';
          g.fillText('strain ε', ox + pw - 46, oy + 14);
          g.fillText('stress σ', ox - 36, oy - ph + 12);
          return { ox, oy, pw, ph };
        }

        function drawRig() {
          const A = 1e-4; /* 1 cm² specimen — stated so the force is honest */
          const y = Y(),
            s = sig(),
            F = s * A;
          const cy = H * 0.52,
            L0 = 150,
            MAG = 8;
          const stretch = L0 * (1 + S.eps * MAG);
          const x0 = 70,
            x1 = x0 + stretch;
          /* rail */
          g.strokeStyle = '#26314a';
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(20, cy + 42);
          g.lineTo(W - 20, cy + 42);
          g.stroke();
          /* specimen */
          g.fillStyle = steel() ? '#38bdf8' : '#fbbf24';
          g.globalAlpha = 0.85;
          g.fillRect(x0, cy - 9, stretch, 18);
          g.globalAlpha = 1;
          /* grips */
          g.fillStyle = '#1b2740';
          g.fillRect(x0 - 22, cy - 34, 22, 68);
          g.fillRect(x1, cy - 34, 22, 68);
          g.strokeStyle = '#475569';
          g.lineWidth = 1;
          g.strokeRect(x0 - 22, cy - 34, 22, 68);
          g.strokeRect(x1, cy - 34, 22, 68);
          /* pull arrow */
          api.pxArrow(g, x1 + 22, cy, 64, 0, '#34d399', 3);
          api.pxLabel(g, x1 + 24, cy - 12, 'F = ' + (F / 1000).toFixed(0) + ' kN', '#34d399');
          /* dimension */
          g.strokeStyle = 'rgba(154,168,195,.5)';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x0, cy + 52);
          g.lineTo(x1, cy + 52);
          g.stroke();
          api.pxLabel(g, x0, cy + 66, 'L₀ = 100 mm', 'rgba(154,168,195,0.9)');
          api.pxLabel(g, x1 - 70, cy + 66, 'L = 100(1+ε) mm', 'rgba(154,168,195,0.9)');
          api.pxLabel(g, 20, 22, 'PHYSIX TENSILE RIG', 'rgba(232,237,247,0.7)');
          api.pxLabel(
            g,
            W - 250,
            22,
            'σ = ' + (s / 1e6).toFixed(1) + ' MPa · Y = ' + (y / 1e9).toFixed(3) + ' GPa',
            'rgba(34,211,238,0.9)'
          );
          api.pxLabel(
            g,
            20,
            H - 18,
            'strain drawn ' + MAG + '× so it is visible · section A = 1 cm²',
            'rgba(251,191,36,0.85)'
          );
        }

        function drawCurve() {
          const { ox, oy, pw, ph } = axes();
          const y = Y();
          const pts = 100;
          g.strokeStyle = steel() ? '#38bdf8' : '#fbbf24';
          g.lineWidth = 3;
          g.beginPath();
          for (let i = 0; i <= pts; i++) {
            const e = (i / pts) * 0.12;
            const s = drawnStress(e);
            const x = ox + (e / 0.12) * pw,
              yy = oy - Math.min(1, s / (y * 0.02)) * ph * 0.92;
            i ? g.lineTo(x, yy) : g.moveTo(x, yy);
          }
          g.stroke();
          const ex = ox + (S.eps / 0.12) * pw,
            ey = oy - Math.min(1, (y * S.eps) / (y * 0.02)) * ph * 0.92;
          g.fillStyle = '#f87171';
          g.beginPath();
          g.arc(ex, ey, 6, 0, 7);
          g.fill();
          api.pxLabel(g, ox + 8, 22, 'Y = σ/ε', 'rgba(232,237,247,0.8)');
          api.pxLabel(
            g,
            20,
            42,
            steel() ? 'Steel — elastic, then yielding, then hardening' : 'Rubber — it stiffens as it is stretched',
            'rgba(154,168,195,0.95)'
          );
          api.pxLabel(
            g,
            20,
            62,
            'red marker = the readout law σ = Y·ε; the curve is the drawn response',
            'rgba(251,191,36,0.9)'
          );
          api.pxLabel(
            g,
            W - 250,
            22,
            'ε = ' + S.eps.toFixed(3) + ' · σ = ' + (sig() / 1e6).toFixed(1) + ' MPa',
            'rgba(34,211,238,0.9)'
          );
        }

        /* ---- pump: this bench is static, so the integrator only keeps the
           frame honest and never advances anything. ---- */
        function update(dt) {
          acc += dt;
          if (acc > FIXED) acc = 0;
        }

        function reset() {
          acc = 0;
          rebuild();
          sync();
        }

        rebuild();
        sync();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sMat.set(S.mat);
            sEps.set(S.eps);
            S.mat = sMat.get();
            S.eps = sEps.get();
            rebuild();
            sync();
            if (S.onParam) S.onParam();
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
        const steel = S.mat === 0,
          eps = S.eps,
          Y = steel ? 2e11 : 1e7,
          stress = Y * eps;
        return {
          material: steel ? 'steel' : 'rubber',
          strain: eps,
          Y,
          stress,
          E: eps > 0 ? stress / eps : null,
          E_GPa: +(Y / 1e9).toFixed(3),
          sigmaMPa: +(stress / 1e6).toFixed(4)
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'sigma',
          unit: 'MPa',
          quantity: 'stress',
          absFloor: 1,
          context() {
            return {
              mat: S.mat === 0 ? 'steel' : 'rubber',
              eps: S.eps,
              Y: S.mat === 0 ? 2e11 : 1e7,
              paramsText: (S.mat === 0 ? 'steel' : 'rubber') + ', ε = ' + S.eps.toFixed(3)
            };
          },
          question() {
            return (
              'Predict first: what stress σ does this ' +
              (S.mat === 0 ? 'steel' : 'rubber') +
              ' specimen carry at a strain of ε = ' +
              S.eps.toFixed(3) +
              '?'
            );
          },
          observe() {
            const hit = api.graphs[0].valueAt('sigma', S.eps);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'Inside the elastic region a solid obeys Hooke’s law: σ = Y·ε. For ' +
              ctx.mat +
              ' the modulus is Y = ' +
              (ctx.Y / 1e9).toFixed(3) +
              ' GPa, so at ε = ' +
              ctx.eps.toFixed(3) +
              ' the stress is ' +
              (ctx.Y / 1e9).toFixed(3) +
              ' × 10⁹ Pa × ' +
              ctx.eps.toFixed(3) +
              ' = ' +
              (ctx.Y * ctx.eps / 1e6).toFixed(1) +
              ' MPa. The second curve on the graph is the material response the rig draws: steel yields and then hardens, while rubber stiffens as it is stretched, so beyond the elastic limit the simple law σ = Y·ε is no longer the whole story.'
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

/* 11th — Bernoulli Venturi */
Sims.register(
  'ncert11-venturi',
  'Bernoulli Venturi (Class 11 Fluids)',
  'A₁v₁=A₂v₂. Faster → lower pressure. Lift = ΔP×A.',
  '💧',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ncert11-venturi',
      title: 'Venturi & Bernoulli Rig',
      desc: 'Squeeze the flow and the pressure falls — that is the whole reason an aerofoil makes lift and a carburettor makes a spray. The same stream that is squeezed must speed up (A₁v₁ = A₂v₂), and the energy it gains in speed comes straight out of the pressure (½ρv₂² = ½ρv₁² + ΔP). Engineers use this every day: wind tunnels, atomisers, aspirators, pitot tubes.',
      icon: '💧',
      topic: 'Fluid Mechanics',
      level: 'Grade 11',
      appKey: 'ncert11-venturi',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Venturi tube' },
        { id: 'science', label: 'Energy ledger' }
      ],
      presets: [
        {
          label: 'Gentle constriction',
          apply: (s) => {
            s.v1 = 2.5;
            s.ratio = 1.5;
          }
        },
        {
          label: 'Carburettor jet',
          apply: (s) => {
            s.v1 = 3;
            s.ratio = 3;
          }
        },
        {
          label: 'Wind-tunnel throat',
          apply: (s) => {
            s.v1 = 5;
            s.ratio = 2;
          }
        },
        {
          label: 'Narrow throat',
          apply: (s) => {
            s.v1 = 4;
            s.ratio = 3.5;
          }
        },
        {
          label: 'Slow and wide',
          apply: (s) => {
            s.v1 = 1;
            s.ratio = 3.5;
          }
        }
      ],
      graphs: [
        {
          title: 'Pressure drop ΔP against inlet speed v₁',
          xLabel: 'Inlet speed v₁',
          xUnit: 'm/s',
          xKey: 'v1',
          yLabel: 'ΔP',
          yUnit: 'Pa',
          height: 128,
          series: [{ id: 'dP', label: 'ΔP = ½ρ(v₂²−v₁²)', unit: 'Pa', color: '#22d3ee' }]
        },
        {
          title: 'Throat speed v₂ against constriction ratio',
          xLabel: 'Constriction ratio A₁/A₂',
          xUnit: '',
          xKey: 'ratio',
          yLabel: 'v₂',
          yUnit: 'm/s',
          height: 128,
          series: [{ id: 'v2', label: 'v₂ = v₁·ratio', unit: 'm/s', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.v1 = 2.5;
        S.ratio = 2;
        S.t = 0;
        S.ph = 0;

        const RHO = 1000;

        /* ---- controls (slider order: speed, constriction) ---- */
        const sV1 = api.SU.slider(api.panel, 'Speed v₁ (m/s)', 1, 6, 0.5, 2.5, (v) => {
          S.v1 = v;
          rebuild();
          sync();
          if (S.onParam) S.onParam();
        }, (v) => v.toFixed(1) + ' m/s');
        const sRatio = api.SU.slider(api.panel, 'Constriction', 1.2, 3.5, 0.1, 2, (v) => {
          S.ratio = v;
          rebuild();
          sync();
          if (S.onParam) S.onParam();
        }, (v) => 'A₁/A₂ = ' + v.toFixed(1));

        /* ---- readouts ---- */
        const rV2 = api.SU.readout(api.readouts, 'v₂', '—');
        const rDP = api.SU.readout(api.readouts, 'ΔP', '—');
        const rL = api.SU.readout(api.readouts, 'Lift hint', '—');

        const v2At = () => S.v1 * S.ratio;
        const dPAt = (v1, ratio) => 0.5 * RHO * ((v1 * ratio) ** 2 - v1 * v1);

        /* Continuity + Bernoulli are closed-form in the two sliders, so advance
           only walks the flow animation's clock. */
        function advance(h) {
          S.t += h;
          S.ph += h * 3;
        }

        function sync() {
          const v2 = v2At(),
            dP = dPAt(S.v1, S.ratio);
          rV2.set(v2.toFixed(2) + ' m/s');
          rDP.set((dP / 1000).toFixed(1) + ' kPa');
          rL.set('↑ ' + (dP * 0.02).toFixed(0) + ' N (demo)');
        }

        /* ---- the sweeps the POR panel reads ---- */
        function rebuild() {
          const G0 = api.graphs[0],
            G1 = api.graphs[1];
          if (G0) {
            G0.clear();
            for (let i = 0; i <= 100; i++) {
              const v1 = +(1 + i * 0.05).toFixed(2);
              G0.push({ v1, dP: dPAt(v1, S.ratio) });
            }
          }
          if (G1) {
            G1.clear();
            for (let i = 0; i <= 46; i++) {
              const ratio = +(1.2 + i * 0.05).toFixed(2);
              G1.push({ ratio, v2: S.v1 * ratio });
            }
          }
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawLedger();
          else drawTube();
        }

        function tubeGeom() {
          const ratio = S.ratio;
          return {
            y0: H / 2,
            h1: 70,
            h2: 70 / ratio,
            x0: 30,
            x1: Math.min(160, W * 0.36),
            x2: Math.min(300, W * 0.66),
            x3: W - 30
          };
        }

        function drawTube() {
          const { y0, h1, h2, x0, x1, x2, x3 } = tubeGeom();
          g.fillStyle = '#0f1a2e';
          g.strokeStyle = '#3a4a6a';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(x0, y0 - h1 / 2);
          g.lineTo(x1, y0 - h1 / 2);
          g.lineTo(x2, y0 - h2 / 2);
          g.lineTo(x3, y0 - h2 / 2);
          g.lineTo(x3, y0 + h2 / 2);
          g.lineTo(x2, y0 + h2 / 2);
          g.lineTo(x1, y0 + h1 / 2);
          g.lineTo(x0, y0 + h1 / 2);
          g.closePath();
          g.fill();
          g.stroke();
          g.fillStyle = 'rgba(34,211,238,.7)';
          for (let i = 0; i < 18; i++) {
            const prog = (S.ph * 0.7 + i * 0.31) % 1;
            const seg = prog < 0.45 ? prog / 0.45 : 0.45 + (prog - 0.45) / 0.55;
            let x, yw;
            if (seg < 0.5) {
              const tt = seg / 0.5;
              x = x0 + (x1 - x0) * tt;
              yw = h1;
            } else {
              const tt = (seg - 0.5) / 0.5;
              x = x2 + (x3 - x2) * tt;
              yw = h2;
            }
            const y = y0 + Math.sin(S.ph * 2 + i) * 6;
            g.beginPath();
            g.arc(x, y, 3, 0, 7);
            g.fill();
          }
          ncLabel(g, x0 + 8, y0 - h1 / 2 - 8, 'A₁ v₁', '#9aa8c3');
          ncLabel(g, x2 + 8, y0 - h2 / 2 - 8, 'A₂ v₂', '#9aa8c3');
          g.strokeStyle = '#38bdf8';
          g.lineWidth = 10;
          g.beginPath();
          g.moveTo(x1 + 22, y0 - h1 / 2 - 26);
          g.lineTo(x1 + 22, y0 - h1 / 2 + 12);
          g.stroke();
          g.strokeStyle = '#fbbf24';
          g.lineWidth = 10;
          g.beginPath();
          g.moveTo(x2 + 18, y0 - h2 / 2 - 26);
          g.lineTo(x2 + 18, y0 - h2 / 2 + 12);
          g.stroke();
          g.fillStyle = '#6b7a99';
          g.font = '11px "DM Mono", monospace';
          g.fillText('P high', x1 + 8, y0 - h1 / 2 - 32);
          g.fillText('P low', x2 + 6, y0 - h2 / 2 - 32);
          api.pxLabel(g, 20, 22, 'PHYSIX VENTURI TUBE', 'rgba(232,237,247,0.7)');
          api.pxLabel(
            g,
            W - 250,
            22,
            'v₁ = ' + S.v1.toFixed(1) + ' m/s → v₂ = ' + v2At().toFixed(2) + ' m/s',
            'rgba(34,211,238,0.9)'
          );
        }

        function drawLedger() {
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
          const v1 = S.v1,
            v2 = v2At(),
            kin1 = 0.5 * RHO * v1 * v1,
            kin2 = 0.5 * RHO * v2 * v2,
            dP = kin2 - kin1;
          /* Bernoulli along the tube: P + ½ρv² is the same in both sections. */
          const P1 = kin1 + dP,
            P2 = kin1;
          const total = P1 + kin1;
          const baseY = H - 54,
            maxH = 150;
          const colW = Math.min(70, W * 0.16),
            x1 = W * 0.3 - colW / 2,
            x2 = W * 0.7 - colW / 2;
          const bar = (x, pPart, kPart, labelP, labelK) => {
            const hp = (pPart / total) * maxH,
              hk = (kPart / total) * maxH;
            g.fillStyle = '#22d3ee';
            g.fillRect(x, baseY - hp, colW, hp);
            g.fillStyle = '#fbbf24';
            g.fillRect(x, baseY - hp - hk, colW, hk);
            g.strokeStyle = '#475569';
            g.lineWidth = 1;
            g.strokeRect(x, baseY - hp - hk, colW, hp + hk);
            g.fillStyle = '#9aa8c3';
            g.font = '10px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText(labelP, x + colW / 2, baseY + 14);
            g.fillText(labelK, x + colW / 2, baseY - hp - hk - 6);
            g.textAlign = 'left';
          };
          bar(x1, P1, kin1, 'P₁', '½ρv₁²');
          bar(x2, P2, kin2, 'P₂', '½ρv₂²');
          g.strokeStyle = 'rgba(52,211,153,.7)';
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(x1 - 18, baseY - maxH);
          g.lineTo(x2 + colW + 18, baseY - maxH);
          g.stroke();
          g.setLineDash([]);
          api.pxLabel(g, 20, 22, 'P + ½ρv² = const along the tube', 'rgba(232,237,247,0.85)');
          api.pxLabel(g, 20, 44, 'pressure falls → kinetic energy rises', 'rgba(154,168,195,0.95)');
          api.pxLabel(
            g,
            20,
            H - 24,
            'ΔP = ½ρ(v₂² − v₁²) = ' + dP.toFixed(0) + ' Pa  ·  A₁v₁ = A₂v₂ = ' + (S.ratio * v1).toFixed(2),
            'rgba(34,211,238,0.95)'
          );
          api.pxLabel(g, 20, H - 8, 'lift on a wing = ΔP × area above it', 'rgba(251,191,36,0.9)');
        }

        /* ---- pump ---- */
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

        function reset() {
          S.t = 0;
          S.ph = 0;
          acc = 0;
          rebuild();
          sync();
        }

        rebuild();
        sync();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sV1.set(S.v1);
            sRatio.set(S.ratio);
            S.v1 = sV1.get();
            S.ratio = sRatio.get();
            rebuild();
            sync();
            if (S.onParam) S.onParam();
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
        const v1 = S.v1,
          ratio = S.ratio,
          v2 = v1 * ratio,
          rho = 1000,
          A1 = 1,
          A2 = A1 / ratio;
        return {
          t: S.t,
          v1,
          ratio,
          v2,
          rho,
          A1,
          A2,
          dP: 0.5 * rho * (v2 * v2 - v1 * v1),
          continuityIn: A1 * v1,
          continuityOut: A2 * v2,
          state: { ph: +S.ph.toFixed(6) }
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'dP',
          unit: 'Pa',
          quantity: 'pressure drop',
          absFloor: 1,
          context() {
            return {
              v1: S.v1,
              ratio: S.ratio,
              paramsText: 'v₁ = ' + S.v1.toFixed(1) + ' m/s, A₁/A₂ = ' + S.ratio.toFixed(1)
            };
          },
          question() {
            return (
              'Predict first: what is the pressure drop ΔP across the constriction when the inlet runs at ' +
              S.v1.toFixed(1) +
              ' m/s?'
            );
          },
          observe() {
            const hit = api.graphs[0].valueAt('dP', S.v1);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const v2 = ctx.v1 * ctx.ratio;
            return (
              'Squeezing the tube to A₁/A₂ = ' +
              ctx.ratio.toFixed(1) +
              ' makes the same fluid go faster, so continuity gives v₂ = v₁·ratio = ' +
              ctx.v1.toFixed(1) +
              ' × ' +
              ctx.ratio.toFixed(1) +
              ' = ' +
              v2.toFixed(2) +
              ' m/s. Bernoulli then says the speed gain is paid for out of the pressure: ΔP = ½ρ(v₂² − v₁²) = ½ × 1000 × (' +
              v2.toFixed(2) +
              '² − ' +
              ctx.v1.toFixed(1) +
              '²) = ' +
              r.observed.toFixed(0) +
              ' Pa. That is why the wide section pushes hard and the throat does not, and it is the pressure difference an aerofoil turns into lift.'
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

/* DEPRECATED-CATALOGUE (sim-transform, Phase B): the "ns" entry embedded the
   external PHYSIX LAB site (physics-lab.vercel.app) inside PhysiX as an iframe.
   Removed from the catalogue per the approved transformation scope: the sims
   page now lists only PhysiX-built simulations. The markup survives in git
   history (2dcab11) if it is ever needed again. */

/* 11th — PV Diagram & Work */
Sims.register(
  'ncert11-pv',
  'Thermodynamics PV Cycle (Class 11)',
  'Work = area enclosed. Carnot η = 1−Tc/Th.',
  '🔥',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ncert11-pv',
      title: 'PV Cycle & Work',
      desc: 'Draw a gas on a pressure–volume plot and the work it does is the area under the curve; walk it round a closed loop and the work is the area the loop encloses. Every heat engine in the world — the steam turbine in a power station, the Brayton cycle in a jet engine — is this picture with different corners, and the efficiency of the best possible one is the Carnot number η = 1 − Tc/Th.',
      icon: '🔥',
      topic: 'Thermodynamics',
      level: 'Grade 11',
      appKey: 'ncert11-pv',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'PV diagram' },
        { id: 'science', label: 'Cycle analysis' }
      ],
      presets: [
        {
          label: 'Isothermal',
          apply: (s) => {
            s.c = 0;
          }
        },
        {
          label: 'Adiabatic',
          apply: (s) => {
            s.c = 1;
          }
        },
        {
          label: 'Isobaric rectangle',
          apply: (s) => {
            s.c = 2;
          }
        },
        {
          label: 'Carnot loop',
          apply: (s) => {
            s.c = 3;
          }
        }
      ],
      graphs: [
        {
          title: 'Work W = ΔP·ΔV against the volume span ΔV (pressure gap ΔP = 0.35)',
          xLabel: 'Volume span ΔV',
          xUnit: '',
          xKey: 'dV',
          yLabel: 'W',
          yUnit: 'plot units',
          height: 128,
          series: [{ id: 'work', label: 'W = ΔP·ΔV', unit: 'plot units', color: '#22d3ee' }]
        },
        {
          title: 'Carnot efficiency η = 1 − Tc/Th with Tc = 300 K',
          xLabel: 'Hot reservoir Th',
          xUnit: 'K',
          xKey: 'Th',
          yLabel: 'η',
          yUnit: '',
          height: 128,
          series: [{ id: 'eta', label: 'η = 1 − Tc/Th', unit: '', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.c = 0;

        /* Only a CLOSED cycle encloses a work area, so the four corner points of
           the two closed cycles (axis fractions: x = V, y = P) are declared once
           and shared by the drawing and the probe. The open curves (isothermal,
           adiabatic) have no enclosed area, and the readout must say so instead
           of implying a number. */
        const CLOSED = {
          2: [
            [0.18, 0.2],
            [0.78, 0.2],
            [0.78, 0.55],
            [0.18, 0.55]
          ],
          3: [
            [0.16, 0.22],
            [0.68, 0.24],
            [0.6, 0.62],
            [0.14, 0.58]
          ]
        };
        const shoelace = (pts) =>
          Math.abs(
            pts.reduce((s, p, i) => {
              const q = pts[(i + 1) % pts.length];
              return s + p[0] * q[1] - q[0] * p[1];
            }, 0) / 2
          );
        const NAMES = ['Isothermal', 'Adiabatic', 'Isobaric', 'Carnot'];
        const RULES = [
          'Isothermal: ΔU=0, PV=const',
          'Adiabatic: Q=0, PV^γ=const',
          'Isobaric: W=PΔV',
          'Carnot: 2 isotherms + 2 adiabats'
        ];

        /* ---- controls (slider order: cycle) ---- */
        const sC = api.SU.slider(api.panel, 'Cycle', 0, 3, 1, 0, (v) => {
          S.c = v;
          sync();
          if (S.onParam) S.onParam();
        }, (v) => NAMES[v]);

        /* ---- readouts ---- */
        const rW = api.SU.readout(api.readouts, 'W (area)', '—');
        const rE = api.SU.readout(api.readouts, 'Note', '—');

        function sync() {
          const c = S.c;
          rW.set(c === 2 || c === 3 ? 'W = ' + shoelace(CLOSED[c]).toFixed(3) + ' (plot units)' : 'Area = heat input');
          rE.set(RULES[c]);
        }

        /* ---- the sweeps the POR panel reads ---- */
        function rebuild() {
          const G0 = api.graphs[0],
            G1 = api.graphs[1];
          if (G0) {
            G0.clear();
            for (let i = 0; i <= 60; i++) {
              const dV = +(0.05 + i * 0.01).toFixed(2);
              G0.push({ dV, work: 0.35 * dV });
            }
          }
          if (G1) {
            G1.clear();
            for (let Th = 320; Th <= 1000; Th += 10) {
              G1.push({ Th, eta: 1 - 300 / Th });
            }
          }
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawAnalysis();
          else drawDiagram(false);
        }

        function diagram() {
          const ox = 60,
            oy = H - 40,
            pw = W - 80,
            ph = H - 70;
          g.strokeStyle = '#26314a';
          g.lineWidth = 1;
          g.strokeRect(ox, oy - ph, pw, ph);
          g.strokeStyle = '#475569';
          g.beginPath();
          g.moveTo(ox, oy);
          g.lineTo(ox + pw, oy);
          g.moveTo(ox, oy);
          g.lineTo(ox, oy - ph);
          g.stroke();
          g.fillStyle = '#9aa8c3';
          g.font = '11px "DM Mono", monospace';
          g.fillText('V →', ox + pw - 18, oy + 14);
          g.fillText('P ↑', ox - 18, oy - ph + 12);
          const c = S.c;
          const pts = [];
          if (c === 0) {
            for (let i = 0; i <= 60; i++) {
              const V = 0.2 + (i / 60) * 0.8,
                P = 1 / V;
              pts.push([ox + V * pw * 0.7, oy - P * ph * 0.32]);
            }
          } else if (c === 1) {
            for (let i = 0; i <= 60; i++) {
              const V = 0.2 + (i / 60) * 0.8,
                P = Math.pow(V, -1.4);
              pts.push([ox + V * pw * 0.7, oy - P * ph * 0.55]);
            }
          } else if (c === 2) {
            pts.push(...CLOSED[2].map(([u, v]) => [ox + u * pw, oy - v * ph]));
          } else {
            pts.push(...CLOSED[3].map(([u, v]) => [ox + u * pw, oy - v * ph]));
          }
          if (c === 2 || c === 3) {
            g.fillStyle = 'rgba(34,211,238,.14)';
            g.beginPath();
            pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
            g.closePath();
            g.fill();
          }
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 3;
          g.beginPath();
          pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
          if (c !== 2 && c !== 3) g.stroke();
          else {
            g.closePath();
            g.stroke();
          }
          g.fillStyle = '#fbbf24';
          pts.forEach((p) => {
            g.beginPath();
            g.arc(p[0], p[1], 4, 0, 7);
            g.fill();
          });
          return { ox, oy, pw, ph, pts };
        }

        function drawDiagram(emphasise) {
          const c = S.c;
          diagram();
          api.pxLabel(g, 20, 22, 'PHYSIX PV DIAGRAM', 'rgba(232,237,247,0.7)');
          api.pxLabel(g, 20, 42, RULES[c], 'rgba(154,168,195,0.95)');
          if (c === 2 || c === 3) {
            api.pxLabel(
              g,
              W - 230,
              22,
              'W = ∮P dV = ' + shoelace(CLOSED[c]).toFixed(3) + ' (plot units)',
              'rgba(34,211,238,0.95)'
            );
          } else {
            api.pxLabel(g, W - 230, 22, 'open curve — no enclosed area', 'rgba(251,191,36,0.95)');
          }
          if (emphasise) {
            api.pxLabel(g, 20, H - 62, 'W = ∮P dV — the area the loop encloses', 'rgba(232,237,247,0.85)');
            api.pxLabel(
              g,
              20,
              H - 42,
              'rectangle: ΔP·ΔV = 0.35 × 0.60 = 0.21  ·  Carnot loop: 0.183',
              'rgba(52,211,153,0.95)'
            );
            api.pxLabel(g, 20, H - 22, 'η = 1 − Tc/Th  (Tc = 300 K) — see the graph below', 'rgba(251,191,36,0.9)');
          }
        }

        function drawAnalysis() {
          drawDiagram(true);
        }

        /* ---- pump: this diagram is static, so nothing integrates. ---- */
        function update(dt) {
          acc += dt;
          if (acc > FIXED) acc = 0;
        }

        function reset() {
          acc = 0;
          rebuild();
          sync();
        }

        rebuild();
        sync();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sC.set(S.c);
            S.c = sC.get();
            sync();
            if (S.onParam) S.onParam();
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
        const c = S.c;
        const CLOSED = {
          2: [
            [0.18, 0.2],
            [0.78, 0.2],
            [0.78, 0.55],
            [0.18, 0.55]
          ],
          3: [
            [0.16, 0.22],
            [0.68, 0.24],
            [0.6, 0.62],
            [0.14, 0.58]
          ]
        };
        const shoelace = (pts) =>
          Math.abs(
            pts.reduce((s, p, i) => {
              const q = pts[(i + 1) % pts.length];
              return s + p[0] * q[1] - q[0] * p[1];
            }, 0) / 2
          );
        return {
          cycle: c,
          name: ['Isothermal', 'Adiabatic', 'Isobaric', 'Carnot'][c],
          closed: c === 2 || c === 3,
          area: c === 2 || c === 3 ? +shoelace(CLOSED[c]).toFixed(6) : null
        };
      },
      predict(api) {
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'work',
          unit: 'plot units',
          quantity: 'work done by the cycle',
          absFloor: 0.005,
          context() {
            return {
              dV: 0.6,
              dP: 0.35,
              paramsText: 'ΔP = 0.35, ΔV = 0.60 (the drawn isobaric rectangle)'
            };
          },
          question() {
            return 'Predict first: if the gas expands through ΔV = 0.60 at the drawn pressure gap of ΔP = 0.35, how much work does the cycle do?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('work', 0.6);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'The work done by a gas is W = ∮P dV — the area under the path on the P–V plot. For a rectangular cycle that area is simply the pressure gap times the volume span: W = ΔP·ΔV = 0.35 × 0.60 = ' +
              r.observed.toFixed(3) +
              ' plot units, which is exactly the number the Isobaric readout quotes. A slanted loop encloses less for the same spans — the Carnot loop on this bench comes to 0.183 — and the open isothermal and adiabatic curves enclose nothing at all, so for them the honest readout is "area = heat input". In a real plant the same area is the turbine work per kilogram of gas, and the best possible efficiency is the Carnot number η = 1 − Tc/Th.'
            );
          },
          onLock() {
            pred.reveal();
          },
          onReset() {
            pred.refresh();
          }
        });
        api.state.onParam = () => {
          pred.refresh();
        };
        pred.refresh();
        return pred;
      }
    }),
  { chrome: 'workstation' }
);
