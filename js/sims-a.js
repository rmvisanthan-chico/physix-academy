/* PhysiX Academy — Simulations Part A: registry, helpers + mechanics */
'use strict';

const SU = {
  el(tag, cls, html) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  },
  canvas(host, h) {
    const wrap = SU.el('div', 'sim-canvas-wrap');
    const c = document.createElement('canvas');
    wrap.appendChild(c); host.appendChild(wrap);
    const W = Math.max(280, wrap.clientWidth || host.clientWidth || 640);
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr; c.height = h * dpr;
    c.style.width = W + 'px'; c.style.height = h + 'px';
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, g, W, H: h };
  },
  loop(cv, fn) {
    let last = performance.now(), alive = true;
    function step(t) {
      if (!alive || !cv.isConnected) { alive = false; return; }
      const dt = Math.min(0.033, (t - last) / 1000); last = t;
      fn(dt, t / 1000);
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return () => { alive = false; };
  },
  slider(parent, label, min, max, step, val, oninput, fmt) {
    fmt = fmt || (v => v);
    const w = SU.el('div', 'ctl', '<label>' + label + '<output></output></label>');
    const out = w.querySelector('output');
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    const upd = () => { out.textContent = fmt(+inp.value); };
    upd();
    inp.addEventListener('input', () => { upd(); oninput(+inp.value); });
    w.appendChild(inp); parent.appendChild(w);
    return { get: () => +inp.value, set(v) { inp.value = v; upd(); } };
  },
  readout(parent, label, val) {
    const r = SU.el('div', 'readout', label + ' <b>' + (val == null ? '—' : val) + '</b>');
    parent.appendChild(r);
    const b = r.querySelector('b');
    return { set(v) { b.textContent = v; } };
  },
  btn(parent, label, fn, primary) {
    const b = SU.el('button', 'btn btn-sm' + (primary ? ' btn-primary' : ''), label);
    b.addEventListener('click', fn);
    parent.appendChild(b);
    return b;
  },
  arrowH(g, x, y, len, col) {
    if (Math.abs(len) < 3) return;
    const s = Math.sign(len);
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
    g.beginPath(); g.moveTo(x + len, y); g.lineTo(x + len - 8 * s, y - 4); g.lineTo(x + len - 8 * s, y + 4); g.fill();
  }
};

/* shared vector drawing helpers (used across sim files) */
function pxArrow(g, x, y, dx, dy, col, w) {
  const len = Math.hypot(dx, dy); if (len < 2) return;
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w || 3;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
  const a = Math.atan2(dy, dx), h = (w || 3) + 5;
  g.beginPath();
  g.moveTo(x + dx, y + dy);
  g.lineTo(x + dx - h * Math.cos(a - 0.42), y + dy - h * Math.sin(a - 0.42));
  g.lineTo(x + dx - h * Math.cos(a + 0.42), y + dy - h * Math.sin(a + 0.42));
  g.closePath(); g.fill();
}
function pxLabel(g, x, y, t, col) {
  g.fillStyle = col || '#9aa8c3'; g.font = '11px Segoe UI'; g.textAlign = 'left';
  g.fillText(t, x, y);
}

const Sims = {
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
  let x = 0, v = 0;
  const reset = () => { x = 0; v = 0; };
  const F = SU.slider(ctr, 'Force F (N)', -60, 60, 1, 20, reset);
  const M = SU.slider(ctr, 'Mass m (kg)', 1, 20, 0.5, 6, () => {});
  const MU = SU.slider(ctr, 'Friction μ', 0, 0.4, 0.01, 0.1, () => {}, v => v.toFixed(2));
  const rA = SU.readout(ro, 'a'), rN = SU.readout(ro, 'Normal N'), rFr = SU.readout(ro, 'Friction f'), rNet = SU.readout(ro, 'Net F');
  SU.btn(act, '⟲ Reset', reset);
  SU.loop(cv.c, dt => {
    const f = F.get(), m = M.get(), mu = MU.get();
    const dir = v > 0.01 ? 1 : v < -0.01 ? -1 : 0;
    const N = m * G, fmax = mu * N;
    let a, fr;
    if (dir !== 0) { fr = -dir * fmax; a = (f + fr) / m; }
    else if (Math.abs(f) <= fmax) { fr = -f; a = 0; v = 0; }
    else { fr = -Math.sign(f) * fmax; a = (f + fr) / m; }
    v += a * dt; x += v * dt;
    if (x > 34) { x = 34; v = 0; }
    if (x < -34) { x = -34; v = 0; }
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
  });
});

/* ---------------- Energy conservation (pendulum) ---------------- */
Sims.register('energy', 'Energy Conservation', 'PE ⇄ KE — the total never lies. Bars share one scale so they trade off.', '🎢', frame => {
  const cv = SU.canvas(frame, 280);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  let th = 48 * Math.PI / 180, om = 0;
  const L = SU.slider(ctr, 'Length L', 90, 200, 5, 150, () => {});
  const M = SU.slider(ctr, 'Mass m (kg)', 0.5, 3, 0.25, 1, () => {});
  const D = SU.slider(ctr, 'Damping', 0, 0.06, 0.005, 0, () => {}, v => v.toFixed(3));
  const rP = SU.readout(ro, 'PE'), rK = SU.readout(ro, 'KE'), rT = SU.readout(ro, 'Total'), rTh = SU.readout(ro, 'Angle θ');
  SU.btn(act, '⟲ Re-swing', () => { th = 48 * Math.PI / 180; om = 0; });
  const G = 340;
  function bar(g, x, base, h, col, lab) {
    h = Math.max(1, Math.min(h, cv.H - 60));
    g.fillStyle = col; g.fillRect(x, base - h, 26, h);
    g.fillStyle = '#9aa8c3'; g.font = '11px Segoe UI'; g.textAlign = 'center';
    g.fillText(lab, x + 13, base + 13); g.textAlign = 'left';
  }
  SU.loop(cv.c, dt => {
    const l = L.get(), m = M.get(), dmp = D.get();
    om += (-G / l * Math.sin(th) - dmp * om) * dt;
    th += om * dt;
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
  });
});

/* ---------------- Collision lab ---------------- */
Sims.register('collision', 'Collision Lab', 'Momentum always survives; KE may not.', '🎱', frame => {
  const cv = SU.canvas(frame, 240);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  let a, b, KE0 = 1;
  const rad = m => 10 + Math.sqrt(m) * 5;
  const relaunch = () => {
    a = { m: 0, v: V1.get(), x: cv.W * 0.22, r: 0 };
    b = { m: 0, v: V2.get(), x: cv.W * 0.78, r: 0 };
    a.m = M1.get(); a.r = rad(a.m);
    b.m = M2.get(); b.r = rad(b.m);
    KE0 = 0.5 * a.m * a.v * a.v + 0.5 * b.m * b.v * b.v || 1;
  };
  const M1 = SU.slider(ctr, 'Mass 1 (kg)', 0.5, 8, 0.5, 3, relaunch);
  const M2 = SU.slider(ctr, 'Mass 2 (kg)', 0.5, 8, 0.5, 1, relaunch);
  const V1 = SU.slider(ctr, 'Velocity 1 (m/s)', -8, 8, 0.5, 4, relaunch);
  const V2 = SU.slider(ctr, 'Velocity 2 (m/s)', -8, 8, 0.5, 0, relaunch);
  const E = SU.slider(ctr, 'Elasticity e', 0, 1, 0.05, 1, () => {}, v => v.toFixed(2));
  const rP = SU.readout(ro, 'Total p'), rK = SU.readout(ro, 'Total KE'), rSt = SU.readout(ro, 'Type'), rLoss = SU.readout(ro, 'KE lost');
  relaunch();
  SU.btn(act, '⟲ Relaunch', relaunch, true);
  const gy = () => cv.H * 0.66;
  SU.loop(cv.c, dt => {
    a.x += a.v * 30 * dt; b.x += b.v * 30 * dt;
    const gap = a.r + b.r;
    if (Math.abs(b.x - a.x) < gap && a.v !== b.v) {
      const u1 = a.v, u2 = b.v, e = E.get();
      a.v = (e * b.m * (u2 - u1) + a.m * u1 + b.m * u2) / (a.m + b.m);
      b.v = (e * a.m * (u1 - u2) + a.m * u1 + b.m * u2) / (a.m + b.m);
      const mid = (a.x + b.x) / 2; a.x = mid - gap / 2; b.x = mid + gap / 2;
    }
    [[a], [b]].forEach(([p]) => {
      if (p.x < p.r) { p.x = p.r; p.v = Math.abs(p.v); }
      if (p.x > cv.W - p.r) { p.x = cv.W - p.r; p.v = -Math.abs(p.v); }
    });
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
  let pl, trail = [], dead = 0;
  const launch = () => { pl = { x: CX() + 190, y: CY, vx: 0, vy: -V0.get() }; trail = []; };
  const V0 = SU.slider(ctr, 'Launch speed', 30, 120, 1, 66, launch);
  const rV = SU.readout(ro, 'Speed'), rR = SU.readout(ro, 'Distance'), rS = SU.readout(ro, 'Status');
  SU.btn(act, '⟲ Relaunch', launch);
  launch();
  SU.loop(cv.c, dt => {
    if (!pl) pl = {};
    if (dead > 0) { dead -= dt; if (dead <= 0) { dead = 0; launch(); } }
    else {
      const dx = pl.x - CX(), dy = pl.y - CY, r = Math.hypot(dx, dy) || 1;
      const acc = GM / (r * r);
      pl.vx -= acc * dx / r * dt; pl.vy -= acc * dy / r * dt;
      pl.x += pl.vx * dt; pl.y += pl.vy * dt;
      trail.push([pl.x, pl.y]); if (trail.length > 600) trail.shift();
      const en = 0.5 * (pl.vx * pl.vx + pl.vy * pl.vy) - GM / r;
      rV.set(Math.hypot(pl.vx, pl.vy).toFixed(0) + ' px/s');
      rR.set(r.toFixed(0) + ' px');
      rS.set(en < 0 ? '🟢 Bound' : '🔴 Escaping');
      if (r < 18 || r > 1500) { rS.set(r < 18 ? '💥 Crashed!' : '🌌 Lost to space'); dead = 1.2; }
    }
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
  });
});
