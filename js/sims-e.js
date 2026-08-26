/* PhysiX Academy — Simulations Part E: richer, more realistic, classroom-friendly sims */
'use strict';

/* local drawing helpers */
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

/* ---------------- 1. Inclined plane ---------------- */
Sims.register('incline', 'Inclined Plane', 'Weight splits into a slide-force and a press-force; friction fights back.', '📐', frame => {
  const cv = SU.canvas(frame, 300);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  const G = 9.8, Lp = 220, kf = 0.72;
  let s = 0, v = 0;
  const reset = () => { s = 0; v = 0; };
  const TH = SU.slider(ctr, 'Angle θ (°)', 0, 65, 1, 32, reset);
  const M = SU.slider(ctr, 'Mass m (kg)', 0.5, 12, 0.5, 4, reset);
  const MU = SU.slider(ctr, 'Friction μ', 0, 0.7, 0.01, 0.12, reset, v => v.toFixed(2));
  const rA = SU.readout(ro, 'a'), rN = SU.readout(ro, 'Normal N'), rFr = SU.readout(ro, 'Friction f'), rSt = SU.readout(ro, 'Status');
  SU.btn(act, '⟲ Reset', reset);
  SU.loop(cv.c, dt => {
    const th = TH.get() * Math.PI / 180, m = M.get(), mu = MU.get(), mg = m * G;
    const N = mg * Math.cos(th), fp = mg * Math.sin(th), fmax = mu * N;
    const slides = fp > fmax && th > 0.001;
    const a = slides ? G * (Math.sin(th) - mu * Math.cos(th)) : 0;
    if (slides) { v += a * dt; s += v * dt; }
    if (s > Lp) { s = Lp; v = 0; }
    rA.set(a.toFixed(2) + ' m/s²'); rN.set(N.toFixed(1) + ' N'); rFr.set((slides ? fmax : fp).toFixed(1) + ' N');
    rSt.set(!slides && th < 0.001 ? 'Flat — no slide' : slides ? 'Sliding ⏷' : 'Held by friction');
    const g = cv.g, Bx = 70, By = 250;
    const Tx = Bx + Lp * Math.cos(th), Ty = By - Lp * Math.sin(th);
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = '#26314a'; g.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { const xx = Bx + Lp * Math.cos(th) * i / 10; g.beginPath(); g.moveTo(xx, By - Lp * Math.sin(th) * i / 10); g.lineTo(xx, By + 8); g.stroke(); }
    g.fillStyle = '#1b2233'; g.strokeStyle = '#3a4660'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(Bx, By); g.lineTo(Tx, Ty); g.lineTo(Tx, By); g.closePath(); g.fill(); g.stroke();
    const bx = Tx - s * Math.cos(th), by = Ty + s * Math.sin(th);
    g.save(); g.translate(bx, by); g.rotate(-th);
    g.fillStyle = '#6d5df6'; g.fillRect(-20, -16, 40, 32);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(-20, -16, 40, 8);
    g.restore();
    pxArrow(g, bx, by, 0, mg * kf, '#f87171');                 // weight
    pxArrow(g, bx, by, -Math.sin(th) * N * kf, -Math.cos(th) * N * kf, '#22d3ee'); // normal
    const fNow = slides ? fmax : fp;
    pxArrow(g, bx, by, Math.cos(th) * fNow * kf, -Math.sin(th) * fNow * kf, '#34d399'); // friction (up-slope)
    pxArrow(g, bx, by, -Math.cos(th) * fp * kf, Math.sin(th) * fp * kf, 'rgba(251,191,36,.7)', 2); // parallel comp
    pxLabel(g, bx + 8, by + mg * kf + 4, 'mg', '#f87171');
    pxLabel(g, bx - Math.sin(th) * N * kf - 30, by - Math.cos(th) * N * kf, 'N', '#22d3ee');
    pxLabel(g, bx + Math.cos(th) * fNow * kf + 6, by - Math.sin(th) * fNow * kf, 'f', '#34d399');
  });
});

/* ---------------- 2. Atwood machine ---------------- */
Sims.register('atwood', 'Atwood Machine', 'Two masses, one rope, one acceleration: a = (m₂−m₁)g / (m₁+m₂).', '⚖️', frame => {
  const cv = SU.canvas(frame, 300);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  const G = 9.8, kf = 0.9, PMAX = 84;
  let d = 0, v = 0;
  const reset = () => { d = 0; v = 0; };
  const M1 = SU.slider(ctr, 'Mass m₁ (kg)', 0.5, 8, 0.5, 2, reset);
  const M2 = SU.slider(ctr, 'Mass m₂ (kg)', 0.5, 8, 0.5, 5, reset);
  const rA = SU.readout(ro, 'a'), rT = SU.readout(ro, 'Tension T'), rDir = SU.readout(ro, 'Heavier');
  SU.btn(act, '⟲ Reset', reset);
  SU.loop(cv.c, dt => {
    const m1 = M1.get(), m2 = M2.get();
    const heavyRight = m2 >= m1;
    const aMag = Math.abs(m2 - m1) * G / (m1 + m2);
    if (d < PMAX) { v += aMag * dt; d += v * dt; }
    if (d > PMAX) { d = PMAX; v = 0; }
    const T = 2 * m1 * m2 * G / (m1 + m2);
    rA.set(aMag.toFixed(2) + ' m/s²'); rT.set(T.toFixed(1) + ' N'); rDir.set(heavyRight ? 'm₂ ↓' : 'm₁ ↓');
    const g = cv.g, cx = cv.W / 2, py = 42, y0 = 130;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.fillStyle = '#33415c'; g.beginPath(); g.arc(cx, py, 26, 0, 7); g.fill();
    g.fillStyle = '#0b1120'; g.beginPath(); g.arc(cx, py, 9, 0, 7); g.fill();
    g.strokeStyle = '#9aa8c3'; g.lineWidth = 2;
    const yL = y0 - d, yR = y0 + d;
    g.beginPath(); g.moveTo(cx - 26, py); g.lineTo(cx - 26, yL); g.moveTo(cx + 26, py); g.lineTo(cx + 26, yR); g.stroke();
    const draw = (x, y, m, col) => {
      g.fillStyle = col; g.fillRect(x - 22, y - 22, 44, 44);
      g.fillStyle = '#fff'; g.font = 'bold 12px Segoe UI'; g.textAlign = 'center'; g.fillText(m + 'kg', x, y + 4); g.textAlign = 'left';
      pxArrow(g, x, y + 22, 0, m * G * kf, '#f87171');
      pxArrow(g, x, y - 22, 0, -T * kf, '#22d3ee');
    };
    if (heavyRight) { draw(cx - 26, yL, m1, '#22d3ee'); draw(cx + 26, yR, m2, '#fbbf24'); }
    else { draw(cx - 26, yL, m1, '#fbbf24'); draw(cx + 26, yR, m2, '#22d3ee'); }
  });
});

/* ---------------- 3. Standing waves on a string ---------------- */
Sims.register('standing', 'Standing Waves', 'Two equal waves meet — fixed ends force nodes and antinodes.', '〰️', frame => {
  const cv = SU.canvas(frame, 260);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('sim-readouts'); frame.appendChild(ro);
  const N = SU.slider(ctr, 'Harmonic n', 1, 6, 1, 3, () => {});
  const A = SU.slider(ctr, 'Amplitude', 8, 60, 1, 36, () => {});
  const rL = SU.readout(ro, 'λ = 2L/n'), rF = SU.readout(ro, 'f ∝ n');
  let t = 0;
  SU.loop(cv.c, dt => {
    t += dt;
    const x0 = 40, L = cv.W - 80, mid = cv.H / 2, n = N.get(), amp = A.get();
    rL.set((2 * L / n).toFixed(0) + ' px'); rF.set(n + ' × base');
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.strokeStyle = '#26314a'; g.lineWidth = 1; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(x0, mid); g.lineTo(x0 + L, mid); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#22d3ee'; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= L; x += 2) {
      const y = mid - amp * Math.sin(n * Math.PI * x / L) * Math.cos(2 * Math.PI * 0.6 * t);
      x ? g.lineTo(x0 + x, y) : g.moveTo(x0 + x, y);
    }
    g.stroke();
    for (let p = 0; p <= n; p++) {
      const xn = x0 + p * L / n;
      g.fillStyle = '#f87171'; g.beginPath(); g.arc(xn, mid, 4, 0, 7); g.fill();
    }
    pxLabel(g, x0 - 34, mid + 4, 'nodes', '#f87171');
  });
});

/* ---------------- 4. Wave interference (ripple tank) ---------------- */
Sims.register('interference', 'Wave Interference', 'Two sources: crests add (bright) or cancel (dark). Path difference rules it.', '🌐', frame => {
  const cv = SU.canvas(frame, 280);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('sim-readouts'); frame.appendChild(ro);
  const OW = 200, OH = 100;
  const oc = document.createElement('canvas'); oc.width = OW; oc.height = OH;
  const octx = oc.getContext('2d'); const img = octx.createImageData(OW, OH);
  const D = SU.slider(ctr, 'Separation d', 40, 320, 2, 150, () => {});
  const WL = SU.slider(ctr, 'Wavelength λ', 18, 120, 1, 48, () => {});
  const rNote = SU.readout(ro, 'Note');
  let t = 0;
  SU.loop(cv.c, dt => {
    t += dt;
    const mid = OH / 2, sx1 = OW / 2 - D.get() / 2 / (cv.W / OW), sx2 = OW / 2 + D.get() / 2 / (cv.W / OW);
    const k = 2 * Math.PI / WL.get(), w = 2 * Math.PI * 0.5;
    const data = img.data;
    for (let j = 0; j < OH; j++) {
      for (let i = 0; i < OW; i++) {
        const x = i, y = j;
        const r1 = Math.hypot(x - sx1, y - mid), r2 = Math.hypot(x - sx2, y - mid);
        const z = Math.sin(k * r1 - w * t) + Math.sin(k * r2 - w * t);
        const inten = (z * 0.5 + 1);
        const c = Math.max(0, Math.min(255, inten * 190 + 20));
        const o = (j * OW + i) * 4;
        data[o] = c * 0.4; data[o + 1] = c * 0.8; data[o + 2] = c; data[o + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.drawImage(oc, 0, 0, cv.W, cv.H);
    const psx1 = OW / 2 - D.get() / 2, psx2 = OW / 2 + D.get() / 2;
    g.fillStyle = '#fbbf24';
    g.beginPath(); g.arc(psx1 / OW * cv.W, cv.H / 2, 7, 0, 7); g.fill();
    g.beginPath(); g.arc(psx2 / OW * cv.W, cv.H / 2, 7, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.setLineDash([5, 5]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, cv.H / 2); g.lineTo(cv.W, cv.H / 2); g.stroke(); g.setLineDash([]);
    rNote.set('Bright where path diff = nλ');
  });
});

/* ---------------- 5. Refraction / Snell's law ---------------- */
Sims.register('refraction', 'Refraction (Snell)', 'Light bends toward the normal entering a denser medium; past the critical angle it reflects.', '🔆', frame => {
  const cv = SU.canvas(frame, 280);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('sim-readouts'); frame.appendChild(ro);
  const N1 = SU.slider(ctr, 'n₁ (top)', 1, 2, 0.01, 1, () => {}, v => v.toFixed(2));
  const N2 = SU.slider(ctr, 'n₂ (bottom)', 1, 2.4, 0.01, 1.5, () => {}, v => v.toFixed(2));
  const TH = SU.slider(ctr, 'θ₁ (°)', 5, 85, 1, 40, () => {});
  const rT2 = SU.readout(ro, 'θ₂'), rC = SU.readout(ro, 'Critical'), rSt = SU.readout(ro, 'Result');
  SU.loop(cv.c, dt => {
    const n1 = N1.get(), n2 = N2.get(), th1 = TH.get() * Math.PI / 180, mid = cv.H / 2;
    const ix = cv.W * 0.30;
    const sin2 = n1 / n2 * Math.sin(th1);
    const tir = sin2 > 1;
    const th2 = tir ? 0 : Math.asin(sin2);
    const crit = n2 > n1 ? Math.asin(n1 / n2) * 180 / Math.PI : Infinity;
    rT2.set(tir ? '—' : (th2 * 180 / Math.PI).toFixed(1) + '°');
    rC.set(isFinite(crit) ? crit.toFixed(1) + '°' : 'none');
    rSt.set(tir ? '💡 Total internal reflection' : 'Refracted');
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.fillStyle = 'rgba(34,211,238,.06)'; g.fillRect(0, mid, cv.W, cv.H - mid);
    g.fillStyle = '#6b7a99'; g.font = '11px Segoe UI';
    g.fillText('medium n₁', 12, 18); g.fillText('medium n₂', 12, mid + 18);
    g.strokeStyle = 'rgba(154,168,195,.5)'; g.lineWidth = 1; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(0, mid); g.lineTo(cv.W, mid); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(154,168,195,.4)'; g.beginPath(); g.moveTo(ix, 0); g.lineTo(ix, cv.H); g.stroke();
    const P = [ix, mid];
    const inc = [Math.sin(th1), Math.cos(th1)];
    pxArrow(g, ix - inc[0] * 110, 0 + 6, inc[0] * 110, inc[1] * 110, '#fbbf24');
    if (tir) {
      const ref = [Math.sin(th1), -Math.cos(th1)];
      pxArrow(g, P[0], P[1], ref[0] * 100, ref[1] * 100, '#22d3ee');
    } else {
      const refr = [Math.sin(th2), Math.cos(th2)];
      pxArrow(g, P[0], P[1], refr[0] * 100, refr[1] * 100, '#22d3ee');
    }
    g.fillStyle = '#9aa8c3'; g.font = '11px Segoe UI';
    g.fillText('θ₁=' + TH.get() + '°', ix + 14, mid - 8);
    if (!tir) g.fillText('θ₂=' + (th2 * 180 / Math.PI).toFixed(0) + '°', ix + 14, mid + 22);
  });
});

/* ---------------- 6. Buoyancy / Archimedes ---------------- */
Sims.register('buoyancy', 'Buoyancy', 'Buoyant force = weight of displaced fluid. Float if ρ < ρ_fluid.', '🛟', frame => {
  const cv = SU.canvas(frame, 290);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  const G = 9.8, sc = 120;
  let y = 0, vy = 0;
  const reset = () => { y = 0; vy = 0; };
  const RB = SU.slider(ctr, 'Block density ρ (kg/m³)', 200, 2000, 10, 600, reset);
  const RF = SU.slider(ctr, 'Fluid density ρ_f', 500, 1500, 10, 1000, reset);
  const S = SU.slider(ctr, 'Block side (m)', 0.2, 0.6, 0.02, 0.4, reset, v => v.toFixed(2));
  const rW = SU.readout(ro, 'Weight'), rB = SU.readout(ro, 'Buoyant'), rSt = SU.readout(ro, 'Status');
  SU.btn(act, '⟲ Drop', reset);
  SU.loop(cv.c, dt => {
    const rb = RB.get(), rf = RF.get(), side = S.get();
    const V = side * side * side;
    const W = rb * G * V, Bmax = rf * G * V;
    const floats = rb < rf;
    const waterTop = 96, tankBot = cv.H - 18, px = cv.W / 2, bs = side * sc;
    if (floats) {
      const subFrac = rb / rf;
      y = waterTop + (1 - subFrac) * bs; vy = 0;
    } else {
      const m = rb * V, a = (W - Bmax) / m;
      vy += a * dt; y += vy * dt;
      if (y > tankBot - bs) { y = tankBot - bs; vy = 0; }
    }
    rW.set((W / 1000).toFixed(2) + ' kN'); rB.set((Bmax / 1000).toFixed(2) + ' kN');
    rSt.set(floats ? '🟢 Floating' : '🔴 Sinking');
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    g.fillStyle = 'rgba(34,211,238,.18)'; g.fillRect(px - 110, waterTop, 220, tankBot - waterTop);
    g.strokeStyle = '#22d3ee'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px - 110, waterTop); g.lineTo(px + 110, waterTop); g.stroke();
    g.fillStyle = rb < rf ? '#34d399' : '#f87171';
    g.fillRect(px - bs / 2, y, bs, bs);
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(px - bs / 2, y, bs, 6);
    const cyc = y + bs / 2;
    pxArrow(g, px, cyc, 0, 42, '#f87171');                 // weight (down)
    pxArrow(g, px, cyc, 0, -42 * (floats ? rb / rf : 1), '#22d3ee'); // buoyant (up)
    pxLabel(g, px + 10, cyc + 46, 'W', '#f87171');
    pxLabel(g, px + 10, cyc - 42 * (floats ? rb / rf : 1) - 6, 'B', '#22d3ee');
  });
});

/* ---------------- 7. RC circuit (capacitor charging) ---------------- */
Sims.register('rc', 'RC Circuit', 'Capacitor fills as Vc = V(1−e^(−t/RC)); the time constant τ = RC.', '🔋', frame => {
  const cv = SU.canvas(frame, 270);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  const V = SU.slider(ctr, 'Battery V', 1, 12, 0.5, 9, () => {});
  const R = SU.slider(ctr, 'R (kΩ)', 0.5, 20, 0.5, 4, () => {});
  const C = SU.slider(ctr, 'C (mF)', 0.1, 10, 0.1, 2, () => {});
  const rTau = SU.readout(ro, 'τ = RC'), rVc = SU.readout(ro, 'V_cap'), rI = SU.readout(ro, 'Current I');
  let t = 0, mode = 1, ph = 0;
  const reset = () => { t = 0; };
  SU.btn(act, '⚡ Charge', () => { mode = 1; t = 0; });
  SU.btn(act, '⬇ Discharge', () => { mode = 0; t = 0; });
  const hist = [];
  SU.loop(cv.c, dt => {
    t += dt;
    const Rf = R.get() * 1000, Cf = C.get() * 1e-3, tau = Rf * Cf;
    const V0 = V.get();
    const Vc = mode ? V0 * (1 - Math.exp(-t / tau)) : V0 * Math.exp(-t / tau);
    const I = mode ? V0 / Rf * Math.exp(-t / tau) : -V0 / Rf * Math.exp(-t / tau);
    rTau.set((tau * 1000).toFixed(0) + ' ms'); rVc.set(Vc.toFixed(2) + ' V'); rI.set((I * 1000).toFixed(2) + ' mA');
    ph = (ph + Math.min(1, Math.abs(I) * 4000) * dt) % 1;
    hist.push(Vc); if (hist.length > 200) hist.shift();
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    const L = 60, T = 60, Rt = cv.W - 70, B = cv.H - 70, mx = (L + Rt) / 2;
    g.strokeStyle = '#4a5878'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(L, T); g.lineTo(mx - 40, T); g.moveTo(mx + 40, T); g.lineTo(Rt, T);
    g.moveTo(Rt, T); g.lineTo(Rt, B); g.moveTo(L, B); g.lineTo(L, T); g.stroke();
    g.beginPath(); g.moveTo(L, T); g.lineTo(L, B); g.stroke();
    g.strokeStyle = '#9aa8c3'; g.lineWidth = 3;
    let zx = mx - 40; g.beginPath(); g.moveTo(zx, T);
    for (let i = 0; i < 7; i++) { g.lineTo(zx + 5, T + (i % 2 ? 11 : -11)); zx += 5; }
    g.lineTo(mx - 40, T); g.lineTo(mx + 40, T); g.stroke();
    g.strokeStyle = '#fbbf24'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(mx - 14, T - 16); g.lineTo(mx - 14, T + 16); g.moveTo(mx + 14, T - 16); g.lineTo(mx + 14, T + 16); g.stroke();
    g.fillStyle = 'rgba(251,191,36,' + (Vc / V0 * 0.8 + 0.05) + ')';
    g.fillRect(mx - 14, T + 16 - (Vc / V0) * 30, 28, (Vc / V0) * 30);
    for (let n = 0; n < 14; n++) {
      let want = ((ph + n / 14) % 1);
      const seg = want < 0.5 ? want * 2 : (1 - (want - 0.5) * 2);
      const px = L + (Rt - L) * (want < 0.5 ? want * 2 : (want - 0.5) * 2);
      const onTop = want < 0.5;
      const py = onTop ? T : B;
      g.fillStyle = mode ? '#22d3ee' : '#f87171';
      g.beginPath(); g.arc(px, py, 3, 0, 7); g.fill();
    }
    const gx0 = 40, gy0 = cv.H - 24, gw = cv.W - 70;
    g.strokeStyle = '#26314a'; g.lineWidth = 1; g.strokeRect(gx0, gy0 - 70, gw, 70);
    g.strokeStyle = '#34d399'; g.lineWidth = 2; g.beginPath();
    hist.forEach((v, i) => { const X = gx0 + i / 200 * gw, Y = gy0 - v / 12 * 66; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.stroke();
    g.fillStyle = '#6b7a99'; g.font = '10px Segoe UI'; g.fillText('V_cap(t)', gx0, gy0 - 74);
  });
});

/* ---------------- 8. Newton's law of cooling ---------------- */
Sims.register('cooling', 'Cooling Curve', 'T(t) = T_amb + (T₀−T_amb)·e^(−kt). Hot bodies lose heat exponentially.', '🌡️', frame => {
  const cv = SU.canvas(frame, 280);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  const Tamb = SU.slider(ctr, 'Ambient T_amb', 0, 40, 1, 20, () => {});
  const T0 = SU.slider(ctr, 'Start T₀', 50, 100, 1, 90, () => {});
  const K = SU.slider(ctr, 'Rate k', 0.02, 0.4, 0.01, 0.12, () => {}, v => v.toFixed(2));
  const rT = SU.readout(ro, 'T now'), rHalf = SU.readout(ro, 'Half-life');
  let t = 0; const reset = () => { t = 0; };
  SU.btn(act, '⟲ Reset', reset);
  const hist = [];
  SU.loop(cv.c, dt => {
    t += dt;
    const Ta = Tamb.get(), t0 = T0.get(), k = K.get();
    const T = Ta + (t0 - Ta) * Math.exp(-k * t);
    rT.set(T.toFixed(1) + ' °C'); rHalf.set((Math.log(2) / k).toFixed(1) + ' s');
    hist.push(T); if (hist.length > 240) hist.shift();
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    const tx = 70, top = 40, bot = 230, tubeH = bot - top;
    const TtoY = Tv => bot - (Tv - 0) / 100 * tubeH;
    g.strokeStyle = '#4a5878'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(tx - 14, top, 28, tubeH, 14); g.stroke();
    g.fillStyle = '#f87171';
    const my = TtoY(Math.max(0, Math.min(100, T)));
    g.fillRect(tx - 10, my, 20, bot - my);
    g.fillStyle = '#e8edf7'; g.beginPath(); g.arc(tx, top - 6, 16, 0, 7); g.fill();
    g.fillStyle = '#6b7a99'; g.font = '11px Segoe UI'; g.fillText(T.toFixed(0) + '°C', tx + 24, my + 4);
    const gx0 = 110, gy0 = bot, gw = cv.W - 130, gh = tubeH;
    g.strokeStyle = '#26314a'; g.lineWidth = 1; g.strokeRect(gx0, top, gw, gh);
    g.fillStyle = '#6b7a99'; g.font = '10px Segoe UI'; g.fillText('T vs t', gx0, top - 6);
    g.strokeStyle = '#22d3ee'; g.lineWidth = 2; g.beginPath();
    hist.forEach((v, i) => { const X = gx0 + i / 240 * gw, Y = bot - v / 100 * gh; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.stroke();
    g.strokeStyle = 'rgba(52,211,153,.5)'; g.setLineDash([4, 4]); g.beginPath();
    g.moveTo(gx0, TtoY(Ta)); g.lineTo(gx0 + gw, TtoY(Ta)); g.stroke(); g.setLineDash([]);
  });
});

/* ---------------- 9. 2D collision lab ---------------- */
Sims.register('collision2d', '2D Collision Lab', 'Real elastic collisions in two dimensions — momentum & energy conserved.', '💥', frame => {
  const cv = SU.canvas(frame, 280);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
  const act = SU.el('div', 'sim-actions'); frame.appendChild(act);
  const rad = m => 12 + Math.sqrt(m) * 6;
  let a, b, trailA = [], trailB = [];
  const relaunch = () => {
    a = { m: M1.get(), x: cv.W * 0.3, y: cv.H * 0.4, vx: Math.cos(A1.get() * Math.PI / 180) * S1.get(), vy: Math.sin(A1.get() * Math.PI / 180) * S1.get(), r: 0, col: '#22d3ee' };
    b = { m: M2.get(), x: cv.W * 0.7, y: cv.H * 0.6, vx: -S2.get(), vy: 0, r: 0, col: '#fbbf24' };
    a.r = rad(a.m); b.r = rad(b.m); trailA = []; trailB = [];
  };
  const M1 = SU.slider(ctr, 'Mass 1 (kg)', 0.5, 8, 0.5, 3, relaunch);
  const M2 = SU.slider(ctr, 'Mass 2 (kg)', 0.5, 8, 0.5, 3, relaunch);
  const S1 = SU.slider(ctr, 'Speed 1 (m/s)', 1, 10, 0.5, 5, relaunch);
  const S2 = SU.slider(ctr, 'Speed 2 (m/s)', 0, 10, 0.5, 3, relaunch);
  const A1 = SU.slider(ctr, 'Angle 1 (°)', -80, 80, 1, 20, relaunch);
  const E = SU.slider(ctr, 'Restitution e', 0.2, 1, 0.05, 1, () => {}, v => v.toFixed(2));
  const rP = SU.readout(ro, '|p|'), rK = SU.readout(ro, 'KE'), rSt = SU.readout(ro, 'Type');
  SU.btn(act, '⟲ Relaunch', relaunch, true);
  relaunch();
  const bump = (p, w) => { if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx) * w; } if (p.x > cv.W - p.r) { p.x = cv.W - p.r; p.vx = -Math.abs(p.vx) * w; } if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy) * w; } if (p.y > cv.H - p.r) { p.y = cv.H - p.r; p.vy = -Math.abs(p.vy) * w; } };
  SU.loop(cv.c, dt => {
    a.x += a.vx * 22 * dt; a.y += a.vy * 22 * dt; b.x += b.vx * 22 * dt; b.y += b.vy * 22 * dt;
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
    if (dist < a.r + b.r && dist > 0) {
      const nx = dx / dist, ny = dy / dist;
      const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        const e = E.get(), j = -(1 + e) * vn / (1 / a.m + 1 / b.m);
        a.vx -= j * nx / a.m; a.vy -= j * ny / a.m; b.vx += j * nx / b.m; b.vy += j * ny / b.m;
      }
      const ov = (a.r + b.r - dist) / 2;
      a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    }
    bump(a, 1); bump(b, 1);
    trailA.push([a.x, a.y]); if (trailA.length > 80) trailA.shift();
    trailB.push([b.x, b.y]); if (trailB.length > 80) trailB.shift();
    const p = Math.hypot(a.m * a.vx + b.m * b.vx, a.m * a.vy + b.m * b.vy);
    const ke = 0.5 * a.m * (a.vx * a.vx + a.vy * a.vy) + 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
    rP.set(p.toFixed(1) + ' kg·m/s'); rK.set(ke.toFixed(1) + ' J'); rSt.set(E.get() >= 0.95 ? 'Elastic' : 'Inelastic');
    const g = cv.g;
    g.fillStyle = '#05070d'; g.fillRect(0, 0, cv.W, cv.H);
    const drawTrail = (tr, col) => { g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); tr.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); };
    drawTrail(trailA, 'rgba(34,211,238,.4)'); drawTrail(trailB, 'rgba(251,191,36,.4)');
    [a, b].forEach(p => {
      g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
      pxArrow(g, p.x, p.y, p.vx * 4, p.vy * 4, '#34d399');
      g.fillStyle = '#6b7a99'; g.font = '11px Segoe UI'; g.textAlign = 'center'; g.fillText(p.m + 'kg', p.x, p.y - p.r - 6); g.textAlign = 'left';
    });
  });
});
