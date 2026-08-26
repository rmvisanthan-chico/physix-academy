/* PhysiX Academy — Simulations Part D: efield, induction, lens */
'use strict';

/* ---------------- Electric field lines ---------------- */
Sims.register('efield', 'Electric Field Mapper', 'Field lines from + to −; click to drop a test charge.', '⚡', frame => {
  const cv = SU.canvas(frame, 320);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  let Q1, Q2;
  const retrace = () => { lines = trace(); probes = []; };
  Q1 = SU.slider(ctr, 'Left charge q₁', -4, 4, 1, 2, () => retrace());
  Q2 = SU.slider(ctr, 'Right charge q₂', -4, 4, 1, -2, () => retrace());
  const rE = SU.readout(ro, '|E| at cursor');
  const chPos = () => [[cv.W * 0.3, cv.H / 2, Q1.get()], [cv.W * 0.7, cv.H / 2, Q2.get()]];
  function fieldAt(x, y) {
    let ex = 0, ey = 0;
    chPos().forEach(([cx, cy, q]) => {
      const dx = x - cx, dy = y - cy, r2 = dx * dx + dy * dy || 40;
      const e = q * 40000 / (r2 * Math.sqrt(r2)) * Math.sqrt(r2) / Math.sqrt(r2);
      const mag = q * 200000 / r2;
      ex += mag * dx / Math.sqrt(r2); ey += mag * dy / Math.sqrt(r2);
    });
    return [ex, ey];
  }
  function trace() {
    const out = [];
    chPos().forEach(([cx, cy, q]) => {
      if (q <= 0) return;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * 2 * Math.PI;
        let x = cx + Math.cos(a) * 12, y = cy + Math.sin(a) * 12;
        const pts = [[x, y]];
        for (let s = 0; s < 400; s++) {
          const [ex, ey] = fieldAt(x, y);
          const m = Math.hypot(ex, ey) || 1;
          x += ex / m * 4; y += ey / m * 4;
          pts.push([x, y]);
          if (x < -20 || x > cv.W + 20 || y < -20 || y > cv.H + 20) break;
          let hitNeg = false;
          chPos().forEach(([nx, ny, nq]) => { if (nq < 0 && Math.hypot(x - nx, y - ny) < 12) hitNeg = true; });
          if (hitNeg) break;
        }
        out.push(pts);
      }
    });
    return out;
  }
  let lines = [], probes = [];
  setTimeout(retrace, 50);
  SU.loop(cv.c, dt => {
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.lineWidth = 1.3;
    lines.forEach(pts => {
      g.strokeStyle = 'rgba(34,211,238,.55)';
      g.beginPath();
      pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
      g.stroke();
      const mid = pts[Math.floor(pts.length / 2)];
      if (mid && pts.length > 6) {
        const prev = pts[Math.floor(pts.length / 2) - 2];
        const ang = Math.atan2(mid[1] - prev[1], mid[0] - prev[0]);
        g.save(); g.translate(mid[0], mid[1]); g.rotate(ang);
        g.fillStyle = 'rgba(34,211,238,.8)';
        g.beginPath(); g.moveTo(5, 0); g.lineTo(-3, -3.5); g.lineTo(-3, 3.5); g.fill();
        g.restore();
      }
    });
    probes.forEach(p => {
      const [ex, ey] = fieldAt(p.x, p.y);
      p.vx += ex * dt * 0.02; p.vy += ey * dt * 0.02;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.tr.push([p.x, p.y]); if (p.tr.length > 60) p.tr.shift();
      g.strokeStyle = 'rgba(251,191,36,.7)'; g.lineWidth = 1.5;
      g.beginPath();
      p.tr.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]));
      g.stroke();
      g.fillStyle = '#fbbf24';
      g.beginPath(); g.arc(p.x, p.y, 4, 0, 7); g.fill();
    });
    probes = probes.filter(p => p.x > 10 && p.x < cv.W - 10 && p.y > 10 && p.y < cv.H - 10);
    chPos().forEach(([cx, cy, q]) => {
      if (!q) return;
      g.fillStyle = q > 0 ? '#f87171' : '#6d5df6';
      g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 13px Segoe UI'; g.textAlign = 'center';
      g.fillText(q > 0 ? '+' : '−', cx, cy + 5); g.textAlign = 'left';
    });
  });
  cv.c.addEventListener('mousemove', e => {
    const rc = cv.c.getBoundingClientRect();
    const [ex, ey] = fieldAt(e.clientX - rc.left, e.clientY - rc.top);
    rE.set(Math.hypot(ex, ey).toFixed(0));
  });
  cv.c.addEventListener('click', e => {
    const rc = cv.c.getBoundingClientRect();
    probes.push({ x: e.clientX - rc.left, y: e.clientY - rc.top, vx: 0, vy: 0, tr: [] });
  });
});

/* ---------------- Electromagnetic induction ---------------- */
Sims.register('induction', "Faraday's Induction", 'Moving magnet → changing flux → EMF.', '🌀', frame => {
  const cv = SU.canvas(frame, 280);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  let mx, phiPrev = 0, emfSm = 0, emfTrace = [];
  const reset = () => { mx = 60; };
  const VS = SU.slider(ctr, 'Magnet velocity', -160, 160, 5, 70, () => {});
  const NC = SU.slider(ctr, 'Coil turns N', 1, 20, 1, 8, () => {});
  const rPhi = SU.readout(ro, 'Flux Φ'), rEmf = SU.readout(ro, 'EMF'), rDir = SU.readout(ro, 'Induced current');
  reset();
  SU.btn(act, '⟲ Reset', reset);
  const coilX = () => cv.W * 0.62;
  function fluxAt(x) {
    const d = Math.abs(x - coilX());
    return 9000 / (d * d + 900) * Math.sign(coilX() - x || 1);
  }
  SU.loop(cv.c, dt => {
    mx += VS.get() * dt;
    if (mx < 30) { mx = 30; VS.set(Math.abs(VS.get())); }
    if (mx > cv.W - 30) { mx = cv.W - 30; VS.set(-Math.abs(VS.get())); }
    const phi = fluxAt(mx);
    const emf = -NC.get() * (phi - phiPrev) / Math.max(dt, 0.001);
    phiPrev = phi;
    emfSm += (emf - emfSm) * 0.15;
    rPhi.set(phi.toFixed(2) + ' mWb');
    rEmf.set(emfSm.toFixed(2) + ' V');
    rDir.set(emfSm > 0.05 ? '↻ one way' : emfSm < -0.05 ? '↺ other way' : '— none');
    const g = cv.g, cy = cv.H * 0.44;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    for (let i = -3; i <= 3; i++) {
      g.strokeStyle = '#9aa8c3'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(coilX(), cy + i * 14, 10, 12, 0, 0, 7); g.stroke();
    }
    if (Math.abs(emfSm) > 0.05) {
      g.fillStyle = '#22d3ee'; g.font = 'bold 18px Segoe UI'; g.textAlign = 'center';
      g.fillText(emfSm > 0 ? '↻' : '↺', coilX(), cy - 58); g.textAlign = 'left';
    }
    g.fillStyle = '#f87171'; g.fillRect(mx - 34, cy - 11, 34, 22);
    g.fillStyle = '#e8edf7'; g.font = 'bold 11px Segoe UI';
    g.fillText('N', mx - 22, cy + 4);
    g.fillStyle = '#34d399'; g.fillRect(mx, cy - 11, 34, 22);
    g.fillStyle = '#04281c'; g.fillText('S', mx + 12, cy + 4);
    const gx0 = 30, gyMid = cv.H - 42;
    g.strokeStyle = '#26314a'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(gx0, gyMid); g.lineTo(cv.W - 20, gyMid); g.stroke();
    g.strokeStyle = '#22d3ee'; g.lineWidth = 2; g.beginPath();
    emfTrace.forEach((v, i) => {
      const X = gx0 + i / 240 * (cv.W - 60), Y = gyMid - v * 24;
      i ? g.lineTo(X, Y) : g.moveTo(X, Y);
    });
    g.stroke();
    emfTrace.push(emfSm); if (emfTrace.length > 240) emfTrace.shift();
    g.fillStyle = '#6b7a99'; g.font = '10px Segoe UI';
    g.fillText('EMF(t)', gx0, cv.H - 8);
  });
});

/* ---------------- Converging lens bench ---------------- */
Sims.register('lens', 'Converging Lens Bench', 'Rays never lie: real and virtual images.', '🔭', frame => {
  const cv = SU.canvas(frame, 300);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const F = SU.slider(ctr, 'Focal length f (px)', 50, 150, 5, 90, () => {});
  const U = SU.slider(ctr, 'Object distance (px)', 30, 300, 5, 180, () => {});
  const OH = SU.slider(ctr, 'Object height (px)', 20, 70, 5, 45, () => {});
  const rV = SU.readout(ro, 'Image distance'), rM = SU.readout(ro, 'Magnification'), rNat = SU.readout(ro, 'Nature');
  SU.loop(cv.c, () => {
    const f = F.get(), dobj = U.get(), oh = OH.get();
    const di = 1 / (1 / f - 1 / dobj);
    const m = -di / dobj;
    const ih = oh * Math.abs(m);
    rV.set((di > 0 ? '+' : '') + di.toFixed(0) + ' px (' + (di > 0 ? 'behind lens' : 'same side') + ')');
    rM.set(m.toFixed(2));
    rNat.set(di > 0 ? 'Real · inverted' : 'Virtual · upright');
    const g = cv.g, axisY = cv.H * 0.55;
    const lensX = cv.W * 0.52, scale = 1;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = '#33415c'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, axisY); g.lineTo(cv.W, axisY); g.stroke();
    g.strokeStyle = 'rgba(107,122,153,.35)';
    [f, -f].forEach(off => {
      g.beginPath(); g.arc(lensX + off, axisY, 4, 0, 7); g.stroke();
      g.fillStyle = '#6b7a99'; g.font = '10px Segoe UI';
      g.fillText(off > 0 ? "F'" : 'F', lensX + off - 3, axisY + 16);
    });
    g.strokeStyle = '#22d3ee'; g.lineWidth = 3;
    g.beginPath();
    g.ellipse(lensX, axisY, 13, cv.H * 0.38, 0, 0, 7);
    g.stroke();
    g.fillStyle = 'rgba(34,211,238,.07)'; g.fill();
    const objX = lensX - dobj, imgX = lensX + di;
    g.strokeStyle = '#fbbf24'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(objX, axisY); g.lineTo(objX, axisY - oh); g.stroke();
    const tipY = axisY - oh;
    const ray = (x1, y1, x2, y2, col, dash) => {
      g.strokeStyle = col; g.lineWidth = 1.6; g.setLineDash(dash || []);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]);
    };
    ray(objX, tipY, lensX, tipY, 'rgba(248,113,113,.95)');
    const slopeA = (ih * Math.sign(m) - (tipY - axisY)) / Math.max(1, di);
    const endYA = axisY + (di > 0 ? ih * Math.sign(-m) : 0) ;
    ray(lensX, tipY, imgX, axisY - oh * m, 'rgba(248,113,113,.95)');
    ray(objX, tipY, lensX, tipY, 'rgba(52,211,153,.95)');
    ray(lensX, tipY, imgX, axisY - oh * m, 'rgba(52,211,153,.95)');
    if (di < 0) {
      ray(lensX, tipY, objX - 130, tipY + (tipY - (axisY - oh * m)) / (imgX - lensX) * (objX - 130 - lensX) * -1, 'rgba(248,113,113,.4)', [5, 4]);
      ray(imgX, axisY - oh * m, objX, axisY - oh * m, 'rgba(248,113,113,.5)', [5, 4]);
    }
    g.strokeStyle = di > 0 ? '#34d399' : '#f87171';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(imgX, axisY); g.lineTo(imgX, axisY - oh * m); g.stroke();
    if (di < 0) { g.globalAlpha = 0.65; g.beginPath(); g.moveTo(imgX, axisY); g.lineTo(imgX, axisY - oh * m); g.stroke(); g.globalAlpha = 1; }
    g.fillStyle = '#6b7a99'; g.font = '11px Segoe UI';
    g.fillText('object', objX - 18, axisY + 16);
    g.fillText(di > 0 ? 'image' : '(virtual image)', imgX - 18, axisY + 16);
  });
});
