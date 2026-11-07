import { SU } from './core.js';
import { Sims } from './sims-a.js';
import { Workstation } from './sim-ui.js';
import { createPrediction } from './prediction.js';
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
    /* simulation constants, verbatim */
    const R = 8.314,
      N = 40,
      GAMMA = 1.4,
      V1 = 0.4,
      V2 = 1.2; // J/(mol K), mol, -, m³, m³
    const nR = N * R; // J/K

    /* the Carnot cycle from the reservoir temperatures — a pure function that
       the setup also calls, so the probe and the drawing agree */
    const cycle = (S) => {
      const th = S.th + 273.15,
        tc = Math.min(S.tc + 273.15, th - 5);
      const r = Math.pow(th / tc, 1 / (GAMMA - 1));
      const press = (V, T) => (nR * T) / V;
      const p1 = press(V1, th),
        p3 = press(V2 * r, tc);
      const Qin = nR * th * Math.log(V2 / V1),
        Qout = nR * tc * Math.log(V2 / V1);
      const Wk = Qin - Qout,
        eff = 1 - tc / th;
      return { th, tc, r, p1, p3, Qin, Qout, Wk, eff, press, nR, V1, V2 };
    };

    return Workstation.mount(frame, {
      id: 'thermo-engine',
      title: 'Heat Engine Cycle',
      desc: 'A Carnot engine is the textbook ideal: the efficiency is 1−Tc/Th no matter what fills the cylinder, and the area of the P–V loop is the work done in a cycle. Every leg of the loop below is computed from the reservoir temperatures — the isothermal stretch follows pV = nRT, the adiabatic legs follow pV^γ = const — so it is a real cycle and not an illustration.',
      icon: '🔥',
      topic: 'Thermodynamics',
      level: 'Grade 11–12',
      appKey: 'thermo-engine',
      height: 360,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Cycle bench' },
        { id: 'science', label: 'Analysis' }
      ],
      presets: [
        { label: 'Default cycle', apply: (s) => { s.th = 400; s.tc = 40; } },
        { label: 'Wider span', apply: (s) => { s.th = 500; s.tc = 20; } },
        { label: 'Narrow span', apply: (s) => { s.th = 200; s.tc = 30; } },
        { label: 'Warm sink', apply: (s) => { s.th = 300; s.tc = 40; } }
      ],
      graphs: [
        {
          title: 'The Carnot loop in the P–V plane',
          xLabel: 'V',
          xUnit: 'm³',
          xKey: 'V',
          yLabel: 'P',
          yUnit: 'kPa',
          height: 150,
          series: [{ id: 'p', label: 'P', unit: 'kPa', color: '#22d3ee' }]
        },
        {
          title: 'Work per cycle against the hot reservoir temperature',
          xLabel: 'Hot reservoir Th',
          xUnit: 'K',
          xKey: 'th',
          yLabel: 'Work',
          yUnit: 'kJ',
          height: 150,
          series: [{ id: 'W', label: 'W', unit: 'kJ', color: '#22d3ee' }]
        }
      ],

      setup(api) {
        const { g, W, H, state: S } = api;

        /* ---- state / controls ---- */
        S.th = 400; /* °C — hot reservoir */
        S.tc = 40; /* °C — cold reservoir */
        S.t = 0;

        const sTH = api.SU.slider(
          api.panel,
          'Hot Th (°C)',
          150,
          500,
          10,
          400,
          (v) => {
            S.th = v;
            rebuild();
            if (S.onParam) S.onParam();
          }
        );
        const sTC = api.SU.slider(
          api.panel,
          'Cold Tc (°C)',
          20,
          100,
          5,
          40,
          (v) => {
            S.tc = v;
            rebuild();
            if (S.onParam) S.onParam();
          }
        );

        /* ---- readouts ---- */
        const rEff = api.SU.readout(api.readouts, 'Carnot η', '—');
        const rW = api.SU.readout(api.readouts, 'Work per cycle', '—');
        const rP = api.SU.readout(api.readouts, 'Peak pressure', '—');
        const rV = api.SU.readout(api.readouts, 'Max volume', '—');

        /* ---- one leg of the loop sampled at 40 points: [volume, pressure] ---- */
        function sampleLeg(a, b, pf) {
          const out = [];
          for (let j = 0; j < 40; j++) {
            const V = a + ((b - a) * j) / 39;
            out.push([V, pf(V)]);
          }
          return out;
        }

        /* map raw data onto the canvas (original geometry preserved) */
        const ox = 60,
          oy = H - 40,
          w_ = W - 80,
          h_ = 280;
        const box = (data) => {
          const vmax = V2 * data.r;
          const sx = (V) => ox + ((V - V1) / (vmax - V1)) * w_;
          const sy = (p) => oy - (p / data.p1) * h_;
          return { vmax, sx, sy };
        };

        function rebuild() {
          const data = cycle(S);
          S.data = data;
          const { vmax, sx, sy } = box(data);
          S.legs = [
            { c: '#ff7a7a', name: 'isothermal expansion', pts: sampleLeg(V1, V2, (t) => data.press(t, data.th)) },
            {
              c: '#ffc043',
              name: 'adiabatic expansion',
              pts: sampleLeg(V2, V2 * data.r, (V) => data.press(V2, data.th) * Math.pow(V2 / V, GAMMA))
            },
            {
              c: '#3ee0a4',
              name: 'isothermal compression',
              pts: sampleLeg(V2 * data.r, V1 * data.r, (t) => data.press(t, data.tc))
            },
            {
              c: '#31d7f0',
              name: 'adiabatic compression',
              pts: sampleLeg(V1 * data.r, V1, (V) => data.press(V1 * data.r, data.tc) * Math.pow((V1 * data.r) / V, GAMMA))
            }
          ];
          /* the P–V loop as recorded data — 40 points per leg */
          const Gp = api.graphs[0];
          Gp.clear();
          S.legs.forEach((leg) => {
            leg.pts.forEach(([V, p]) => Gp.push({ V, p: p / 1000 }));
          });
          /* Work per cycle for a sweep of the hot reservoir (cold fixed). */
          const Gw = api.graphs[1];
          Gw.clear();
          for (let t = 150; t <= 500; t += 10) {
            const th = t + 273.15,
              tc = Math.min(S.tc + 273.15, th - 5);
            Gw.push({ th, W: nR * (th - tc) * Math.log(V2 / V1) / 1000 });
          }
          sync(data);
        }

        function sync(data) {
          rEff.set((data.eff * 100).toFixed(1) + '%');
          rW.set((data.Wk / 1000).toFixed(1) + ' kJ');
          rP.set((data.p1 / 1000).toFixed(0) + ' kPa');
          rV.set((V2 * data.r).toFixed(2) + ' m³');
        }

        function reset() {
          S.t = 0;
          api.graphs.forEach((G) => G.clear());
          rebuild();
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
          const data = S.data;
          const { vmax, sx, sy } = box(data);
          g.fillStyle = '#05070d';
          g.fillRect(0, 0, W, H);
          /* shaded loop = the work this cycle encloses */
          g.fillStyle = 'rgba(34,211,238,.18)';
          g.beginPath();
          S.legs.forEach((L, i) =>
            L.pts.forEach((pt, j) => (i || j ? g.lineTo(sx(pt[0]), sy(pt[1])) : g.moveTo(sx(pt[0]), sy(pt[1]))))
          );
          g.closePath();
          g.fill();
          g.lineWidth = 2;
          S.legs.forEach((L) => {
            g.strokeStyle = L.c;
            g.beginPath();
            L.pts.forEach((pt, j) => (j ? g.lineTo(sx(pt[0]), sy(pt[1])) : g.moveTo(sx(pt[0]), sy(pt[1]))));
            g.stroke();
          });
          /* corner states */
          g.fillStyle = '#fbbf24';
          [
            [V1, data.p1],
            [V2, data.press(V2, data.th)],
            [V2 * data.r, data.p3],
            [V1 * data.r, data.press(V1 * data.r, data.tc)]
          ].forEach(([V, p]) => {
            g.beginPath();
            g.arc(sx(V), sy(p), 4, 0, 7);
            g.fill();
          });
          /* axes, ticks and units */
          g.strokeStyle = '#33415c';
          g.lineWidth = 1;
          g.strokeRect(ox, oy - h_, w_, h_);
          g.fillStyle = '#9aa8c3';
          g.font = '11px "DM Mono", monospace';
          g.textAlign = 'center';
          const vs = niceStep(vmax - V1, 5);
          for (let v = V1; v <= vmax + vs * 1e-6; v += vs) {
            const x = sx(v);
            g.fillRect(x, oy - 2, 1, 4);
            g.fillText(v.toFixed(2), x, oy + 14);
          }
          const ps = niceStep(data.p1 / 1000, 4);
          for (let p = 0; p <= data.p1 / 1000 + ps * 1e-6; p += ps) {
            const y = sy(p * 1000);
            g.fillRect(ox - 4, y, 4, 1);
            g.fillText(p.toFixed(0), ox - 30, y + 4);
          }
          g.textAlign = 'left';
          g.fillText('P (kPa)', ox - 46, oy - h_ - 6);
          g.textAlign = 'right';
          g.fillText('V (m³)', ox + w_, oy + 28);
          api.pxLabel(g, 20, 22, 'PHYSIX CARNOТ CYCLE', 'rgba(232,237,247,0.7)');
        }

        function drawScience() {
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
          /* the cycle equation */
          g.fillStyle = 'rgba(232,237,247,0.1)';
          g.font = '12px "DM Mono", monospace';
          g.textAlign = 'center';
          const { th, tc, r, p1, Qin, Qout, Wk, eff } = S.data;
          g.fillText('η = 1 − Tc/Th  ·  W = Qin − Qout', W / 2, H * 0.35);
          g.fillText(`Qin = nR·Th·ln(V₂/V₁) = ${Qin.toFixed(1)} J · Qout = ${Qout.toFixed(1)} J`, W / 2, H * 0.35 + 30);
          g.fillText(`W = ${Wk.toFixed(1)} J = ${(Wk / 1000).toFixed(1)} kJ · η = ${(eff * 100).toFixed(1)}%`, W / 2, H * 0.35 + 60);
          g.textAlign = 'left';
          api.pxLabel(g, 20, 22, 'Qin = nRTₕ·ln(V₂/V₁)  ·  η = 1−Tc/Th', 'rgba(232,237,247,0.8)');
        }

        function niceStep(span, target) {
          const raw = span / Math.max(1, target),
            mag = Math.pow(10, Math.floor(Math.log10(raw))),
            nm = raw / mag;
          return (nm < 1.5 ? 1 : nm < 3 ? 2 : nm < 7 ? 5 : 10) * mag;
        }

        function update() {
          /* static bench: readouts stay live while the clock ticks */
          sync(S.data || cycle(S));
        }

        rebuild();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sTH.set(S.th);
            sTC.set(S.tc);
            rebuild();
          },
          destroy() {}
        };
      },
      probe(api) {
        const data = cycle(api.state);
        return {
          t: 0,
          th: data.th,
          tc: data.tc,
          ratio: data.th / data.tc,
          expansionRatio: V2 / V1,
          r: data.r,
          p1: data.p1,
          Qin: data.Qin,
          Qout: data.Qout,
          W: data.Wk,
          eff: data.eff,
          carnot: 1 - data.tc / data.th
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[1],
          series: 'W',
          unit: 'kJ',
          quantity: 'work per cycle',
          absFloor: 1,
          rel: 0.02,
          context() {
            return {
              th: S.th + 273.15,
              tc: S.tc + 273.15,
              paramsText: 'Th = ' + S.th + '°C · Tc = ' + S.tc + '°C · nR = 332.56 J/K'
            };
          },
          question() {
            return 'Predict first: what is the work per cycle (kJ) at Th = ' + S.th + '°C and Tc = ' + S.tc + '°C?';
          },
          observe() {
            const hit = api.graphs[1].valueAt('W', S.th + 273.15);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'The loop is the Carnot cycle: the isothermal legs follow pV = nRT and the adiabatic legs follow ' +
              'pV^γ = const. The shaded area between the legs is the work — here W = nR·(Th−Tc)·ln(V₂/V₁) = ' +
              332.56 * (ctx.th - ctx.tc) * Math.log(3) / 1000 +
              ' kJ at Th = ' +
              ctx.th +
              ' K, Tc = ' +
              ctx.tc +
              ' K. The efficiency is 1 − Tc/Th, the single law that bounds every engine.'
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
    });
  },
  { chrome: 'workstation' }
);
Sims.register(
  'ktg-gas',
  'Kinetic Gas',
  'Heat → faster molecules → higher pressure. T ∝ ⟨½mv²>.',
  '💨',
  (frame) =>
    Workstation.mount(frame, {
      id: 'ktg-gas',
      title: 'Kinetic Gas',
      desc: 'Temperature is the energy of motion: at 300 K the root-mean-square speed of an O₂ molecule is 483 m/s. Give the gas more heat and the molecules move faster, hit the walls more often and the pressure climbs — the pV relation of every gas, measured here by the swarm of particles.',
      icon: '💨',
      topic: 'Thermodynamics',
      level: 'Grade 11–12',
      appKey: 'ktg-gas',
      height: 360,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Collision chamber' },
        { id: 'science', label: 'Kinetic analysis' }
      ],
      presets: [
        { label: 'Room temperature', apply: (s) => { s.T = 300; } },
        { label: 'Hot gas', apply: (s) => { s.T = 400; } },
        { label: 'Very hot', apply: (s) => { s.T = 500; } },
        { label: 'Boiling', apply: (s) => { s.T = 600; } }
      ],
      graphs: [
        {
          title: 'rms speed of O₂ versus temperature',
          xLabel: 'Temperature',
          xUnit: 'K',
          xKey: 'T',
          yLabel: 'v_rms',
          yUnit: 'm/s',
          height: 140,
          series: [{ id: 'vRms', label: 'v_rms', unit: 'm/s', color: '#22d3ee' }]
        },
        {
          title: 'Mean particle speed measured in the chamber',
          xLabel: 'Time',
          xUnit: 's',
          xKey: 't',
          yLabel: 'Mean speed',
          yUnit: 'm/s',
          height: 140,
          series: [{ id: 'ms', label: 'Mean speed', unit: 'm/s', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.T = 300;
        S.time = 0;

        const sT = api.SU.slider(
          api.panel,
          'Temperature (K)',
          200,
          600,
          10,
          300,
          (v) => {
            S.T = v;
            rebuild();
            if (S.onParam) S.onParam();
          },
          (v) => v.toFixed(1) + ' K'
        );

        const rRMS = api.SU.readout(api.readouts, 'rms speed', '—');
        const rP = api.SU.readout(api.readouts, 'Pressure', '—');

        const n = 80; /* particles in the box */
        const pts = [];
        for (let i = 0; i < n; i++)
          pts.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2
          });
        S.points = pts;

        /* ---- modelling: fixed-step Brownian motion, verbatim ---- */
        function advance(h) {
          S.time += h;
          const tK = S.T,
            scale = Math.sqrt(tK / 300);
          const kick = 0.2 * scale * Math.sqrt(h * 60),
            damp = Math.pow(0.99, h * 60);
          pts.forEach((p) => {
            p.vx = (p.vx + (Math.random() - 0.5) * kick) * damp;
            p.vy = (p.vy + (Math.random() - 0.5) * kick) * damp;
            p.x += p.vx * scale * h * 60;
            p.y += p.vy * scale * h * 60;
            if (p.x < 6 || p.x > W - 6) {
              p.vx *= -1;
              p.x = Math.max(6, Math.min(W - 6, p.x));
            }
            if (p.y < 6 || p.y > H - 6) {
              p.vy *= -1;
              p.y = Math.max(6, Math.min(H - 6, p.y));
            }
          });
        }

        function sample() {
          const tK = S.T,
            scale = Math.sqrt(tK / 300);
          const speeds = pts.map((p) => Math.hypot(p.vx, p.vy) * scale * 60);
          const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
          api.graphs[1].push({ t: S.time, ms: +meanSpeed.toFixed(4) });
        }

        /* static sweep of the rms speed over the full temperature range */
        function rebuild() {
          const Gv = api.graphs[0];
          Gv.clear();
          for (let t = 200; t <= 600; t += 20) {
            Gv.push({ T: t, vRms: Math.sqrt((3 * 8.314 * t) / 0.032) });
          }
          sync();
        }

        function sync() {
          const tK = S.T,
            scale = Math.sqrt(tK / 300);
          rRMS.set((483 * scale).toFixed(0) + ' m/s (O₂)');
          rP.set((scale * 1.2).toFixed(2) + ' bar (demo)');
        }

        function reset() {
          S.time = 0;
          api.graphs.forEach((G) => G.clear());
          rebuild();
          /* restart the particle cloud from scratch */
          for (let i = 0; i < n; i++)
            pts[i] = { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 };
          S.time = 0;
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
          else drawChamber();
        }

        function drawChamber() {
          const scale = Math.sqrt(S.T / 300);
          g.fillStyle = '#05070d';
          g.fillRect(0, 0, W, H);
          g.strokeStyle = '#26314a';
          g.lineWidth = 1.5;
          g.strokeRect(4, 4, W - 8, H - 8);
          pts.forEach((p) => {
            g.fillStyle = '#38bdf8';
            g.beginPath();
            g.arc(p.x, p.y, 3, 0, 7);
            g.fill();
          });
          api.pxLabel(g, 12, 18, 'Heat → molecules move faster → collisions rise', 'rgba(232,237,247,0.7)');
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
          g.fillStyle = 'rgba(232,237,247,0.1)';
          g.font = '12px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('v_rms = √(3RT/M)  with  M = 0.032 kg/mol', W / 2, H * 0.35);
          g.fillText(`At T = ${S.T} K: v_rms = ${Math.sqrt((3 * 8.314 * S.T) / 0.032).toFixed(0)} m/s · P = ${Math.sqrt(S.T / 300) * 1.2} bar`, W / 2, H * 0.35 + 30);
          g.textAlign = 'left';
          api.pxLabel(g, 20, 22, 'T ∝ ⟨½mv²⟩  ·  √T gives the speed  ·  Nₐ·k = R', 'rgba(232,237,247,0.8)');
        }

        /* ---- per-frame pump ---- */
        function update(dt) {
          acc += dt;
          let n_ = 0;
          while (acc >= FIXED && n_ < 10) {
            advance(FIXED);
            sample();
            acc -= FIXED;
            n_++;
          }
          if (acc > FIXED) acc = 0;
          sync();
        }

        rebuild();
        sync();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sT.set(S.T);
            rebuild();
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
        const tK = S.T;
        const vRms = Math.sqrt((3 * 8.314 * tK) / 0.032);
        const speeds = S.points.map((p) => Math.hypot(p.vx, p.vy) * Math.sqrt(tK / 300) * 60);
        return {
          t: S.time,
          T: tK,
          vRms: +vRms.toFixed(6),
          pressureDemo: +(Math.sqrt(tK / 300) * 1.2).toFixed(6),
          meanSpeed: +(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(4),
          n: S.points.length,
          state: {}
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'vRms',
          unit: 'm/s',
          quantity: 'rms speed of O₂',
          absFloor: 2,
          rel: 0.02,
          context() {
            return { T: S.T, paramsText: 'O₂ · M = 0.032 kg/mol · R = 8.314 J/(mol K)' };
          },
          question() {
            return 'Predict first: what is the rms speed of O₂ at T = ' + S.T + ' K?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('vRms', S.T);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'The root-mean-square speed follows from the energy equipartition: ½Mv² = 3/2·RT, so v_rms = √(3RT/M) = √(3·8.314·' +
              ctx.T +
              '/0.032) = ' +
              Math.sqrt((3 * 8.314 * ctx.T) / 0.032).toFixed(0) +
              ' m/s at T = ' +
              ctx.T +
              ' K. Heating the gas raises the speed of every molecule, which makes the pressure rise in the same way.'
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
Sims.register(
  'atoms-bohr',
  'Bohr Atom',
  'n=1,2,3 — radius ∝ n², energy ∝ -1/n².',
  '⚛️',
  (frame) =>
    Workstation.mount(frame, {
      id: 'atoms-bohr',
      title: 'Bohr Atom',
      desc: 'The first model that made the atom quantized at once gave two exact laws: the orbit radius grows as n² and the energy falls as −1/n². The same ratio, 121.6 nm for the n = 2 → 1 jump, is the Lyman-α line that astronomy uses to find neutral hydrogen across the whole sky.',
      icon: '⚛️',
      topic: 'Atomic physics',
      level: 'Grade 11–12',
      appKey: 'atoms-bohr',
      height: 360,
      quality: 'auto',
      layers: [
        { id: 'real', label: 'Orbit display' },
        { id: 'science', label: 'Level analysis' }
      ],
      presets: [
        { label: 'Ground state', apply: (s) => { s.n = 1; } },
        { label: 'First excited', apply: (s) => { s.n = 2; } },
        { label: 'Second excited', apply: (s) => { s.n = 3; } },
        { label: 'High orbit', apply: (s) => { s.n = 4; } }
      ],
      graphs: [
        {
          title: 'Orbit radius rₙ = n²a₀',
          xLabel: 'Shell n',
          xUnit: '',
          xKey: 'n',
          yLabel: 'rₙ',
          yUnit: 'Å',
          height: 140,
          series: [{ id: 'r', label: 'rₙ', unit: 'Å', color: '#22d3ee' }]
        },
        {
          title: 'Shell energy Eₙ = −13.6/n² eV',
          xLabel: 'Shell n',
          xUnit: '',
          xKey: 'n',
          yLabel: 'Eₙ',
          yUnit: 'eV',
          height: 140,
          series: [{ id: 'E', label: 'Eₙ', unit: 'eV', color: '#fbbf24' }]
        }
      ],
      setup(api) {
        const { g, W, H, state: S } = api;
        const FIXED = 1 / 60;
        let acc = 0;

        S.n = 1;
        S.time = 0;
        S.ang = 0;

        const sN = api.SU.slider(
          api.panel,
          'Shell n',
          1,
          4,
          1,
          1,
          (v) => {
            S.n = v;
            rebuild();
            if (S.onParam) S.onParam();
          },
          (v) => 'n = ' + v
        );

        const rR = api.SU.readout(api.readouts, 'rₙ', '—');
        const rE = api.SU.readout(api.readouts, 'Eₙ', '—');
        const rLam = api.SU.readout(api.readouts, 'Photon n→1', '—');

        /* ---- modelling: the shell state and the closed-form spectra ---- */
        function model(n) {
          const radius = 0.53 * n * n;
          const energy = -13.6 / (n * n);
          const photon = n > 1 ? 1240 / (13.6 * (1 - 1 / (n * n))) : null;
          return { radius, energy, photon, omega: 0.5 + n * 0.2 };
        }

        function rebuild() {
          const G = api.graphs[0],
            GE = api.graphs[1];
          G.clear();
          GE.clear();
          for (let m = 1; m <= 4; m += 0.5) {
            G.push({ n: m, r: model(m).radius });
            GE.push({ n: m, E: model(m).energy });
          }
          sync();
        }

        function sync() {
          const m = model(S.n);
          rR.set(m.radius.toFixed(2) + ' Å');
          rE.set(m.energy.toFixed(2) + ' eV');
          rLam.set(S.n > 1 ? m.photon.toFixed(1) + ' nm' : '—');
        }

        function reset() {
          S.time = 0;
          S.ang = 0;
          api.graphs.forEach((G) => G.clear());
          rebuild();
        }

        function advance(h) {
          S.time += h;
          S.ang += (0.5 + S.n * 0.2) * h;
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
          else drawOrbit();
        }

        function drawOrbit() {
          const n = S.n,
            r = 0.53 * n * n,
            E = -13.6 / (n * n);
          const cx = W / 2,
            cy = H / 2;
          g.fillStyle = '#fbbf24';
          g.beginPath();
          g.arc(cx, cy, 8, 0, 7);
          g.fill();
          g.fillStyle = '#fff';
          g.font = '10px "DM Mono", monospace';
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
          g.arc(cx + Math.cos(S.ang) * rr, cy + Math.sin(S.ang) * rr, 5, 0, 7);
          g.fill();
          api.pxLabel(g, 12, 18, 'r = n²a₀  ·  E = −13.6/n² eV', 'rgba(232,237,247,0.7)');
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
          g.fillStyle = 'rgba(232,237,247,0.1)';
          g.font = '12px "DM Mono", monospace';
          g.textAlign = 'center';
          g.fillText('n = 1: r = 0.53 Å, E = −13.6 eV', W / 2, H * 0.35);
          g.fillText('n = 2: r = 2.12 Å, E = −3.40 eV  ·  Lyman-α = 121.6 nm', W / 2, H * 0.35 + 30);
          g.fillText('n = 3: r = 4.77 Å, E = −1.51 eV', W / 2, H * 0.35 + 60);
          g.fillText('n = 4: r = 8.48 Å, E = −0.85 eV', W / 2, H * 0.35 + 90);
          g.textAlign = 'left';
          api.pxLabel(g, 20, 22, 'r ∝ n²  ·  E ∝ −1/n²  ·  λ = hc/ΔE', 'rgba(232,237,247,0.8)');
        }

        /* ---- per-frame pump ---- */
        function update(dt) {
          acc += dt;
          let n_ = 0;
          while (acc >= FIXED && n_ < 10) {
            advance(FIXED);
            acc -= FIXED;
            n_++;
          }
          if (acc > FIXED) acc = 0;
          sync();
        }

        rebuild();
        sync();

        return {
          update,
          draw,
          reset,
          onPreset() {
            sN.set(S.n);
            rebuild();
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
        const n = S.n;
        return {
          t: S.time,
          n,
          radiusA: +(0.53 * n * n).toFixed(6),
          energyEv: +(-13.6 / (n * n)).toFixed(6),
          omega: +(0.5 + n * 0.2).toFixed(6),
          photonNm: n > 1 ? +(1240 / (13.6 * (1 - 1 / (n * n)))).toFixed(4) : null,
          state: { ang: +S.ang.toFixed(6) }
        };
      },
      predict(api) {
        const S = api.state;
        const pred = createPrediction(api.por, {
          graph: api.graphs[0],
          series: 'r',
          unit: 'Å',
          quantity: 'orbit radius',
          absFloor: 0.05,
          rel: 0.02,
          context() {
            return { n: S.n, paramsText: 'a₀ = 0.53 Å · r ∝ n²' };
          },
          question() {
            return 'Predict first: what is the radius of the n = ' + S.n + ' shell (Å)?';
          },
          observe() {
            const hit = api.graphs[0].valueAt('r', S.n);
            return hit ? { value: hit.y, exact: hit.exact } : null;
          },
          explain(r, ctx) {
            return (
              'In the Bohr model the orbit radius is r = n²·a₀ with a₀ = 0.53 Å, so the n = ' +
              ctx.n +
              ' shell has radius ' +
              (0.53 * ctx.n * ctx.n).toFixed(2) +
              ' Å. The energy is E = −13.6/n² eV, which gives E = ' +
              (-13.6 / ctx.n / ctx.n).toFixed(2) +
              ' eV. The n = 2 → 1 jump emits a Lyman-α photon at 121.6 nm, which is the very line that picks out neutral hydrogen in the spectra of distant galaxies.'
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
