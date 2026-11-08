import { SU } from './core.js';
import { Sims } from './sims-a.js';
import { attachTimeControls } from './sim-controls-helper.js';
import { Workstation } from './sim-ui.js';
import { createPrediction } from './prediction.js';
/* PhysiX Academy — Simulations Part D: efield, induction, lens */
('use strict');

/* ---------------- Electric field lines ---------------- */
Sims.register(
  'efield',
  'Electric Field Mapper',
  'Field lines from + to −; click to drop a test charge.',
  '⚡',
  (frame) =>
    Workstation.mount(frame, {
      id: 'efield',
      title: 'Electric Field Mapper',
      desc: 'An electrostatic precipitator, an ink-jet deflector and a photocopier all exploit one idea: charges make a field, and the field moves other charges. Trace the field lines and read |E| anywhere between the charges.',
      icon: '⚡',
      topic: 'Electromagnetism',
      level: 'Grade 11–12',
      appKey: 'efield',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Charge bench' },
        { id: 'science', label: 'Field map' }
      ],
      presets: [
        {
          label: 'Dipole +2 / −2',
          apply: (s) => {
            s.q1 = 2;
            s.q2 = -2;
          }
        },
        {
          label: 'Like pair +3 / +3',
          apply: (s) => {
            s.q1 = 3;
            s.q2 = 3;
          }
        },
        {
          label: 'Strong dipole +4 / −4',
          apply: (s) => {
            s.q1 = 4;
            s.q2 = -4;
          }
        },
        {
          label: 'Neutral pair 0 / 0',
          apply: (s) => {
            s.q1 = 0;
            s.q2 = 0;
          }
        }
      ],
      graphs: [
        {
          title: '|E| along the axis between the charges',
          xLabel: 'Position x',
          xUnit: 'px',
          xKey: 'x',
          yLabel: '|E|',
          yUnit: 'arb.',
          height: 128,
          series: [{ id: 'E', label: '|E|', unit: 'arb.', color: '#22d3ee' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;

        S.q1 = 2;
        S.q2 = -2;
        S.lines = [];
        S.probes = [];

        /* ---- physics: verbatim superposition from the original bench ---- */
        const chPos = () => [
          [W * 0.3, H / 2, S.q1],
          [W * 0.7, H / 2, S.q2]
        ];
        function fieldAt(x, y) {
          let ex = 0,
            ey = 0;
          chPos().forEach(([cx, cy, q]) => {
            const dx = x - cx,
              dy = y - cy,
              r2 = dx * dx + dy * dy || 40;
            const mag = (q * 200000) / r2;
            ex += (mag * dx) / Math.sqrt(r2);
            ey += (mag * dy) / Math.sqrt(r2);
          });
          return [ex, ey];
        }
        S.fieldAt = fieldAt;

        function trace() {
          const out = [];
          chPos().forEach(([cx, cy, q]) => {
            if (q <= 0) return;
            for (let i = 0; i < 16; i++) {
              const a = (i / 16) * 2 * Math.PI;
              let x = cx + Math.cos(a) * 12,
                y = cy + Math.sin(a) * 12;
              const pts = [[x, y]];
              for (let s = 0; s < 400; s++) {
                const [ex, ey] = fieldAt(x, y);
                const m = Math.hypot(ex, ey) || 1;
                x += (ex / m) * 4;
                y += (ey / m) * 4;
                pts.push([x, y]);
                if (x < -20 || x > W + 20 || y < -20 || y > H + 20) break;
                let hitNeg = false;
                chPos().forEach(([nx, ny, nq]) => {
                  if (nq < 0 && Math.hypot(x - nx, y - ny) < 12) hitNeg = true;
                });
                if (hitNeg) break;
              }
              out.push(pts);
            }
          });
          return out;
        }

        /* live sweep of |E| along the charge axis — the real data the POR
           panel reads, rebuilt on every parameter change. */
        function buildSweep() {
          const G = api.graphs[0];
          if (!G) return;
          G.clear();
          const y = H / 2;
          for (let x = 8; x <= W - 8; x += 6) {
            const [ex, ey] = fieldAt(x, y);
            G.push({ x, E: Math.hypot(ex, ey) });
          }
        }
        function retrace() {
          S.lines = trace();
          S.probes = [];
          buildSweep();
          if (S.onParam) S.onParam();
        }

        /* ---- controls (slider order q1, q2) ---- */
        const qFmt = (v) => (v > 0 ? '+' : '') + v;
        const sQ1 = api.SU.slider(api.panel, 'Left charge q₁', -4, 4, 1, 2, (v) => {
          S.q1 = v;
          retrace();
        }, qFmt);
        const sQ2 = api.SU.slider(api.panel, 'Right charge q₂', -4, 4, 1, -2, (v) => {
          S.q2 = v;
          retrace();
        }, qFmt);

        /* ---- readouts ---- */
        const rE = api.SU.readout(api.readouts, '|E| at cursor', '—');
        const rMid = api.SU.readout(api.readouts, '|E| at midpoint', '—');

        /* ---- canvas instruments: cursor meter + clickable test charges ----
           api.cv is the canvas element itself (not SU.canvas's {c,g,W,H}). */
        const c = api.cv;
        c.addEventListener('mousemove', (e) => {
          const rc = c.getBoundingClientRect();
          const [ex, ey] = fieldAt(e.clientX - rc.left, e.clientY - rc.top);
          rE.set(Math.hypot(ex, ey).toFixed(0));
        });
        c.addEventListener('click', (e) => {
          const rc = c.getBoundingClientRect();
          S.probes.push({ x: e.clientX - rc.left, y: e.clientY - rc.top, vx: 0, vy: 0, tr: [] });
        });

        function syncMid() {
          const [ex, ey] = fieldAt(W / 2, H / 2);
          rMid.set(Math.hypot(ex, ey).toFixed(1) + ' arb.');
        }

        /* test charges ride the field exactly as the original loop did */
        function update(dt) {
          S.probes.forEach((p) => {
            const [ex, ey] = fieldAt(p.x, p.y);
            p.vx += ex * dt * 0.02;
            p.vy += ey * dt * 0.02;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.tr.push([p.x, p.y]);
            if (p.tr.length > 60) p.tr.shift();
          });
          S.probes = S.probes.filter((p) => p.x > 10 && p.x < W - 10 && p.y > 10 && p.y < H - 10);
          syncMid();
        }

        /* ---- drawing ---- */
        function draw() {
          g.clearRect(0, 0, W, H);
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#0a1020');
          bg.addColorStop(1, '#070b16');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          if (api.getLayer() === 'science') drawMap();
          else drawBench();
        }

        function drawLines(alpha) {
          g.lineWidth = 1.3;
          S.lines.forEach((pts) => {
            g.strokeStyle = 'rgba(34,211,238,' + alpha + ')';
            g.beginPath();
            pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
            g.stroke();
            const mid = pts[Math.floor(pts.length / 2)];
            if (mid && pts.length > 6) {
              const prev = pts[Math.floor(pts.length / 2) - 2];
              const ang = Math.atan2(mid[1] - prev[1], mid[0] - prev[0]);
              g.save();
              g.translate(mid[0], mid[1]);
              g.rotate(ang);
              g.fillStyle = 'rgba(34,211,238,.8)';
              g.beginPath();
              g.moveTo(5, 0);
              g.lineTo(-3, -3.5);
              g.lineTo(-3, 3.5);
              g.fill();
              g.restore();
            }
          });
        }

        function drawProbes() {
          S.probes.forEach((p) => {
            g.strokeStyle = 'rgba(251,191,36,.7)';
            g.lineWidth = 1.5;
            g.beginPath();
            p.tr.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
            g.stroke();
            g.fillStyle = '#fbbf24';
            g.beginPath();
            g.arc(p.x, p.y, 4, 0, 7);
            g.fill();
          });
        }

        function drawCharges() {
          chPos().forEach(([cx, cy, q]) => {
            if (!q) return;
            g.fillStyle = q > 0 ? '#f87171' : '#6d5df6';
            g.beginPath();
            g.arc(cx, cy, 11, 0, 7);
            g.fill();
            g.fillStyle = '#fff';
            g.font = 'bold 13px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText(q > 0 ? '+' : '−', cx, cy + 5);
            g.textAlign = 'left';
          });
        }

        function drawBench() {
          drawLines(0.55);
          drawProbes();
          drawCharges();
          /* bench rail under the charge axis */
          g.strokeStyle = 'rgba(154,168,195,0.4)';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(W * 0.3 - 90, H / 2 + 46);
          g.lineTo(W * 0.7 + 90, H / 2 + 46);
          g.stroke();
          api.pxLabel(g, 20, 22, 'PHYSIX FIELD MAPPER', 'rgba(232,237,247,0.7)');
          api.pxLabel(g, 20, 40, 'click the map to drop a test charge', 'rgba(107,122,153,0.9)');
        }

        function drawMap() {
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
          drawLines(0.35);
          /* direction grid: arrow length fixed, brightness = |E| */
          for (let gx = 26; gx < W - 12; gx += 44) {
            for (let gy = 26; gy < H - 12; gy += 40) {
              let near = false;
              chPos().forEach(([cx, cy]) => {
                if (Math.hypot(gx - cx, gy - cy) < 18) near = true;
              });
              if (near) continue;
              const [ex, ey] = fieldAt(gx, gy);
              const m = Math.hypot(ex, ey);
              if (!m) continue;
              const ux = ex / m,
                uy = ey / m;
              const a = Math.min(0.85, 0.12 + Math.sqrt(m) / 12);
              g.strokeStyle = 'rgba(34,211,238,' + a.toFixed(2) + ')';
              g.lineWidth = 1.4;
              g.beginPath();
              g.moveTo(gx - ux * 6, gy - uy * 6);
              g.lineTo(gx + ux * 6, gy + uy * 6);
              g.stroke();
              g.beginPath();
              g.moveTo(gx + ux * 6, gy + uy * 6);
              g.lineTo(gx + ux * 3 - uy * 2.5, gy + uy * 3 + ux * 2.5);
              g.lineTo(gx + ux * 3 + uy * 2.5, gy + uy * 3 - ux * 2.5);
              g.closePath();
              g.fillStyle = 'rgba(34,211,238,' + a.toFixed(2) + ')';
              g.fill();
            }
          }
          /* midpoint target: the value the prediction panel asks about */
          g.strokeStyle = '#fbbf24';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(W / 2 - 7, H / 2);
          g.lineTo(W / 2 + 7, H / 2);
          g.moveTo(W / 2, H / 2 - 7);
          g.lineTo(W / 2, H / 2 + 7);
          g.stroke();
          api.pxLabel(g, W / 2 + 10, H / 2 - 10, 'midpoint', '#fbbf24');
          drawCharges();
          api.pxLabel(g, 20, 22, 'E = Σ k·q / r²  — fields superpose at every point', 'rgba(232,237,247,0.8)');
          api.pxLabel(g, 20, 40, 'arrows: direction exact · brightness ∝ |E|', 'rgba(107,122,153,0.9)');
        }

        retrace();
        syncMid();

        return {
          update,
          draw,
          reset: () => {
            retrace();
            syncMid();
          },
          onPreset() {
            sQ1.set(S.q1);
            sQ2.set(S.q2);
            retrace();
            syncMid();
          }
        };
      },
      probe(api) {
        const S = api.state;
        const center = S.fieldAt(api.W / 2, api.H / 2);
        return {
          q1: S.q1,
          q2: S.q2,
          W: api.W,
          H: api.H,
          nProbes: S.probes.length,
          eCenter: { x: +center[0].toFixed(3), y: +center[1].toFixed(3) },
          eMag: +Math.hypot(center[0], center[1]).toFixed(3)
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'E',
          unit: 'arb.',
          quantity: 'midpoint field strength',
          absFloor: 2,
          context() {
            return { q1: S.q1, q2: S.q2 };
          },
          question() {
            return 'Predict first: how strong is |E| exactly midway between the two charges (read the curve at the midpoint)?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('E', api.W / 2);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const a = 0.2 * api.W; /* the midpoint sits half-way between charges 0.2·W apart */
            const perUnit = 200000 / (a * a);
            const E = perUnit * Math.abs(ctx.q1 - ctx.q2);
            return (
              'Both charges sit the same distance a = 0.2·W = ' +
              a.toFixed(0) +
              ' px from that point, so each contributes k·q/a² = ' +
              perUnit.toFixed(2) +
              ' field units per unit charge, straight along the axis. Superposing, E = k·(q₁ − q₂)/a² = |' +
              ctx.q1 +
              ' − ' +
              ctx.q2 +
              '|·' +
              perUnit.toFixed(2) +
              ' ≈ ' +
              E.toFixed(1) +
              ' — which is why a neutral pair (q₁ = q₂) cancels exactly at the midpoint. Real use: ionisers in precipitators tune charge balance to kill or create exactly this field.'
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
/* ---------------- Electromagnetic induction ---------------- */
Sims.register(
  'induction',
  "Faraday's Induction",
  'Moving magnet → changing flux → EMF.',
  '🌀',
  (frame) =>
    Workstation.mount(frame, {
      id: 'induction',
      title: "Faraday's Induction",
      desc: 'Every generator on the grid is this bench, scaled up: a magnet sweeping past a coil changes the flux it threads, and the coil answers with ε = −N·dΦ/dt until the magnet stops moving.',
      icon: '🌀',
      topic: 'Electromagnetism',
      level: 'Grade 11–12',
      appKey: 'induction',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Generator rig' },
        { id: 'science', label: 'Faraday analysis' }
      ],
      presets: [
        {
          label: 'Slow approach',
          apply: (s) => {
            s.vs = 70;
            s.n = 8;
          }
        },
        {
          label: 'Fast pass',
          apply: (s) => {
            s.vs = 160;
            s.n = 8;
          }
        },
        {
          label: 'Many turns',
          apply: (s) => {
            s.vs = 70;
            s.n = 16;
          }
        },
        {
          label: 'Reversed',
          apply: (s) => {
            s.vs = -70;
            s.n = 8;
          }
        }
      ],
      graphs: [
        {
          title: 'Flux Φ(t) threading the coil',
          xLabel: 'Time',
          xUnit: 's',
          height: 128,
          yLabel: 'Φ',
          yUnit: 'mWb',
          series: [{ id: 'phi', label: 'Φ', unit: 'mWb', color: '#22d3ee' }]
        },
        {
          title: 'EMF ε(t) = −N·dΦ/dt',
          xLabel: 'Time',
          xUnit: 's',
          height: 128,
          yLabel: 'ε',
          yUnit: 'V',
          series: [{ id: 'emf', label: 'ε', unit: 'V', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        const coilX = () => W * 0.62;
        /* ---- physics: verbatim flux model from the original bench ---- */
        function fluxAt(x) {
          const d = Math.abs(x - coilX());
          return (9000 / (d * d + 900)) * Math.sign(coilX() - x || 1);
        }

        S.vs = 70; /* px/s, magnet velocity */
        S.n = 8; /* coil turns */
        S.mx = 60;
        S.t = 0;
        S.phi = fluxAt(60);
        S.phiPrev = fluxAt(60);
        S.emfSm = 0;
        S.emfRaw = 0;
        S.dphiDt = 0;
        S.emfTrace = [];

        /* ---- controls (slider order: velocity, turns) — live, like the original ---- */
        const sV = api.SU.slider(api.panel, 'Magnet velocity', -160, 160, 5, 70, (v) => {
          S.vs = v;
        }, (v) => v + ' px/s');
        const sN = api.SU.slider(api.panel, 'Coil turns N', 1, 20, 1, 8, (v) => {
          S.n = v;
        }, (v) => v.toFixed(0));

        /* ---- readouts ---- */
        const rPhi = api.SU.readout(api.readouts, 'Flux Φ', '—');
        const rEmf = api.SU.readout(api.readouts, 'EMF', '—');
        const rDir = api.SU.readout(api.readouts, 'Induced current', '—');

        function reset() {
          S.mx = 60;
          S.t = 0;
          /* Seed phiPrev with the flux the magnet actually has after the reset;
             the flux slope check depends on it. */
          S.phiPrev = fluxAt(60);
          S.phi = S.phiPrev;
          S.emfSm = 0;
          S.emfRaw = 0;
          S.dphiDt = 0;
          S.emfTrace = [];
          acc = 0;
          api.graphs.forEach((G) => G.clear());
          sync();
        }

        /* ---- integrator, verbatim ---- */
        function advance(h) {
          S.t += h;
          S.mx += S.vs * h;
          if (S.mx < 30) {
            S.mx = 30;
            S.vs = Math.abs(S.vs);
            sV.set(S.vs);
          }
          if (S.mx > W - 30) {
            S.mx = W - 30;
            S.vs = -Math.abs(S.vs);
            sV.set(S.vs);
          }
          const phi = fluxAt(S.mx);
          S.dphiDt = (phi - S.phiPrev) / Math.max(h, 0.001);
          S.emfRaw = -S.n * S.dphiDt;
          S.phiPrev = phi;
          S.phi = phi;
          S.emfSm += (S.emfRaw - S.emfSm) * 0.15;
          S.emfTrace.push(S.emfSm);
          if (S.emfTrace.length > 240) S.emfTrace.shift();
        }

        function sample() {
          const g0 = api.graphs[0],
            g1 = api.graphs[1];
          if (g0) g0.push({ t: S.t, phi: S.phi });
          if (g1) g1.push({ t: S.t, emf: S.emfSm });
        }

        function sync() {
          rPhi.set(S.phi.toFixed(2) + ' mWb');
          rEmf.set(S.emfSm.toFixed(2) + ' V');
          rDir.set(S.emfSm > 0.05 ? '↻ one way' : S.emfSm < -0.05 ? '↺ other way' : '— none');
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

        function coil(cy) {
          for (let i = -3; i <= 3; i++) {
            g.strokeStyle = '#9aa8c3';
            g.lineWidth = 3;
            g.beginPath();
            g.ellipse(coilX(), cy + i * 14, 10, 12, 0, 0, 7);
            g.stroke();
          }
        }

        function magnet(cy) {
          g.fillStyle = '#f87171';
          g.fillRect(S.mx - 34, cy - 11, 34, 22);
          g.fillStyle = '#e8edf7';
          g.font = 'bold 11px "DM Mono", monospace';
          g.fillText('N', S.mx - 22, cy + 4);
          g.fillStyle = '#34d399';
          g.fillRect(S.mx, cy - 11, 34, 22);
          g.fillStyle = '#04281c';
          g.fillText('S', S.mx + 12, cy + 4);
          /* field bridging the poles */
          g.strokeStyle = 'rgba(251,191,36,0.35)';
          g.lineWidth = 1.2;
          for (let k = -1; k <= 1; k++) {
            g.beginPath();
            g.moveTo(S.mx - 30, cy + k * 6);
            g.quadraticCurveTo(S.mx + 8, cy + k * 7 - 10, S.mx + 30, cy + k * 6);
            g.stroke();
          }
        }

        function drawRig() {
          const cy = H * 0.44;
          /* optical rail */
          g.fillStyle = 'rgba(255,255,255,0.06)';
          g.fillRect(24, cy + 62, W - 48, 8);
          /* coil + magnet */
          coil(cy);
          magnet(cy);
          /* induced current glyph, exactly the original trigger */
          if (Math.abs(S.emfSm) > 0.05) {
            g.fillStyle = '#22d3ee';
            g.font = 'bold 18px "DM Mono", monospace';
            g.textAlign = 'center';
            g.fillText(S.emfSm > 0 ? '↻' : '↺', coilX(), cy - 58);
            g.textAlign = 'left';
          }
          /* live wire to readouts */
          api.pxLabel(g, 20, 22, 'PHYSIX GENERATOR RIG', 'rgba(232,237,247,0.7)');
          api.pxLabel(g, W - 220, 22, 'N = ' + S.n + ' turns · v = ' + S.vs + ' px/s', 'rgba(34,211,238,0.9)');
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
          const cy = H * 0.44;
          /* flux Shading: how full the coil window is in flux units */
          const phi = fluxAt(S.mx);
          const fill = Math.min(1, Math.abs(phi) / 10);
          g.fillStyle = 'rgba(34,211,238,' + (0.05 + fill * 0.22).toFixed(2) + ')';
          g.fillRect(coilX() - 12, cy - 44, 24, 86);
          coil(cy);
          magnet(cy);
          /* velocity vector */
          api.pxArrow(g, S.mx, cy + 34, S.vs * 0.3, 0, '#fbbf24', 3);
          api.pxLabel(g, S.mx - 6, cy + 52, 'v', '#fbbf24');
          /* EMF strip — the original probe trace */
          const gx0 = 30,
            gyMid = H - 42;
          g.strokeStyle = '#26314a';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(gx0, gyMid);
          g.lineTo(W - 20, gyMid);
          g.stroke();
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 2;
          g.beginPath();
          S.emfTrace.forEach((v, i) => {
            const X = gx0 + (i / 240) * (W - 60),
              Y = gyMid - v * 24;
            i ? g.lineTo(X, Y) : g.moveTo(X, Y);
          });
          g.stroke();
          g.fillStyle = '#6b7a99';
          g.font = '10px "DM Mono", monospace';
          g.fillText('EMF(t)', gx0, H - 8);
          api.pxLabel(g, 20, 22, 'ε = −N·dΦ/dt  with  Φ(x) = 9000/(d²+900)·sign', 'rgba(232,237,247,0.8)');
          api.pxLabel(
            g,
            W - 260,
            22,
            'N·dΦ/dt = ' + (-S.emfRaw).toFixed(2) + ' mWb/s → ε = ' + S.emfRaw.toFixed(2) + ' V',
            'rgba(34,211,238,0.9)'
          );
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
            sN.set(S.n);
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
          mx: S.mx,
          vs: S.vs,
          n: S.n,
          phi: S.phi,
          emfRaw: S.emfRaw,
          dphiDt: S.dphiDt,
          emfSm: S.emfSm,
          state: { mx: +S.mx.toFixed(6) }
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
            const range = api.graphs[0].timeRange('phi');
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
          series: 'phi',
          unit: 'mWb',
          quantity: 'flux through the coil',
          absFloor: 0.02,
          context() {
            return {
              vs: S.vs,
              n: S.n,
              paramsText: 'v = ' + S.vs + ' px/s, N = ' + S.n + ' turns'
            };
          },
          targetTime: () => TARGET,
          question() {
            return 'Predict first: what flux Φ does the coil see at t = ' + TARGET.toFixed(1) + ' s?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('phi', TARGET);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const mx = 60 + ctx.vs * TARGET;
            const bounced = mx < 30 || mx > api.W - 30; /* the wall turns the magnet around */
            if (bounced) {
              return (
                'The magnet v = ' +
                ctx.vs +
                ' px/s runs past the bench wall before t = 3.0 s, so it has flipped around — the exact position comes off the Φ(t) trace on the graph. The rule is unchanged: Φ(x) = 9000/(d²+900), sign = which side of the coil the magnet is on, and ε = −N·dΦ/dt flips sign the moment dΦ/dt does.'
              );
            }
            const d = Math.abs(api.W * 0.62 - mx);
            const phi = 9000 / (d * d + 900);
            return (
              'At t = 3.0 s the magnet has moved 60 + v·3 = ' +
              mx.toFixed(0) +
              ' px, so its centre is d ≈ ' +
              d.toFixed(0) +
              ' px from the coil. Adding flux: Φ = 9000/(d²+900) ≈ ' +
              phi.toFixed(3) +
              ' mWb (sign: approaching from the far side of the coil gives ' +
              (phi >= 0 ? 'positive' : 'negative') +
              ' flux). Every generator works this inverse way: MOVE the flux, and the turns N multiply dΦ/dt, not Φ.'
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
/* ---------------- Converging lens bench ---------------- */
Sims.register(
  'lens',
  'Converging Lens Bench',
  'Rays never lie: real and virtual images.',
  '🔭',
  (frame) =>
    Workstation.mount(frame, {
      id: 'lens',
      title: 'Converging Lens Bench',
      desc: 'The same geometry that puts an image on a camera sensor, a projector screen or a magnifier: one converging lens, one object, and the thin-lens law deciding where and how the image lands.',
      icon: '🔭',
      topic: 'Optics',
      level: 'Grade 10–12',
      appKey: 'lens',
      height: 300,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Optical bench' },
        { id: 'science', label: 'Ray construction' }
      ],
      presets: [
        {
          label: 'Portrait (projector)',
          apply: (s) => {
            s.f = 90;
            s.u = 180;
            s.oh = 45;
          }
        },
        {
          label: 'Macro close-up',
          apply: (s) => {
            s.f = 90;
            s.u = 110;
            s.oh = 45;
          }
        },
        {
          label: 'Telephoto',
          apply: (s) => {
            s.f = 150;
            s.u = 300;
            s.oh = 45;
          }
        },
        {
          label: 'Magnifier (virtual)',
          apply: (s) => {
            s.f = 90;
            s.u = 60;
            s.oh = 45;
          }
        }
      ],
      graphs: [
        {
          title: 'Image distance v vs object distance u',
          xLabel: 'Object distance u',
          xUnit: 'px',
          xKey: 'u',
          yLabel: 'v',
          yUnit: 'px',
          height: 128,
          series: [{ id: 'v', label: 'v', unit: 'px', color: '#22d3ee' }]
        },
        {
          title: 'Magnification m = −v/u',
          xLabel: 'Object distance u',
          xUnit: 'px',
          xKey: 'u',
          yLabel: 'm',
          yUnit: '×',
          height: 128,
          series: [{ id: 'm', label: 'm', unit: '×', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;

        S.f = 90; /* px focal length */
        S.u = 180; /* px object distance */
        S.oh = 45; /* px object height */

        /* ---- optics: verbatim thin-lens law from the original bench ---- */
        function model() {
          const f = S.f,
            dobj = S.u;
          const di = 1 / (1 / f - 1 / dobj);
          const m = -di / dobj;
          return { f, dobj, oh: S.oh, di, m };
        }

        /* Replot the bench's own model over the whole u range — this is the
           data the prediction panel reads; no invented tables. */
        function sweep() {
          const gV = api.graphs[0],
            gM = api.graphs[1];
          if (gV) gV.clear();
          if (gM) gM.clear();
          const f = S.f;
          for (let u = 30; u <= 300; u += 5) {
            if (Math.abs(1 / f - 1 / u) < 1e-6) continue;
            const v = 1 / (1 / f - 1 / u);
            if (Math.abs(v) > 2000) continue;
            if (gV) gV.push({ u, v });
            if (gM) gM.push({ u, m: -(v / u) });
          }
        }

        /* ---- controls (slider order: f, u, height) ---- */
        const sF = api.SU.slider(api.panel, 'Focal length f (px)', 50, 150, 5, 90, (v) => {
          S.f = v;
          sweep();
          if (S.onParam) S.onParam();
          sync();
        }, (v) => v + ' px');
        const sU = api.SU.slider(api.panel, 'Object distance (px)', 30, 300, 5, 180, (v) => {
          S.u = v;
          sync();
        }, (v) => v + ' px');
        const sOH = api.SU.slider(api.panel, 'Object height (px)', 20, 70, 5, 45, (v) => {
          S.oh = v;
          sync();
        }, (v) => v + ' px');

        /* ---- readouts ---- */
        const rV = api.SU.readout(api.readouts, 'Image distance', '—');
        const rM = api.SU.readout(api.readouts, 'Magnification', '—');
        const rNat = api.SU.readout(api.readouts, 'Nature', '—');

        function sync() {
          const { di, m } = model();
          rV.set(
            (di > 0 ? '+' : '') + di.toFixed(0) + ' px (' + (di > 0 ? 'behind lens' : 'same side') + ')'
          );
          rM.set(m.toFixed(2));
          rNat.set(di > 0 ? 'Real · inverted' : 'Virtual · upright');
        }

        function update(dt) {
          void dt; /* static bench: nothing integrates with time */
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
          if (api.getLayer() === 'science') drawRays();
          else drawBench();
        }

        function ray(x1, y1, x2, y2, col, dash) {
          g.strokeStyle = col;
          g.lineWidth = 1.6;
          g.setLineDash(dash || []);
          g.beginPath();
          g.moveTo(x1, y1);
          g.lineTo(x2, y2);
          g.stroke();
          g.setLineDash([]);
        }

        /* the exact geometric construction of the original bench */
        function drawRays() {
          const { dobj, oh, di, m } = model();
          const axisY = H * 0.55;
          const lensX = W * 0.52;
          g.strokeStyle = '#33415c';
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(0, axisY);
          g.lineTo(W, axisY);
          g.stroke();
          g.strokeStyle = 'rgba(107,122,153,.35)';
          [S.f, -S.f].forEach((off) => {
            g.beginPath();
            g.arc(lensX + off, axisY, 4, 0, 7);
            g.stroke();
            g.fillStyle = '#6b7a99';
            g.font = '10px "DM Mono", monospace';
            g.fillText(off > 0 ? "F'" : 'F', lensX + off - 3, axisY + 16);
          });
          g.strokeStyle = '#22d3ee';
          g.lineWidth = 3;
          g.beginPath();
          g.ellipse(lensX, axisY, 13, H * 0.38, 0, 0, 7);
          g.stroke();
          g.fillStyle = 'rgba(34,211,238,.07)';
          g.fill();
          const objX = lensX - dobj,
            imgX = lensX + di;
          g.strokeStyle = '#fbbf24';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(objX, axisY);
          g.lineTo(objX, axisY - oh);
          g.stroke();
          const tipY = axisY - oh;
          ray(objX, tipY, lensX, tipY, 'rgba(248,113,113,.95)');
          ray(lensX, tipY, imgX, axisY - oh * m, 'rgba(248,113,113,.95)');
          ray(objX, tipY, lensX, tipY, 'rgba(52,211,153,.95)');
          ray(lensX, tipY, imgX, axisY - oh * m, 'rgba(52,211,153,.95)');
          if (di < 0) {
            ray(
              lensX,
              tipY,
              objX - 130,
              tipY + ((tipY - (axisY - oh * m)) / (imgX - lensX)) * (objX - 130 - lensX) * -1,
              'rgba(248,113,113,.4)',
              [5, 4]
            );
            ray(imgX, axisY - oh * m, objX, axisY - oh * m, 'rgba(248,113,113,.5)', [5, 4]);
          }
          g.strokeStyle = di > 0 ? '#34d399' : '#f87171';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(imgX, axisY);
          g.lineTo(imgX, axisY - oh * m);
          g.stroke();
          if (di < 0) {
            g.globalAlpha = 0.65;
            g.beginPath();
            g.moveTo(imgX, axisY);
            g.lineTo(imgX, axisY - oh * m);
            g.stroke();
            g.globalAlpha = 1;
          }
          g.fillStyle = '#6b7a99';
          g.font = '11px "DM Mono", monospace';
          g.fillText('object', objX - 18, axisY + 16);
          g.fillText(di > 0 ? 'image' : '(virtual image)', imgX - 18, axisY + 16);
          api.pxLabel(g, 20, 20, '1/v = 1/f − 1/u · m = −v/u', 'rgba(232,237,247,0.8)');
          api.pxLabel(g, 20, 38, 'two principal rays from the object tip', 'rgba(107,122,153,0.9)');
        }

        /* the physical setup the rays describe */
        function drawBench() {
          const { dobj, oh, di, m } = model();
          const axisY = H * 0.55;
          const lensX = W * 0.52;
          /* rails */
          g.fillStyle = 'rgba(255,255,255,0.06)';
          g.fillRect(16, axisY + 52, W - 32, 8);
          g.strokeStyle = '#33415c';
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(0, axisY);
          g.lineTo(W, axisY);
          g.stroke();
          /* lens in its mount */
          g.strokeStyle = 'rgba(154,168,195,0.8)';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(lensX, axisY + 52);
          g.lineTo(lensX, axisY + H * 0.38 + 6);
          g.stroke();
          g.strokeStyle = '#22d3ee';
          g.beginPath();
          g.ellipse(lensX, axisY, 13, H * 0.38, 0, 0, 7);
          g.stroke();
          g.fillStyle = 'rgba(34,211,238,.07)';
          g.fill();
          const objX = lensX - dobj,
            imgX = lensX + di;
          /* object — a lit card */
          g.save();
          if (api.cfg.shadows) {
            g.shadowColor = 'rgba(251,191,36,0.8)';
            g.shadowBlur = 14;
          }
          g.strokeStyle = '#fbbf24';
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(objX, axisY);
          g.lineTo(objX, axisY - oh);
          g.stroke();
          g.restore();
          /* image */
          g.strokeStyle = di > 0 ? '#34d399' : '#f87171';
          g.lineWidth = 4;
          g.globalAlpha = di > 0 ? 1 : 0.7;
          g.beginPath();
          g.moveTo(imgX, axisY);
          g.lineTo(imgX, axisY - oh * m);
          g.stroke();
          g.globalAlpha = 1;
          /* distance brackets */
          g.strokeStyle = 'rgba(232,237,247,0.5)';
          g.lineWidth = 1;
          const by = axisY + 36;
          g.beginPath();
          g.moveTo(objX, by);
          g.lineTo(lensX, by);
          g.moveTo(objX, by - 4);
          g.lineTo(objX, by + 4);
          g.moveTo(lensX, by - 4);
          g.lineTo(lensX, by + 4);
          g.stroke();
          if (Math.abs(di) > 14) {
            g.beginPath();
            g.moveTo(lensX, by);
            g.lineTo(imgX, by);
            g.moveTo(imgX, by - 4);
            g.lineTo(imgX, by + 4);
            g.stroke();
          }
          g.fillStyle = 'rgba(232,237,247,0.75)';
          g.font = '10px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('u = ' + dobj + ' px', (objX + lensX) / 2, by - 8);
          if (Math.abs(di) > 14) {
            g.fillStyle = di > 0 ? '#34d399' : '#f87171';
            g.fillText('v = ' + di.toFixed(0) + ' px', (lensX + imgX) / 2, by + 12);
          }
          g.textAlign = 'left';
          api.pxLabel(g, 20, 20, 'PHYSIX OPTICAL BENCH', 'rgba(232,237,247,0.7)');
          api.pxLabel(
            g,
            W - 250,
            20,
            di > 0 ? 'real image · projector mode' : 'virtual image · magnifier mode',
            di > 0 ? 'rgba(52,211,153,0.95)' : 'rgba(248,113,113,0.95)'
          );
        }

        sweep();
        sync();

        return {
          update,
          draw,
          reset: () => {
            sweep();
            sync();
          },
          onPreset() {
            sF.set(S.f);
            sU.set(S.u);
            sOH.set(S.oh);
            sweep();
            sync();
            if (S.onParam) S.onParam();
          }
        };
      },
      probe(api) {
        const S = api.state;
        const di = 1 / (1 / S.f - 1 / S.u);
        return {
          f: S.f,
          u: S.u,
          oh: S.oh,
          di,
          m: +(-di / S.u).toFixed(4),
          nature: di > 0 ? 'real' : 'virtual',
          upright: di < 0,
          W: api.W
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'v',
          unit: 'px',
          quantity: 'image distance',
          absFloor: 5,
          context() {
            return { f: S.f, paramsText: 'f = ' + S.f + ' px' };
          },
          question() {
            return 'Predict first: with f = ' + S.f + ' px, where does the image of an object at u = 240 px form? (v, px)';
          },
          observe() {
            const hit = api.graphs[0].valueAt('v', 240);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            const v = 1 / (1 / ctx.f - 1 / 240);
            const m = -v / 240;
            return (
              'Thin-lens law: 1/v = 1/f − 1/u gives v = 1/(1/' +
              ctx.f +
              ' − 1/240) ≈ ' +
              v.toFixed(0) +
              ' px' +
              (v > 0 ? ' behind the lens — a REAL, inverted image (m = −v/u = ' + m.toFixed(2) + '), which is how a projector or camera sensor forms its picture.' : ' on the object side — a VIRTUAL, upright image (m = ' + m.toFixed(2) + '), which is how a magnifier works.')
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
