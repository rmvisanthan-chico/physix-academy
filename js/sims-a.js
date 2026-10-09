import { pxArrow, pxLabel, SU } from './core.js';
import { esc, Store } from './utils.js';
import { attachTimeControls } from './sim-controls-helper.js';
/* PhysiX Academy — Simulations Part A: registry, helpers + mechanics */
'use strict';


export const Sims = {
  reg: {},
  register(id, title, desc, icon, run) {
    this.reg[id] = { id, title, desc, icon, run };
  },
mount(id, host) {
      host.innerHTML = '';
      const def = this.reg[id];
      if (!def) {
        host.innerHTML = '<div class="empty-state"><div class="big">🚧</div><p>Simulation “' + esc(id) + '” is coming soon.</p></div>';
        return;
      }
      const frame = SU.el('div', 'sim-frame');
      frame.innerHTML = '<div class="sim-head"><span class="dot"></span><b>' + esc(def.title) +
        '</b><span class="muted small">' + esc(def.desc) + '</span></div>';
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
        try { Store.noteSimOpened(id, ms); }
        catch (e) { /* storage unavailable: never block a simulation on it */ }
      };
      /* Unmount is the only reliable signal available for an SPA route change. */
      if (window.MutationObserver) {
        const mo = new MutationObserver(() => {
          if (!frame.isConnected) { report(); mo.disconnect(); }
        });
        /* subtree:true because #main's children are replaced wholesale, so a
           mutation can land on a descendant rather than on #main itself. */
        mo.observe(root, { childList: true, subtree: true });
      }
      window.addEventListener('pagehide', report, { once: true });

      try { def.run(frame); }
      catch (err) { console.error('Sim error:', id, err); frame.insertAdjacentHTML('beforeend', '<div class="empty-state">This simulation failed to start.</div>'); }
    }
};

/* ---------------- Newton's second law ---------------- */
Sims.register('newton', "Newton's Second Law", 'Push a cart — full force diagram: weight, normal, friction, net F = ma.', '🛒', frame => {
  const cv = SU.canvas(frame, 270);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  const G = 9.8, kf = 0.9;
  let x = 0, v = 0, t = 0;
  const reset = () => { x = 0; v = 0; t = 0; };
  const F = SU.slider(ctr, 'Force F (N)', -60, 60, 1, 20, reset);
  const M = SU.slider(ctr, 'Mass m (kg)', 1, 20, 0.5, 6, () => {});
  const MU = SU.slider(ctr, 'Friction μ', 0, 0.4, 0.01, 0.1, () => {}, v => v.toFixed(2));
  const rA = SU.readout(ro, 'a'), rN = SU.readout(ro, 'Normal N'), rFr = SU.readout(ro, 'Friction f'), rNet = SU.readout(ro, 'Net F');
  /* Phase 3C.1: split into advance/render. The force balance itself is unchanged
     - same three-branch friction logic, same semi-implicit Euler - it just no
     longer shares a body with the drawing. */
  let a = 0, fr = 0, N = 0;
  function advance(h) {
    t += h;
    const f = F.get(), m = M.get(), mu = MU.get();
    const dir = v > 0.01 ? 1 : v < -0.01 ? -1 : 0;
    N = m * G; const fmax = mu * N;
    if (dir !== 0) { fr = -dir * fmax; a = (f + fr) / m; }
    else if (Math.abs(f) <= fmax) { fr = -f; a = 0; v = 0; }
    else { fr = -Math.sign(f) * fmax; a = (f + fr) / m; }
    v += a * h; x += v * h;
    if (x > 34) { x = 34; v = 0; }
    if (x < -34) { x = -34; v = 0; }
  }
  function render() {
    const f = F.get(), m = M.get();
    rA.set(a.toFixed(2) + ' m/s²'); rN.set(N.toFixed(0) + ' N'); rFr.set(fr.toFixed(0) + ' N'); rNet.set(f.toFixed(0) + ' N');
    const g = cv.g, gy = cv.H * 0.72;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = '#33415c'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, gy); g.lineTo(cv.W, gy); g.stroke();
    g.strokeStyle = '#26314a'; g.lineWidth = 1;
    for (let i = 14; i < cv.W; i += 28) { g.beginPath(); g.moveTo(i, gy); g.lineTo(i - 10, gy + 12); g.stroke(); }
    const cx = cv.W / 2 + x * 8, cw = 46 + m * 2.4;
    g.fillStyle = '#6d5df6'; g.fillRect(cx - cw / 2, gy - 40, cw, 26);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(cx - cw / 2, gy - 40, cw, 7);
    g.fillStyle = '#22d3ee';
    g.beginPath(); g.arc(cx - cw * 0.28, gy - 14, 7, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + cw * 0.28, gy - 14, 7, 0, 7); g.fill();
    const cyc = gy - 27;
    pxArrow(g, cx, cyc, 0, m * G * kf, '#f87171');
    pxArrow(g, cx, cyc, 0, -N * kf, '#9aa8c3');
    pxArrow(g, cx, cyc - m * G * kf, f * kf, 0, '#fbbf24');
    if (Math.abs(fr) > 0.5) pxArrow(g, cx, cyc + N * kf, -fr * kf, 0, '#34d399');
    pxLabel(g, cx + 10, cyc + m * G * kf + 4, 'mg', '#f87171');
    pxLabel(g, cx + 10, cyc - N * kf - 4, 'N', '#9aa8c3');
    pxLabel(g, cx + f * kf + 8, cyc - m * G * kf - 4, 'F', '#fbbf24');
  }
  attachTimeControls({
    frame, advance, render, reset, replaceButtons: ['Reset'],
    getTime: () => t,
    /* The cart stops at the walls - the original code clamps x and zeroes v -
       so once it is against a wall there is nothing left to integrate. Without
       this the clock would keep advancing while the cart sat still, which reads
       as a broken Step button. */
    canAdvance: () => x < 34 && x > -34,
    stepLabel: 'time step',
    /* Phase 3C.1 test probe, matching the three Phase 3C simulations so the
       shared suite can drive every simulation through one code path. */
    probe: () => ({
      t, x, v, a, N: N, fr, calls: 0,
      state: { x: +x.toFixed(6), v: +v.toFixed(6) }
    })
  });
});

/* ---------------- Energy conservation (pendulum) ---------------- */
Sims.register('energy', 'Energy Conservation', 'PE ⇄ KE — the total never lies. Bars share one scale so they trade off.', '🎢', frame => {
  const cv = SU.canvas(frame, 280);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  let th = 48 * Math.PI / 180, om = 0, t = 0;
  const L = SU.slider(ctr, 'Length L', 90, 200, 5, 150, () => {});
  const M = SU.slider(ctr, 'Mass m (kg)', 0.5, 3, 0.25, 1, () => {});
  const D = SU.slider(ctr, 'Damping', 0, 0.06, 0.005, 0, () => {}, v => v.toFixed(3));
  const rP = SU.readout(ro, 'PE'), rK = SU.readout(ro, 'KE'), rT = SU.readout(ro, 'Total'), rTh = SU.readout(ro, 'Angle θ');
  const reSwing = () => { th = 48 * Math.PI / 180; om = 0; t = 0; };
  const G = 340;
  function bar(g, x, base, h, col, lab) {
    h = Math.max(1, Math.min(h, cv.H - 60));
    g.fillStyle = col; g.fillRect(x, base - h, 26, h);
    g.fillStyle = '#9aa8c3'; g.font = '11px Segoe UI'; g.textAlign = 'center';
    g.fillText(lab, x + 13, base + 13); g.textAlign = 'left';
  }
  /* Phase 3C.1: same pendulum integrator, split from the drawing. Note the
     integrator is the original semi-implicit Euler with a constant h - it is NOT
     an energy-conserving scheme, so total energy drifts slightly at 1/60s. That
     was true before this change too (it was worse: the step was frame-rate
     dependent). Not "fixed" here because this simulation's whole point is that
     the total stays flat, and switching to a symplectic scheme would change the
     teaching claim rather than the plumbing. Worth revisiting deliberately. */
  function advance(h) {
    t += h;
    const l = L.get(), dmp = D.get();
    om += (-G / l * Math.sin(th) - dmp * om) * h;
    th += om * h;
  }
  function render() {
    const l = L.get(), m = M.get();
    const pe = m * G * l * (1 - Math.cos(th)) / 1e6;
    const ke = 0.5 * m * l * l * om * om / 1e6;
    rP.set(pe.toFixed(2) + ' J'); rK.set(ke.toFixed(2) + ' J'); rT.set((pe + ke).toFixed(2) + ' J'); rTh.set((th * 180 / Math.PI).toFixed(0) + '°');
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    const px = cv.W * 0.42, py = 34;
    const bx = px + l * Math.sin(th), by = py + l * Math.cos(th);
    g.fillStyle = '#6b7a99'; g.fillRect(px - 26, py - 10, 52, 10);
    g.strokeStyle = '#33415c'; g.lineWidth = 1.5; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + l + 24); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#9aa8c3'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(px, py); g.lineTo(bx, by); g.stroke();
    const Emax = m * G * l * (1 - Math.cos(48 * Math.PI / 180)) / 1e6 || 1;
    const scale = (cv.H - 70) / Emax;
    g.fillStyle = '#34d399'; g.font = '10px Segoe UI'; g.textAlign = 'left';
    g.fillText('shared scale', cv.W - 120, cv.H - 4);
    bar(g, cv.W - 112, cv.H - 20, pe * scale, '#6d5df6', 'PE');
    bar(g, cv.W - 74, cv.H - 20, ke * scale, '#22d3ee', 'KE');
    bar(g, cv.W - 36, cv.H - 20, (pe + ke) * scale, '#34d399', 'Σ');
    g.fillStyle = '#fbbf24';
    g.beginPath(); g.arc(bx, by, 9 + m * 4, 0, 7); g.fill();
    pxArrow(g, bx, by, l * om * Math.cos(th) * 0.05, -l * om * Math.sin(th) * 0.05, '#34d399');
    pxLabel(g, bx + 14, by - 4, 'v', '#34d399');
  }
  attachTimeControls({
    frame, advance, render, reset: reSwing, replaceButtons: ['Re-swing'],
    getTime: () => t,
    canAdvance: () => true,
    stepLabel: 'oscillation time step',
    probe: () => {
      const l = L.get(), m = M.get();
      const pe = m * G * l * (1 - Math.cos(th)) / 1e6;
      const ke = 0.5 * m * l * l * om * om / 1e6;
      return {
        t, th, om, pe, ke, total: pe + ke,
        state: { th: +th.toFixed(8), om: +om.toFixed(8) }
      };
    }
  });
});

/* ---------------- Collision lab ---------------- */
Sims.register('collision', 'Collision Lab', 'Momentum always survives; KE may not.', '🎱', frame => {
  const cv = SU.canvas(frame, 240);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  let a, b, KE0 = 1, t = 0;
  const rad = m => 10 + Math.sqrt(m) * 5;
  const relaunch = () => {
    a = { m: 0, v: V1.get(), x: cv.W * 0.22, r: 0 };
    b = { m: 0, v: V2.get(), x: cv.W * 0.78, r: 0 };
    a.m = M1.get(); a.r = rad(a.m);
    b.m = M2.get(); b.r = rad(b.m);
    KE0 = 0.5 * a.m * a.v * a.v + 0.5 * b.m * b.v * b.v || 1;
    t = 0;
  };
  const M1 = SU.slider(ctr, 'Mass 1 (kg)', 0.5, 8, 0.5, 3, relaunch);
  const M2 = SU.slider(ctr, 'Mass 2 (kg)', 0.5, 8, 0.5, 1, relaunch);
  const V1 = SU.slider(ctr, 'Velocity 1 (m/s)', -8, 8, 0.5, 4, relaunch);
  const V2 = SU.slider(ctr, 'Velocity 2 (m/s)', -8, 8, 0.5, 0, relaunch);
  const E = SU.slider(ctr, 'Elasticity e', 0, 1, 0.05, 1, () => {}, v => v.toFixed(2));
  const rP = SU.readout(ro, 'Total p'), rK = SU.readout(ro, 'Total KE'), rSt = SU.readout(ro, 'Type'), rLoss = SU.readout(ro, 'KE lost');
  relaunch();
  const gy = () => cv.H * 0.66;
  /* Phase 3C.1: the collision resolution and wall bounces are unchanged. Worth
     noting WHY this is a good Step simulation: the interesting instant - the
     impulse - happens between two samples. A student can walk up to the contact
     with Step and watch momentum before, during and after the collision, which
     is exactly the kind of thing a running simulation makes impossible to see. */
  function advance(h) {
    t += h;
    a.x += a.v * 30 * h; b.x += b.v * 30 * h;
    const gap = a.r + b.r;
    if (Math.abs(b.x - a.x) < gap && a.v !== b.v) {
      const u1 = a.v, u2 = b.v, e = E.get();
      a.v = (e * b.m * (u2 - u1) + a.m * u1 + b.m * u2) / (a.m + b.m);
      b.v = (e * a.m * (u1 - u2) + a.m * u1 + b.m * u2) / (a.m + b.m);
      const mid = (a.x + b.x) / 2; a.x = mid - gap / 2; b.x = mid + gap / 2;
    }
    [a, b].forEach(p => {
      if (p.x < p.r) { p.x = p.r; p.v = Math.abs(p.v); }
      if (p.x > cv.W - p.r) { p.x = cv.W - p.r; p.v = -Math.abs(p.v); }
    });
  }
  function render() {
    rP.set((a.m * a.v + b.m * b.v).toFixed(2) + ' kg·m/s');
    rK.set((0.5 * a.m * a.v * a.v + 0.5 * b.m * b.v * b.v).toFixed(1) + ' J');
    rSt.set(E.get() >= 0.95 ? 'Elastic' : E.get() <= 0.05 ? 'Sticky' : 'Partly elastic');
    rLoss.set(((1 - (0.5 * a.m * a.v * a.v + 0.5 * b.m * b.v * b.v) / KE0) * 100).toFixed(0) + ' %');
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = '#33415c'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, gy()); g.lineTo(cv.W, gy()); g.stroke();
    [a, b].forEach((p, i) => {
      g.fillStyle = i ? '#fbbf24' : '#22d3ee';
      g.beginPath(); g.arc(p.x, gy() - p.r, p.r, 0, 7); g.fill();
      SU.arrowH(g, p.x, gy() - p.r * 2 - 18, p.v * 12, '#34d399');
      g.fillStyle = '#6b7a99'; g.font = '11px Segoe UI'; g.textAlign = 'center';
      g.fillText(p.m + ' kg', p.x, gy() + 16); g.textAlign = 'left';
    });
  }
  attachTimeControls({
    frame, advance, render, reset: relaunch, replaceButtons: ['Relaunch'],
    getTime: () => t,
    /* Elastic walls mean the balls never settle; Step stays meaningful for the
       whole run. */
    canAdvance: () => true,
    stepLabel: 'collision time step',
    probe: () => {
      const p = a.m * a.v + b.m * b.v;
      /* Momentum before the run, for the conservation check in the suite. */
      return {
        t, p, p0: M1.get() * V1.get() + M2.get() * V2.get(),
        ke: 0.5 * a.m * a.v * a.v + 0.5 * b.m * b.v * b.v,
        state: { ax: +a.x.toFixed(6), av: +a.v.toFixed(6) }
      };
    }
  });
});

/* ---------------- Orbit simulator ---------------- */
Sims.register('orbit', 'Orbit Simulator', 'Sideways speed turns falling into orbiting.', '🛰️', frame => {
  const cv = SU.canvas(frame, 320);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  const GM = 420000;
  const CX = () => cv.W / 2, CY = cv.H / 2;
let pl, trail = [], dead = 0, t = 0;
  const launch = () => { pl = { x: CX() + 190, y: CY, vx: 0, vy: -V0.get() }; trail = []; dead = 0; t = 0; };
  const V0 = SU.slider(ctr, 'Launch speed', 30, 120, 1, 66, launch);
  const rV = SU.readout(ro, 'Speed'), rR = SU.readout(ro, 'Distance'), rS = SU.readout(ro, 'Status');
  launch();
  /* Phase 3C.1: split from the drawing.

     The 1.2s "dead" countdown after a crash or an escape is preserved - it is
     what auto-restarts a run that ended - but it now counts down only while the
     simulation is running. That is a deliberate behaviour change from the old
     setTimeout-free code: previously a paused, crashed orbit would still
     relaunch itself a second later, silently discarding the frozen state the
     student had just paused to look at. Pausing to examine a crashed trajectory
     is precisely the case these controls exist for, so the countdown respects
     the pause. */
  function advance(h) {
    t += h;
    if (dead > 0) { dead -= h; if (dead <= 0) launch(); return; }
    if (!pl) { pl = {}; return; }
    const dx = pl.x - CX(), dy = pl.y - CY, r = Math.hypot(dx, dy) || 1;
    const acc = GM / (r * r);
    pl.vx -= acc * dx / r * h; pl.vy -= acc * dy / r * h;
    pl.x += pl.vx * h; pl.y += pl.vy * h;
    trail.push([pl.x, pl.y]); if (trail.length > 600) trail.shift();
    if (r < 18 || r > 1500) dead = 1.2;
  }
  function render() {
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = 'rgba(107,122,153,.18)'; g.lineWidth = 1;
    [70, 130, 190].forEach(rr => { g.beginPath(); g.arc(CX(), CY, rr, 0, 7); g.stroke(); });
    g.strokeStyle = 'rgba(34,211,238,.5)'; g.lineWidth = 1.5;
    g.beginPath();
    trail.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
    g.stroke();
    const grd = g.createRadialGradient(CX(), CY, 2, CX(), CY, 24);
    grd.addColorStop(0, '#fbbf24'); grd.addColorStop(1, 'rgba(251,191,36,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(CX(), CY, 24, 0, 7); g.fill();
    g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(CX(), CY, 11, 0, 7); g.fill();
    g.fillStyle = '#22d3ee'; g.beginPath(); g.arc(pl.x, pl.y, 6, 0, 7); g.fill();
  }
  /* Readouts are drawn here rather than inside advance() so that they update on
     a render triggered by a slider change while PAUSED. If they lived in
     advance(), changing the launch speed while paused would leave the readout
     showing the old run's numbers with nothing to explain why. */
  const updateReadouts = () => {
    if (!pl || dead > 0) return;
    const dx = pl.x - CX(), dy = pl.y - CY, r = Math.hypot(dx, dy) || 1;
    const en = 0.5 * (pl.vx * pl.vx + pl.vy * pl.vy) - GM / r;
    rV.set(Math.hypot(pl.vx, pl.vy).toFixed(0) + ' px/s');
    rR.set(r.toFixed(0) + ' px');
    if (r < 18) rS.set('💥 Crashed!');
    else if (r > 1500) rS.set('🌌 Lost to space');
    else rS.set(en < 0 ? '🟢 Bound' : '🔴 Escaping');
  };
  updateReadouts();
  /* Re-run the readout whenever the slider changes. onStateChange fires on every
     pause/resume/reset too, which keeps the numbers honest without duplicating
     the update logic. */
  attachTimeControls({
    onStateChange: updateReadouts,
    frame, advance, render, reset: launch, replaceButtons: ['Relaunch'],
    getTime: () => t,
    /* While the crash countdown is running there is no state to integrate, so
       Step should not march the clock on through it. */
    canAdvance: () => dead <= 0 && !!pl,
    stepLabel: 'orbital time step',
    probe: () => {
      const dx = pl.x - CX(), dy = pl.y - CY;
      return {
        t, speed: Math.hypot(pl.vx, pl.vy), r: Math.hypot(dx, dy),
        state: { x: +pl.x.toFixed(6), y: +pl.y.toFixed(6) }
      };
    }
  });
});


