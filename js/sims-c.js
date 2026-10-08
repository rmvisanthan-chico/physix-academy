import { pxArrow, pxLabel, SU } from './core.js';
import { Sims } from './sims-a.js';
import { createGraph, GRAPH_COLORS as GC } from './graph-engine.js';
/* PhysiX Academy — Simulations Part C: projectile, SHM, doppler */
'use strict';


/* ---------------- Projectile motion ---------------- */
Sims.register('projectile', 'Projectile Motion', 'Launch a ball — v splits into vₓ (constant) and v_y (gravity). Air drag optional.', '🎯', frame => {
  const cv = SU.canvas(frame, 300);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);

  /* Phase 3A graph. Fed from the same st the simulation already integrates -
     no physics was rewritten and no new state was introduced. y and vx are the
     two curves that make the textbook picture: a parabola, and a horizontal
     line proving horizontal velocity really is constant. vy (a straight ramp
     under no drag) is available via the legend toggle below. */
  const graph = createGraph(frame, {
    xLabel: 'Time', xUnit: 's',
    yLabel: 'y, vₓ, v_y', yUnit: 'm and m/s',
    title: 'Height vs Time — the parabola is the trajectory',
    height: 190,
    capacity: 900
  }, [
    { id: 'y',  label: 'Height y', unit: 'm', color: GC.b },
    { id: 'vx', label: 'vₓ', unit: 'm/s', color: GC.c },
    { id: 'vy', label: 'v_y', unit: 'm/s', color: GC.e }
  ]);
  const gToggle = SU.el('div', 'sim-actions'); frame.appendChild(gToggle);
  const mkToggle = (id, label) => {
    const b = document.createElement('button');
    b.className = 'btn btn-sm';
    b.type = 'button';
    b.textContent = label;
    let on = true;
    b.addEventListener('click', () => {
      on = !on;
      graph.setVisible(id, on);
      b.setAttribute('aria-pressed', String(on));
      b.style.opacity = on ? '' : '.55';
    });
    b.setAttribute('aria-pressed', 'true');
    gToggle.appendChild(b);
    return b;
  };
  mkToggle('y', 'Height');
  mkToggle('vx', 'vₓ');
  mkToggle('vy', 'v_y');
  /* destroy on unmount. SU.loop already stops on disconnect, but the graph
     owns its own rAF loop and a ResizeObserver, so it must be told. */
  if (window.MutationObserver) {
    const mo = new MutationObserver(() => {
      if (!frame.isConnected) { graph.destroy(); mo.disconnect(); }
    });
    mo.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
  }

  let st, trail = [];
  const G = 9.8;
  const SP = SU.slider(ctr, 'Speed u (m/s)', 5, 45, 1, 25, () => launch());
  const AN = SU.slider(ctr, 'Angle θ (°)', 10, 80, 1, 45, () => launch());
  const H0 = SU.slider(ctr, 'Launch height (m)', 0, 30, 1, 0, () => launch());
  const DR = SU.slider(ctr, 'Air drag k', 0, 0.4, 0.01, 0, () => launch(), v => v.toFixed(2));
  const rR = SU.readout(ro, 'Range'), rH = SU.readout(ro, 'Max height'), rT = SU.readout(ro, 'Flight');
  function ideal() {
    const u = SP.get(), th = AN.get() * Math.PI / 180, h = H0.get();
    const R = (u * Math.cos(th) / G) * (u * Math.sin(th) + Math.sqrt((u * Math.sin(th)) ** 2 + 2 * G * h));
    const Hmax = h + u * u * Math.sin(th) ** 2 / (2 * G);
    return { R, Hmax };
  }
  /* Reset clears the graph too, so the plot cannot keep showing the previous
     launch's curve while a new ball is in flight. */
  function launch() {
    const u = SP.get(), th = AN.get() * Math.PI / 180;
    st = { x: 0, y: H0.get(), vx: u * Math.cos(th), vy: u * Math.sin(th), t: 0, hmax: H0.get() };
    trail = [];
    graph.clear();
  }
  launch();
  SU.loop(cv.c, dt => {
    const k = DR.get(), id = ideal();
    const scale = Math.min((cv.W - 70) / Math.max(5, id.R), (cv.H - 50) / Math.max(5, id.Hmax)) * 0.9;
    if (st && !st.done) {
      st.t += dt;
      const sp = Math.hypot(st.vx, st.vy);
      st.vx += (-k * st.vx * sp) * dt; st.vy += (-G - k * st.vy * sp) * dt;
      st.x += st.vx * dt; st.y += st.vy * dt;
      if (st.y > st.hmax) st.hmax = st.y;
      if (st.y <= 0 && st.t > 0.05) { st.y = 0; st.done = true; }
      trail.push([st.x, st.y]); if (trail.length > 400) trail.shift();
      /* one call, fed from the values already integrated above. The engine
         decides which series use which key; this sim never touches a canvas
         for the graph and never learns how one is drawn. */
      graph.push({ x: st.t, y: st.y, vx: st.vx, vy: st.vy });
    }
    const g = cv.g, groundY = cv.H - 30, x0 = 34;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = '#33415c'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(20, groundY); g.lineTo(cv.W - 10, groundY); g.stroke();
    g.strokeStyle = 'rgba(107,122,153,.3)'; g.setLineDash([4, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, groundY); g.lineTo(x0, groundY - id.Hmax * scale); g.stroke();
    g.beginPath(); g.moveTo(x0, groundY); g.lineTo(x0 + id.R * scale, groundY); g.stroke(); g.setLineDash([]);
    if (st) {
      const px = x0 + st.x * scale, py = groundY - st.y * scale;
      g.fillStyle = 'rgba(34,211,238,.4)'; trail.forEach(p => { g.beginPath(); g.arc(x0 + p[0] * scale, groundY - p[1] * scale, 2.5, 0, 7); g.fill(); });
      g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill();
      if (!st.done) {
        pxArrow(g, px, py, st.vx * scale * 0.5, -st.vy * scale * 0.5, '#34d399');
        pxArrow(g, px, py, st.vx * scale * 0.5, 0, '#22d3ee');
        pxArrow(g, px, py, 0, -st.vy * scale * 0.5, 'rgba(248,113,113,.9)');
        pxLabel(g, px + st.vx * scale * 0.5 + 6, py - st.vy * scale * 0.5 - 4, 'v', '#34d399');
      }
      rR.set(st.x.toFixed(1) + ' m' + (k > 0 ? '  (ideal ' + id.R.toFixed(1) + ')' : ''));
      rH.set(st.hmax.toFixed(1) + ' m'); rT.set(st.t.toFixed(2) + ' s' + (st.done ? ' ✔' : ''));
    }
  });
});

/* ---------------- Spring-mass SHM ---------------- */
Sims.register('shm', 'Spring-Mass SHM', 'x(t) = A cos ωt — the heartbeat of physics.', '⏱️', frame => {
  const cv = SU.canvas(frame, 260);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  /* Phase 3A graph. x and v are already integrated below; time is accumulated
     here rather than inside the sim, so no physics was changed. */
  const graph = createGraph(frame, {
    xLabel: 'Time', xUnit: 's',
    xKey: 'gt',                 /* this sim's own x is displacement, not time */
    yLabel: 'x, v', yUnit: 'm, m/s',
    title: 'Displacement and velocity — velocity leads by a quarter period',
    height: 190, capacity: 900
  }, [
    { id: 'x', label: 'Displacement x', unit: 'm', color: GC.a },
    { id: 'v', label: 'Velocity v', unit: 'm/s', color: GC.b }
  ]);
  const gTog = SU.el('div', 'sim-actions'); frame.appendChild(gTog);
  const tog = (id, label) => {
    const b = document.createElement('button');
    b.className = 'btn btn-sm'; b.type = 'button'; b.textContent = label;
    let on = true;
    b.setAttribute('aria-pressed', 'true');
    b.addEventListener('click', () => {
      on = !on; graph.setVisible(id, on);
      b.setAttribute('aria-pressed', String(on));
      b.style.opacity = on ? '' : '.55';
    });
    gTog.appendChild(b);
  };
  tog('x', 'Displacement'); tog('v', 'Velocity');
  if (window.MutationObserver) {
    const mo = new MutationObserver(() => {
      if (!frame.isConnected) { graph.destroy(); mo.disconnect(); }
    });
    mo.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
  }

  /* vPix is the sim's pixel displacement (what the canvas draws); xMetres is
     that displacement converted to metres, which is what the readout and the
     graph both use. They must not share a name: the series id 'x' is the
     displacement, while opts.xKey ('gt') is time, and overloading one name for
     two roles is how the first version plotted velocity against time's key. */
  let xPix, v, trace = [], gt = 0;
  const M = SU.slider(ctr, 'Mass m (kg)', 0.5, 5, 0.25, 1.5, () => reset());
  const K = SU.slider(ctr, 'Spring k', 5, 80, 1, 25, () => reset());
  let AM;
  const D = SU.slider(ctr, 'Damping', 0, 0.6, 0.02, 0, () => {}, v => v.toFixed(2));
  const rT = SU.readout(ro, 'Period T'), rX = SU.readout(ro, 'x'), rV = SU.readout(ro, 'v');
  AM = SU.slider(ctr, 'Amplitude A (px)', 30, 110, 5, 80, () => reset());
  function reset() { xPix = AM ? AM.get() : 80; v = 0; trace = []; gt = 0; graph.clear(); }
  reset();
  SU.btn(act, '⟲ Restart', reset);
  SU.loop(cv.c, dt => {
    const m = M.get(), k = K.get(), dmp = D.get();
    /* physics, in PIXELS per second - exactly as before this change */
    v += (-k / m * xPix - dmp * v) * dt;
    xPix += v * dt;
    gt += dt;
    trace.push(xPix); if (trace.length > 320) trace.shift();
    /* Graph and readout both report displacement in metres (px / 60), so the
       plotted curve and the number beside it agree. Velocity is converted with
       the same factor - the first version pushed raw px/s and the legend read
       "-295 m/s", which is not a velocity anything in this sim produces. */
    graph.push({ gt, x: xPix / 60, v: v / 60 });
    rT.set((2 * Math.PI * Math.sqrt(m / k)).toFixed(2) + ' s');
    rX.set((xPix / 60).toFixed(2) + ' m');
    rV.set((v / 60).toFixed(2) + ' m/s');
    const g = cv.g, midY = cv.H * 0.42;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    const wallX = cv.W * 0.12, eqX = cv.W / 2, bw = 44;
    g.fillStyle = '#33415c'; g.fillRect(wallX - 10, midY - 60, 10, 120);
    const coils = 9, span = eqX + xPix - wallX - 10;
    g.strokeStyle = '#9aa8c3'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(wallX, midY);
    for (let i = 1; i <= coils; i++) {
      const sx = wallX + span * i / coils;
      g.lineTo(sx - span / coils / 2, midY + (i % 2 ? 16 : -16));
    }
    g.lineTo(eqX + xPix, midY); g.stroke();
    g.strokeStyle = '#26314a'; g.lineWidth = 1; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(wallX, midY + 52); g.lineTo(cv.W - 20, midY + 52); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#6d5df6';
    g.fillRect(eqX + xPix - bw / 2, midY - 22, bw, 44);
    g.fillStyle = '#9aa8c3'; g.font = '11px Segoe UI'; g.textAlign = 'center';
    g.fillText(m + ' kg', eqX + xPix, midY + 4);
    g.fillText('equilibrium', cv.W / 2, midY + 66);
    g.textAlign = 'left';
    const gx0 = 30, gy0 = cv.H - 14, gw = cv.W - 50;
    g.strokeStyle = '#22d3ee'; g.lineWidth = 2; g.beginPath();
    trace.forEach((xx, i) => {
      const X = gx0 + i / 320 * gw, Y = gy0 - 8 - xx / 130 * 36;
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    });
    g.stroke();
    g.fillStyle = '#6b7a99'; g.font = '10px Segoe UI';
    g.fillText('x(t) trace', gx0, gy0 + 2);
  });
});

/* ---------------- Doppler effect ---------------- */
Sims.register('doppler', 'Doppler Effect', 'Wavefronts bunch ahead, stretch behind.', '🚑', frame => {
  const cv = SU.canvas(frame, 280);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const C = 90;
  let rings = [], srcX = 60, emitAcc = 0;
  const VS = SU.slider(ctr, 'Source velocity', -60, 160, 5, 55, () => { rings = []; srcX = 60; });
  const FR = SU.slider(ctr, 'Emitted frequency f (Hz)', 0.5, 3, 0.1, 1.2, () => {});
  const rF = SU.readout(ro, "Heard f'"), rSt = SU.readout(ro, 'Status');
  SU.loop(cv.c, dt => {
    const vs = VS.get(), f = FR.get();
    srcX += vs * dt;
    if (srcX < 20 || srcX > cv.W * 0.62) { VS.set(-vs); rings = []; }
    emitAcc += dt;
    if (emitAcc > 1 / f) { emitAcc = 0; rings.push({ x: srcX, y: cv.H * 0.45, r: 2 }); }
    rings.forEach(r => { r.r += C * dt; });
    rings = rings.filter(r => r.r < cv.W * 1.2);
    const obsX = cv.W - 60, obsY = cv.H * 0.45;
    const dist = Math.abs(obsX - srcX);
    const vr = vs * Math.sign(obsX - srcX);
    const fObs = f * C / Math.max(20, C - vr);
    rF.set(fObs.toFixed(2) + ' Hz');
    rSt.set(vr > C ? '💥 Sonic boom!' : vr > 0 ? '🔊 Higher pitch' : vr < 0 ? '🔉 Lower pitch' : '➖ Same pitch');
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    rings.forEach(r => {
      const al = Math.max(0, 1 - r.r / (cv.W));
      g.strokeStyle = 'rgba(34,211,238,' + al.toFixed(2) + ')';
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.stroke();
    });
    g.fillStyle = '#fbbf24';
    g.beginPath(); g.arc(srcX, cv.H * 0.45, 9, 0, 7); g.fill();
    g.fillStyle = '#e8edf7'; g.font = '11px Segoe UI';
    g.fillText('source', srcX - 18, cv.H * 0.45 - 16);
    g.fillStyle = '#34d399';
    g.beginPath(); g.arc(obsX, obsY, 8, 0, 7); g.fill();
    g.fillStyle = '#e8edf7';
    g.fillText('observer', obsX - 22, obsY - 16);
  });
});
