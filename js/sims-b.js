import { SU } from './core.js';
import { Sims } from './sims-a.js';
import { createGraph, GRAPH_COLORS as GC } from './graph-engine.js';
import { createPrediction } from './prediction.js';
import { createSimControls } from './sim-controls.js';
/* PhysiX Academy — Simulations Part B: waves, circuits, magnetism, kinematics */
'use strict';

/* ---------------- Travelling wave ---------------- */
Sims.register('wave', 'Travelling Wave', 'v = fλ — tune frequency and wavelength.', '🌊', frame => {
  const cv = SU.canvas(frame, 240);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  let vRead;
  const upd = () => { if (vRead) vRead.set((FR.get() * WL.get()).toFixed(0) + ' px/s (= f × λ)'); };
  const FR = SU.slider(ctr, 'Frequency f (Hz)', 0.2, 3, 0.05, 1, upd);
  const WL = SU.slider(ctr, 'Wavelength λ (px)', 60, 400, 5, 180, upd);
  const AM = SU.slider(ctr, 'Amplitude (px)', 10, 80, 2, 45, () => {});
  vRead = SU.readout(ro, 'Wave speed');
  upd();
  SU.loop(cv.c, (dt, t) => {
    const g = cv.g, A = AM.get(), k = 2 * Math.PI / WL.get(), w = 2 * Math.PI * FR.get();
    const mid = cv.H / 2;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = '#26314a'; g.lineWidth = 1; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(0, mid); g.lineTo(cv.W, mid); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#22d3ee'; g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x <= cv.W; x += 3) {
      const y = mid - A * Math.sin(k * x - w * t);
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    const lam = WL.get();
    const crest = ((w * t / k) % lam + lam) % lam;
    g.fillStyle = '#fbbf24';
    g.beginPath(); g.arc(crest, mid - A, 5, 0, 7); g.fill();
    if (crest + lam < cv.W) {
      const c2 = crest + lam;
      g.strokeStyle = '#fbbf24'; g.setLineDash([3, 3]); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(crest, mid + A + 18); g.lineTo(c2, mid + A + 18); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#fbbf24'; g.font = '12px Segoe UI';
      g.fillText('λ', (crest + c2) / 2 - 4, mid + A + 34);
    }
  });
});

/* ---------------- Ohm's law circuit ---------------- */
Sims.register('circuit', "Ohm's Law Circuit", 'Voltage pushes; resistance resists.', '🔌', frame => {
  const cv = SU.canvas(frame, 250);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const V = SU.slider(ctr, 'Battery V (volts)', 1.5, 24, 0.5, 12, () => {});
  const R = SU.slider(ctr, 'Resistance R (Ω)', 2, 100, 1, 24, () => {});
  const rI = SU.readout(ro, 'Current I'), rP = SU.readout(ro, 'Power P');
  let phase = 0;
  SU.loop(cv.c, dt => {
    const v = V.get(), r = R.get(), I = v / r, P = I * I * r;
    rI.set(I.toFixed(2) + ' A'); rP.set(P.toFixed(1) + ' W');
    phase = (phase + Math.min(220, I * 30) * dt) % 1;
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    const L = 80, T = 55, Rt = cv.W - 90, B = cv.H - 55, mx = (L + Rt) / 2;
    const pts = [[L, T], [mx - 34, T], [mx + 34, T], [Rt, T], [Rt, B], [L, B], [L, T]];
    let total = 0; const lens = [];
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      lens.push(d); total += d;
    }
    g.strokeStyle = '#4a5878'; g.lineWidth = 3;
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    for (let n = 0; n < 16; n++) {
      let want = ((phase + n / 16) % 1) * total, seg = 0;
      while (want > lens[seg]) { want -= lens[seg]; seg++; }
      const p1 = pts[seg], p2 = pts[seg + 1], f = want / lens[seg];
      g.fillStyle = '#22d3ee';
      g.beginPath(); g.arc(p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f, 3, 0, 7); g.fill();
    }
    g.strokeStyle = '#e8edf7'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(L - 14, (T + B) / 2 - 14); g.lineTo(L + 14, (T + B) / 2 - 14); g.stroke();
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(L - 8, (T + B) / 2 + 6); g.lineTo(L + 8, (T + B) / 2 + 6); g.stroke();
    g.strokeStyle = '#9aa8c3'; g.lineWidth = 3;
    g.beginPath();
    let zx = mx - 34;
    g.moveTo(zx, T);
    for (let i = 0; i < 6; i++) { g.lineTo(zx + 5.5, T + (i % 2 ? 10 : -10)); zx += 5.5; }
    g.lineTo(mx + 34, T); g.stroke();
    const bx = Rt + 45, by = (T + B) / 2, glow = Math.min(1, P / 28);
    const grd = g.createRadialGradient(bx, by, 2, bx, by, 40 * glow + 8);
    grd.addColorStop(0, 'rgba(251,191,36,' + glow + ')'); grd.addColorStop(1, 'rgba(251,191,36,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(bx, by, 40 * glow + 8, 0, 7); g.fill();
    g.strokeStyle = '#9aa8c3'; g.lineWidth = 2;
    g.beginPath(); g.arc(bx, by, 13, 0, 7); g.stroke();
    g.fillStyle = 'rgba(251,191,36,' + (0.25 + glow * 0.75) + ')';
    g.beginPath(); g.arc(bx, by, 11, 0, 7); g.fill();
    g.fillStyle = '#9aa8c3'; g.font = '11px Segoe UI';
    g.fillText(v.toFixed(1) + ' V', L - 22, B + 18);
    g.textAlign = 'center'; g.fillText('R = ' + r + ' Ω', mx, T - 20); g.textAlign = 'left';
  });
});

/* ---------------- Charge in magnetic field ---------------- */
Sims.register('bfield', 'Charge in a B Field', 'Cyclotron motion: r = mv / qB.', '🧭', frame => {
  const cv = SU.canvas(frame, 300);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  let pos, vel, trail;
  const reset = () => { pos = [cv.W * 0.3, cv.H / 2]; vel = [0, -V0.get()]; trail = []; };
  const V0 = SU.slider(ctr, 'Speed v', 60, 260, 5, 140, reset);
  const B = SU.slider(ctr, 'Field B (signed)', -4, 4, 0.1, 2, reset, v => v.toFixed(1));
  const QM = SU.slider(ctr, 'q/m ratio', 0.05, 0.4, 0.01, 0.15, reset, v => v.toFixed(2));
  const rR = SU.readout(ro, 'Radius'), rT = SU.readout(ro, 'Period'), rD = SU.readout(ro, 'Direction');
  reset();
  SU.btn(act, '⟲ Reset', reset);
  SU.loop(cv.c, dt => {
    const qm = QM.get(), b = B.get(), w = qm * b;
    const ca = Math.cos(w * dt), sa = Math.sin(w * dt);
    vel = [vel[0] * ca - vel[1] * sa, vel[0] * sa + vel[1] * ca];
    pos = [pos[0] + vel[0] * dt, pos[1] + vel[1] * dt];
    if (pos[0] < -50 || pos[0] > cv.W + 50 || pos[1] < -50 || pos[1] > cv.H + 50) reset();
    trail.push([pos[0], pos[1]]); if (trail.length > 900) trail.shift();
    const sp = Math.hypot(vel[0], vel[1]);
    const Rth = Math.abs(sp / (qm * Math.abs(b) || 1));
    rR.set(Rth.toFixed(0) + ' px');
    rT.set((2 * Math.PI / Math.abs(w || 1)).toFixed(2) + ' s');
    rD.set(b >= 0 ? '↻ clockwise (+q)' : '↺ anticlockwise (+q)');
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = 'rgba(107,122,153,.35)'; g.fillStyle = 'rgba(107,122,153,.55)';
    g.font = '13px Segoe UI'; g.lineWidth = 1;
    for (let x = 30; x < cv.W; x += 56) for (let y = 28; y < cv.H; y += 48) {
      if (b >= 0) { g.beginPath(); g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y + 6); g.moveTo(x + 6, y - 6); g.lineTo(x - 6, y + 6); g.stroke(); }
      else { g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); }
    }
    g.strokeStyle = 'rgba(109,93,246,.75)'; g.lineWidth = 2;
    g.beginPath();
    trail.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
    g.stroke();
    g.fillStyle = '#fbbf24';
    g.beginPath(); g.arc(pos[0], pos[1], 7, 0, 7); g.fill();
    g.fillStyle = '#e8edf7'; g.font = '11px Segoe UI';
    g.fillText('+q', pos[0] + 10, pos[1] - 8);
    SU.arrowH(g, pos[0], pos[1], vel[0] * 0.12, '#34d399');
  });
});

/* ---------------- 1-D kinematics with graphs ---------------- */
Sims.register('kin1d', '1-D Motion Lab', 'Move a car — watch the graphs being drawn.', '🚗', frame => {
  const cv = SU.canvas(frame, 330);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  /* Phase 3A graph. This sim already keeps `hist` as [t, x, v] triples for its
     own hand-drawn plot; the graph is fed from the same three numbers, and the
     old canvas plot is left in place because it scales x and v independently
     while the shared engine auto-scales both together. */
  const graph = createGraph(frame, {
    xLabel: 'Time', xUnit: 's', xKey: 't',
    yLabel: 'x, v', yUnit: 'm, m/s',
    title: 'Position and velocity — a straight line and a straight line',
    height: 190, capacity: 900
  }, [
    { id: 'x', label: 'Position x', unit: 'm', color: GC.a },
    { id: 'v', label: 'Velocity v', unit: 'm/s', color: GC.b }
  ]);
  const gTog = SU.el('div', 'sim-actions'); frame.appendChild(gTog);
  const gtog = (id, label) => {
    const b = document.createElement('button');
    b.className = 'btn btn-sm'; b.type = 'button'; b.textContent = label;
    let on = true; b.setAttribute('aria-pressed', 'true');
    b.addEventListener('click', () => {
      on = !on; graph.setVisible(id, on);
      b.setAttribute('aria-pressed', String(on));
      b.style.opacity = on ? '' : '.55';
    });
    gTog.appendChild(b);
  };
  gtog('x', 'Position'); gtog('v', 'Velocity');
  if (window.MutationObserver) {
    const mo = new MutationObserver(() => {
      if (!frame.isConnected) { graph.destroy(); mo.disconnect(); }
    });
    mo.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
  }

  let t = 0, hist = [];
  const reset = () => { t = 0; hist = []; graph.clear(); };
  const U = SU.slider(ctr, 'Initial u (m/s)', -15, 15, 0.5, 4, reset);
  const A = SU.slider(ctr, 'Acceleration a (m/s²)', -4, 4, 0.1, 1, reset);
  const rT = SU.readout(ro, 't'), rX = SU.readout(ro, 'x'), rV = SU.readout(ro, 'v');
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
    const u = U.get(), a = A.get();
    const x = u * t + 0.5 * a * t * t;
    const v = u + a * t;
    hist.push([t, x, v]); if (hist.length > 1200) hist.shift();
    graph.push({ t, x, v });
  }

  function render() {
    const u = U.get(), a = A.get();
    const x = u * t + 0.5 * a * t * t;
    const v = u + a * t;
    rT.set(t.toFixed(1) + ' s');
    rV.set(v.toFixed(1) + ' m/s');
    rX.set(Math.max(-999, Math.min(x, 999)).toFixed(1) + ' m');
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    const roadY = 46, pxPerM = cv.W / XMAX;
    const carX = Math.max(-30, Math.min(cv.W + 30, x * pxPerM));
    g.strokeStyle = '#33415c'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, roadY + 16); g.lineTo(cv.W, roadY + 16); g.stroke();
    g.strokeStyle = '#26314a';
    for (let i = 10; i < cv.W; i += 40) { g.beginPath(); g.moveTo(i, roadY + 16); g.lineTo(i - 12, roadY + 26); g.stroke(); }
    g.fillStyle = '#6d5df6'; g.fillRect(carX - 17, roadY - 8, 34, 16);
    g.fillStyle = '#22d3ee';
    g.beginPath(); g.arc(carX - 9, roadY + 10, 5, 0, 7); g.fill();
    g.beginPath(); g.arc(carX + 9, roadY + 10, 5, 0, 7); g.fill();
    const gx0 = 44, gy0 = cv.H - 24, gw = cv.W - 66, gh = cv.H - 110;
    g.strokeStyle = '#33415c'; g.lineWidth = 1;
    g.strokeRect(gx0, gy0 - gh, gw, gh);
    g.fillStyle = '#6b7a99'; g.font = '11px Segoe UI';
    g.fillText('x (m)', gx0 - 36, gy0 - gh / 2);
    g.fillText('v (m/s)', gx0 - 44, gy0 - gh / 2 + 14);
    g.fillText('t → ' + t.toFixed(0) + 's', gx0 + gw - 52, gy0 + 14);
    const tMax = 14, xScale = Math.max(XMAX, ...hist.map(h => Math.abs(h[1]))) * 1.05 || XMAX;
    const vScale = Math.max(16, ...hist.map(h => Math.abs(h[2]))) * 1.05;
    const plot = (col, idx, scale) => {
      g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
      hist.forEach((h, i) => {
        const X = gx0 + h[0] / tMax * gw;
        const Y = gy0 - h[idx] / scale * (gh / 2) - (idx === 1 ? gh / 2 : 0);
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
    advance, sample, render,
    reset,
    getTime: () => t,
    timeUnit: 's',
    canAdvance: () => t <= 14,
    stepLabel: 'time step'
  });

  const kinProbe = () => {
    const u = U.get(), a = A.get();
    return {
      t, x: u * t + 0.5 * a * t * t, v: u + a * t,
      y0: 0,
      paused: controls.isPaused(),
      samples: graph.sampleCount('x'),   /* one series only - see the projectile note */
      calls: controls.advanceCalls()
    };
  };
  window.__tcProbe = kinProbe;
  const clearProbe = () => { if (window.__tcProbe === kinProbe) window.__tcProbe = null; };

  /* ---------- Phase 3B prediction ----------
     Constant acceleration is the clearest prediction in the whole set, because
     both curves are exactly straight lines and the answer can be checked with
     arithmetic. "Where is it at t = 3 s?" is the canonical first kinematics
     question, and it is reachable for every value of u and a since the run
     lasts 14 s. Target is clamped to stay inside that run even at the extremes
     of both sliders. */
  const T_MAX = 14;                        /* must match the loop's reset point */
  const targetFor = () => Math.min(3, T_MAX * 0.6);

  let pendingReveal = null;
  let revealTimer = 0;
  function stopWatching() {
    if (revealTimer) { clearInterval(revealTimer); revealTimer = 0; }
  }
  function watchForTarget() {
    stopWatching();
    revealTimer = setInterval(() => {
      if (!pendingReveal || pred.prediction === null || pred.result) return;
      const range = graph.timeRange('x');
      if (range && range.to >= pendingReveal) {
        if (pred.reveal()) { pendingReveal = null; stopWatching(); }
      }
    }, 120);
  }

  const pred = createPrediction(frame, {
    graph,
    series: 'x',
    unit: 'm',
    quantity: 'position',
    absFloor: 0.4,          /* metres; positions here run to tens of metres */
    context() {
      const u = U.get(), a = A.get();
      return {
        u, a,
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
      if (!frame.isConnected) { stopWatching(); controls.destroy(); clearProbe(); mo2.disconnect(); }
    });
    mo2.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
  }
});
