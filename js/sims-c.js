/* PhysiX Academy — Simulations Part C: projectile, SHM, doppler */
'use strict';

/* ---------------- Projectile motion ---------------- */
Sims.register('projectile', 'Projectile Motion', 'Launch a ball — v splits into vₓ (constant) and v_y (gravity). Air drag optional.', '🎯', frame => {
  const cv = SU.canvas(frame, 300);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
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
  function launch() { const u = SP.get(), th = AN.get() * Math.PI / 180; st = { x: 0, y: H0.get(), vx: u * Math.cos(th), vy: u * Math.sin(th), t: 0, hmax: H0.get() }; trail = []; }
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
  let x, v, trace = [];
  const M = SU.slider(ctr, 'Mass m (kg)', 0.5, 5, 0.25, 1.5, () => reset());
  const K = SU.slider(ctr, 'Spring k', 5, 80, 1, 25, () => reset());
  let AM;
  const D = SU.slider(ctr, 'Damping', 0, 0.6, 0.02, 0, () => {}, v => v.toFixed(2));
  const rT = SU.readout(ro, 'Period T'), rX = SU.readout(ro, 'x'), rV = SU.readout(ro, 'v');
  AM = SU.slider(ctr, 'Amplitude A (px)', 30, 110, 5, 80, () => reset());
  function reset() { x = AM ? AM.get() : 80; v = 0; trace = []; }
  reset();
  SU.btn(act, '⟲ Restart', reset);
  SU.loop(cv.c, dt => {
    const m = M.get(), k = K.get(), dmp = D.get();
    v += (-k / m * x - dmp * v) * dt;
    x += v * dt;
    trace.push(x); if (trace.length > 320) trace.shift();
    rT.set((2 * Math.PI * Math.sqrt(m / k)).toFixed(2) + ' s');
    rX.set((x / 60).toFixed(2) + ' m');
    rV.set(v.toFixed(2) + ' m/s');
    const g = cv.g, midY = cv.H * 0.42;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    const wallX = cv.W * 0.12, eqX = cv.W / 2, bw = 44;
    g.fillStyle = '#33415c'; g.fillRect(wallX - 10, midY - 60, 10, 120);
    const coils = 9, span = eqX + x - wallX - 10;
    g.strokeStyle = '#9aa8c3'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(wallX, midY);
    for (let i = 1; i <= coils; i++) {
      const sx = wallX + span * i / coils;
      g.lineTo(sx - span / coils / 2, midY + (i % 2 ? 16 : -16));
    }
    g.lineTo(eqX + x, midY); g.stroke();
    g.strokeStyle = '#26314a'; g.lineWidth = 1; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(wallX, midY + 52); g.lineTo(cv.W - 20, midY + 52); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#6d5df6';
    g.fillRect(eqX + x - bw / 2, midY - 22, bw, 44);
    g.fillStyle = '#9aa8c3'; g.font = '11px Segoe UI'; g.textAlign = 'center';
    g.fillText(m + ' kg', eqX + x, midY + 4);
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
