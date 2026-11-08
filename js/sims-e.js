import { pxArrow, pxLabel, SU } from './core.js';
import { Sims } from './sims-a.js';
import { createGraph, GRAPH_COLORS as GC } from './graph-engine.js';
import { attachTimeControls } from './sim-controls-helper.js';
/* PhysiX Academy — Simulations Part E: richer, more realistic, classroom-friendly sims */
('use strict');

/* local drawing helpers */

/* ---------------- 1. Inclined plane ---------------- */
Sims.register(
  'incline',
  'Inclined Plane',
  'Weight splits into a slide-force and a press-force; friction fights back.',
  '📐',
  (frame) => {
    const cv = SU.canvas(frame, 300);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const act = SU.el('div', 'sim-actions');
    frame.appendChild(act);
    /* v–t graph: the block's acceleration is constant while it slides, so the
       trace must be a straight line. That is the claim the sim makes and the
       graph is the evidence; before this, a student had to take the number on
       trust. It also makes the threshold case visible — the trace stays flat
       until tan θ passes μ. */
    const graph = createGraph(
      frame,
      {
        xLabel: 'Time',
        xUnit: 's',
        xKey: 't',
        yLabel: 'Velocity',
        yUnit: 'm/s',
        title: 'v–t: constant slope while sliding, flat while held by friction',
        height: 170,
        capacity: 900
      },
      [{ id: 'v', label: 'Velocity v', unit: 'm/s', color: GC.b }]
    );
    const G = 9.8,
      Lp = 220,
      /* Chosen display scale: the 220 px ramp reads as a 2.2 m bench, so the
         distance readout has a unit a student can picture. It scales the
         printed value only - s itself stays in pixels, and the dynamics are
         unchanged by it. */
      PX_PER_M = 100,
      kf = 0.72;
    let s = 0,
      v = 0,
      t = 0;
    const reset = () => {
      s = 0;
      v = 0;
      t = 0;
      graph.clear();
    };
    const TH = SU.slider(ctr, 'Angle θ (°)', 0, 65, 1, 32, reset);
    const M = SU.slider(ctr, 'Mass m (kg)', 0.5, 12, 0.5, 4, reset);
    const MU = SU.slider(ctr, 'Friction μ', 0, 0.7, 0.01, 0.12, reset, (v) => v.toFixed(2));
    const rA = SU.readout(ro, 'a'),
      rN = SU.readout(ro, 'Normal N'),
      rFr = SU.readout(ro, 'Friction f'),
      rS = SU.readout(ro, 'Distance s'),
      rSt = SU.readout(ro, 'Status');
    /* Phase 3C.1: split from the drawing.

     This one earns Step particularly well. The block is held by friction until
     tan(theta) > mu, so the interesting question is "at what angle does it let
     go?" - and the answer is a threshold, not a trajectory. A student can park
     the angle a degree below the threshold, pause, and step to watch the block
     start moving. Running, the transition happens between two frames and is
     invisible. */
    function advance(h) {
      t += h;
      const th = (TH.get() * Math.PI) / 180,
        mu = MU.get();
      const N = M.get() * G * Math.cos(th),
        fp = M.get() * G * Math.sin(th);
      const slides = fp > mu * N && th > 0.001;
      if (!slides) {
        /* Held (or flat): no acceleration, and any residual velocity is gone. */
        v = 0;
        return;
      }
      /* Constant acceleration over the sub-step, so this update is exact for
         the slide phase instead of first-order Euler. */
      const a = G * (Math.sin(th) - mu * Math.cos(th));
      s += v * h + 0.5 * a * h * h;
      v += a * h;
      if (s >= Lp) {
        s = Lp;
        v = 0;
      }
    }

    function sample() {
      graph.push({ t, v });
    }
    function render() {
      const th = (TH.get() * Math.PI) / 180,
        m = M.get(),
        mu = MU.get(),
        mg = m * G;
      const N = mg * Math.cos(th),
        fp = mg * Math.sin(th),
        fmax = mu * N;
      const slides = fp > fmax && th > 0.001;
      const a = slides ? G * (Math.sin(th) - mu * Math.cos(th)) : 0;
      rA.set(a.toFixed(2) + ' m/s²');
      rN.set(N.toFixed(1) + ' N');
      rFr.set((slides ? fmax : fp).toFixed(1) + ' N');
      rS.set((s / PX_PER_M).toFixed(2) + ' m');
      rSt.set(
        !slides && th < 0.001 ? 'Flat — no slide' : slides ? 'Sliding ⏷' : 'Held by friction'
      );
      const g = cv.g,
        Bx = 70,
        By = 250;
      const Tx = Bx + Lp * Math.cos(th),
        Ty = By - Lp * Math.sin(th);
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      g.strokeStyle = '#26314a';
      g.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const xx = Bx + (Lp * Math.cos(th) * i) / 10;
        g.beginPath();
        g.moveTo(xx, By - (Lp * Math.sin(th) * i) / 10);
        g.lineTo(xx, By + 8);
        g.stroke();
      }
      g.fillStyle = '#1b2233';
      g.strokeStyle = '#3a4660';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(Bx, By);
      g.lineTo(Tx, Ty);
      g.lineTo(Tx, By);
      g.closePath();
      g.fill();
      g.stroke();
      const bx = Tx - s * Math.cos(th),
        by = Ty + s * Math.sin(th);
      g.save();
      g.translate(bx, by);
      g.rotate(-th);
      g.fillStyle = '#6d5df6';
      g.fillRect(-20, -16, 40, 32);
      g.fillStyle = 'rgba(255,255,255,.12)';
      g.fillRect(-20, -16, 40, 8);
      g.restore();
      pxArrow(g, bx, by, 0, mg * kf, '#f87171'); // weight
      pxArrow(g, bx, by, -Math.sin(th) * N * kf, -Math.cos(th) * N * kf, '#22d3ee'); // normal
      const fNow = slides ? fmax : fp;
      pxArrow(g, bx, by, Math.cos(th) * fNow * kf, -Math.sin(th) * fNow * kf, '#34d399'); // friction (up-slope)
      pxArrow(g, bx, by, -Math.cos(th) * fp * kf, Math.sin(th) * fp * kf, 'rgba(251,191,36,.7)', 2); // parallel comp
      pxLabel(g, bx + 8, by + mg * kf + 4, 'mg', '#f87171');
      pxLabel(g, bx - Math.sin(th) * N * kf - 30, by - Math.cos(th) * N * kf, 'N', '#22d3ee');
      pxLabel(g, bx + Math.cos(th) * fNow * kf + 6, by - Math.sin(th) * fNow * kf, 'f', '#34d399');
    }
    attachTimeControls({
      frame,
      advance,
      sample,
      render,
      reset,
      replaceButtons: ['Reset'],
      getTime: () => t,
      /* At the foot of the ramp the block has stopped for good, so there is
       nothing to integrate. Step stops advancing rather than walking the clock
       forward past the end of the run. */
      canAdvance: () => s < Lp,
      stepLabel: 'time step',
      probe: () => {
        const th = (TH.get() * Math.PI) / 180,
          mu = MU.get(),
          N = M.get() * G * Math.cos(th),
          fp = M.get() * G * Math.sin(th),
          slides = fp > mu * N && th > 0.001;
        return {
          t,
          s,
          v,
          /* Static case really has a = 0; reporting g(sin θ − μ cos θ) there
             was wrong - that is the sliding acceleration, not the block's. */
          a: slides ? G * (Math.sin(th) - mu * Math.cos(th)) : 0,
          N,
          friction: slides ? mu * N : fp,
          slides,
          state: { s: +s.toFixed(6), v: +v.toFixed(6) }
        };
      }
    });

    if (window.MutationObserver) {
      const mo = new MutationObserver(() => {
        if (!frame.isConnected) {
          graph.destroy();
          mo.disconnect();
        }
      });
      mo.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
    }
  }
);

/* ---------------- 2. Atwood machine ---------------- */
Sims.register(
  'atwood',
  'Atwood Machine',
  'Two masses, one rope, one acceleration: a = (m₂−m₁)g / (m₁+m₂).',
  '⚖️',
  (frame) => {
    const cv = SU.canvas(frame, 300);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const act = SU.el('div', 'sim-actions');
    frame.appendChild(act);
    /* v–t graph: the whole point of an ideal Atwood machine is that a is
       CONSTANT, so the trace is a straight line whose slope equals the
       acceleration the readout quotes. It also makes the balanced case
       obvious: equal masses produce a flat line at zero. */
    const graph = createGraph(
      frame,
      {
        xLabel: 'Time',
        xUnit: 's',
        xKey: 't',
        yLabel: 'Speed',
        yUnit: 'm/s',
        title: 'v–t: slope = a = (m₂−m₁)g / (m₁+m₂)',
        height: 170,
        capacity: 900
      },
      [{ id: 'v', label: 'Speed v', unit: 'm/s', color: GC.b }]
    );
    const G = 9.8,
      kf = 0.9,
      PMAX = 84;
    let d = 0,
      v = 0,
      t = 0;
    const reset = () => {
      d = 0;
      v = 0;
      t = 0;
      graph.clear();
    };
    const M1 = SU.slider(ctr, 'Mass m₁ (kg)', 0.5, 8, 0.5, 2, reset);
    const M2 = SU.slider(ctr, 'Mass m₂ (kg)', 0.5, 8, 0.5, 5, reset);
    const rA = SU.readout(ro, 'a'),
      rT = SU.readout(ro, 'Tension T'),
      rDir = SU.readout(ro, 'Heavier');
    function advance(h) {
      t += h;
      const m1 = M1.get(),
        m2 = M2.get();
      const aMag = (Math.abs(m2 - m1) * G) / (m1 + m2);
      if (aMag === 0 || d >= PMAX) return;
      /* Constant acceleration, exact over the sub-step. */
      d += v * h + 0.5 * aMag * h * h;
      v += aMag * h;
      if (d >= PMAX) {
        d = PMAX;
        v = 0;
      }
    }

    function sample() {
      graph.push({ t, v });
    }
    function render() {
      const m1 = M1.get(),
        m2 = M2.get();
      const balanced = m2 === m1;
      const heavyRight = m2 > m1;
      /* d is a magnitude. The picture must move in the direction of the net
         force: with m₂ heavier the left block rises, but when m₁ is heavier the
         left block must DESCEND. The old code always raised the left side, so
         it drew the opposite motion for half the settings. */
      const dir = heavyRight ? 1 : -1;
      const aMag = (Math.abs(m2 - m1) * G) / (m1 + m2);
      const T = (2 * m1 * m2 * G) / (m1 + m2);
      rA.set(aMag.toFixed(2) + ' m/s²');
      rT.set(T.toFixed(1) + ' N');
      rDir.set(balanced ? 'balanced' : heavyRight ? 'm₂ ↓' : 'm₁ ↓');
      const g = cv.g,
        cx = cv.W / 2,
        py = 42,
        y0 = 130;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      g.fillStyle = '#33415c';
      g.beginPath();
      g.arc(cx, py, 26, 0, 7);
      g.fill();
      g.fillStyle = '#0b1120';
      g.beginPath();
      g.arc(cx, py, 9, 0, 7);
      g.fill();
      g.strokeStyle = '#9aa8c3';
      g.lineWidth = 2;
      const yL = y0 - dir * d,
        yR = y0 + dir * d;
      g.beginPath();
      g.moveTo(cx - 26, py);
      g.lineTo(cx - 26, yL);
      g.moveTo(cx + 26, py);
      g.lineTo(cx + 26, yR);
      g.stroke();
      const draw = (x, y, m, col) => {
        g.fillStyle = col;
        g.fillRect(x - 22, y - 22, 44, 44);
        g.fillStyle = '#fff';
        g.font = 'bold 12px Segoe UI';
        g.textAlign = 'center';
        g.fillText(m + 'kg', x, y + 4);
        g.textAlign = 'left';
        pxArrow(g, x, y + 22, 0, m * G * kf, '#f87171');
        pxArrow(g, x, y - 22, 0, -T * kf, '#22d3ee');
      };
      if (heavyRight) {
        draw(cx - 26, yL, m1, '#22d3ee');
        draw(cx + 26, yR, m2, '#fbbf24');
      } else {
        draw(cx - 26, yL, m1, '#fbbf24');
        draw(cx + 26, yR, m2, '#22d3ee');
      }
    }
    attachTimeControls({
      frame,
      advance,
      sample,
      render,
      reset,
      replaceButtons: ['Reset'],
      getTime: () => t,
      canAdvance: () => d < PMAX,
      stepLabel: 'time step',
      probe: () => {
        const m1 = M1.get(),
          m2 = M2.get();
        return {
          t,
          d,
          v,
          a: (Math.abs(m2 - m1) * G) / (m1 + m2),
          T: (2 * m1 * m2 * G) / (m1 + m2),
          balanced: m2 === m1,
          heavier: m2 === m1 ? 'none' : m2 > m1 ? 'm2' : 'm1',
          state: { d: +d.toFixed(6), v: +v.toFixed(6) }
        };
      }
    });

    if (window.MutationObserver) {
      const mo = new MutationObserver(() => {
        if (!frame.isConnected) {
          graph.destroy();
          mo.disconnect();
        }
      });
      mo.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
    }
  }
);

/* ---------------- 3. Standing waves on a string ---------------- */
Sims.register(
  'standing',
  'Standing Waves',
  'Two equal waves meet — fixed ends force nodes and antinodes.',
  '〰️',
  (frame) => {
    const cv = SU.canvas(frame, 260);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    /* BUG FIX (pre-existing, live): SU.el's first argument is the TAG NAME and
       the second the class. Calling it with only 'sim-readouts' created a
       <sim-readouts> element with no class, so the readout grid styling never
       applied. */
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const N = SU.slider(ctr, 'Harmonic n', 1, 6, 1, 3, () => {});
    const A = SU.slider(ctr, 'Amplitude', 8, 60, 1, 36, () => {});
    const rL = SU.readout(ro, 'λ = 2L/n'),
      rF = SU.readout(ro, 'Frequency');
    let t = 0;
    function advance(h) {
      /* The standing wave is a product of a fixed spatial envelope and a
         cosine of time - analytic, so there is nothing to integrate. */
      t += h;
    }
    function render() {
      const x0 = 40,
        L = cv.W - 80,
        mid = cv.H / 2,
        n = N.get(),
        amp = A.get();
      rL.set(((2 * L) / n).toFixed(0) + ' px');
      /* The temporal part of the pattern oscillates at ONE base frequency
         regardless of n (y ∝ cos 2π·0.6·t); what scales with n is the spatial
         harmonic. The old 'f ∝ n' label said something the drawn pattern
         contradicts, so the readout now states both honestly: the envelope's
         harmonic number and the actual oscillation frequency of every point. */
      rF.set(n + ' × f₁ = ' + (n * 0.6).toFixed(2) + ' Hz');
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      g.strokeStyle = '#26314a';
      g.lineWidth = 1;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(x0, mid);
      g.lineTo(x0 + L, mid);
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = '#22d3ee';
      g.lineWidth = 3;
      g.beginPath();
      for (let x = 0; x <= L; x += 2) {
        const y = mid - amp * Math.sin((n * Math.PI * x) / L) * Math.cos(2 * Math.PI * 0.6 * t);
        x ? g.lineTo(x0 + x, y) : g.moveTo(x0 + x, y);
      }
      g.stroke();
      for (let p = 0; p <= n; p++) {
        const xn = x0 + (p * L) / n;
        g.fillStyle = '#f87171';
        g.beginPath();
        g.arc(xn, mid, 4, 0, 7);
        g.fill();
      }
      pxLabel(g, x0 - 34, mid + 4, 'nodes', '#f87171');
    }
    attachTimeControls({
      frame,
      advance,
      render,
      reset: () => {
        t = 0;
      },
      getTime: () => t,
      canAdvance: () => true,
      stepLabel: 'time step',
      probe: () => {
        const n = N.get(),
          L = cv.W - 80,
          x0 = 40;
        return {
          t,
          n,
          nodes: n + 1,
          L,
          /* Node positions in canvas px - the testable claim is that they sit
             at x0 + p·L/n and never move as the pattern oscillates. */
          nodeX: Array.from({ length: n + 1 }, (_, p) => x0 + (p * L) / n),
          phase: (2 * Math.PI * 0.6 * t) % (2 * Math.PI),
          fnHz: n * 0.6,
          state: {}
        };
      }
    });
  }
);

/* ---------------- 4. Wave interference (ripple tank) ---------------- */
Sims.register(
  'interference',
  'Wave Interference',
  'Two sources: crests add (bright) or cancel (dark). Path difference rules it.',
  '🌐',
  (frame) => {
    const cv = SU.canvas(frame, 280);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    /* BUG FIX (pre-existing, live): SU.el's first argument is the TAG NAME and
       the second the class. Calling it with only 'sim-readouts' created a
       <sim-readouts> element with no class, so the readout grid styling never
       applied. */
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const OW = 200,
      OH = 100;
    const oc = document.createElement('canvas');
    oc.width = OW;
    oc.height = OH;
    const octx = oc.getContext('2d');
    const img = octx.createImageData(OW, OH);
    const D = SU.slider(ctr, 'Separation d', 40, 320, 2, 150, () => {});
    const WL = SU.slider(ctr, 'Wavelength λ', 18, 120, 1, 48, () => {});
    const rNote = SU.readout(ro, 'Note');
    let t = 0;
    /* Pure function of time, like the standing wave: advance only runs the
       clock, render recomputes the field from the current t. */
    function advance(h) {
      t += h;
    }
    function render() {
      const mid = OH / 2,
        sx1 = OW / 2 - D.get() / 2 / (cv.W / OW),
        sx2 = OW / 2 + D.get() / 2 / (cv.W / OW);
      const k = (2 * Math.PI) / WL.get(),
        w = 2 * Math.PI * 0.5;
      const data = img.data;
      for (let j = 0; j < OH; j++) {
        for (let i = 0; i < OW; i++) {
          const x = i,
            y = j;
          const r1 = Math.hypot(x - sx1, y - mid),
            r2 = Math.hypot(x - sx2, y - mid);
          const z = Math.sin(k * r1 - w * t) + Math.sin(k * r2 - w * t);
          const inten = z * 0.5 + 1;
          const c = Math.max(0, Math.min(255, inten * 190 + 20));
          const o = (j * OW + i) * 4;
          data[o] = c * 0.4;
          data[o + 1] = c * 0.8;
          data[o + 2] = c;
          data[o + 3] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      g.drawImage(oc, 0, 0, cv.W, cv.H);
      const psx1 = OW / 2 - D.get() / 2,
        psx2 = OW / 2 + D.get() / 2;
      g.fillStyle = '#fbbf24';
      g.beginPath();
      g.arc((psx1 / OW) * cv.W, cv.H / 2, 7, 0, 7);
      g.fill();
      g.beginPath();
      g.arc((psx2 / OW) * cv.W, cv.H / 2, 7, 0, 7);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.25)';
      g.setLineDash([5, 5]);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, cv.H / 2);
      g.lineTo(cv.W, cv.H / 2);
      g.stroke();
      g.setLineDash([]);
      /* The maxima between two in-phase sources are the successive orders
         m = 0, 1, … up to about d/λ - an actual, countable consequence of the
         two slider values, so the note now quotes it instead of a slogan. */
      rNote.set('Bright where Δ = nλ — max order ' + Math.floor(D.get() / WL.get()));
    }
    attachTimeControls({
      frame,
      advance,
      render,
      reset: () => {
        t = 0;
      },
      getTime: () => t,
      canAdvance: () => true,
      stepLabel: 'time step',
      probe: () => {
        const d = D.get(),
          lam = WL.get();
        const mid = OH / 2,
          sx1 = OW / 2 - d / 2 / (cv.W / OW),
          sx2 = OW / 2 + d / 2 / (cv.W / OW),
          k = (2 * Math.PI) / lam,
          w = 2 * Math.PI * 0.5;
        /* Sample the field exactly as the tank draws it. Two reference points
           carry the two teachable claims: at the pattern's centre the path
           difference is 0, so z there is pure 2·sin(k·r − wt) (always reaches
           ±2, constructive at every t); at the right-edge midpoint the path
           difference is exactly d along the centreline, so that point's
           oscillation amplitude is 2·|cos(kd/2)| — bright or dark depending
           on d/λ, but constant in time. */
        const sampleZ = (x, y) => {
          const r1 = Math.hypot(x - sx1, y - mid),
            r2 = Math.hypot(x - sx2, y - mid);
          return Math.sin(k * r1 - w * t) + Math.sin(k * r2 - w * t);
        };
        const pdEdge = sx2 - sx1;
        return {
          t,
          d,
          lambda: lam,
          phase: (w * t) % (2 * Math.PI),
          maxOrder: Math.floor(d / lam),
          zAtOrigin: +sampleZ(OW / 2, mid).toFixed(6),
          pDiffEdge: +pdEdge.toFixed(4),
          edgeAmp: +(2 * Math.abs(Math.cos((k * pdEdge) / 2))).toFixed(4),
          zAtRightEdge: +sampleZ(OW - 1, mid).toFixed(6),
          state: {}
        };
      }
    });
  }
);

/* ---------------- 5. Refraction / Snell's law ---------------- */
Sims.register(
  'refraction',
  'Refraction (Snell)',
  'Light bends toward the normal entering a denser medium; past the critical angle it reflects.',
  '🔆',
  (frame) => {
    const cv = SU.canvas(frame, 280);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    /* BUG FIX (pre-existing, live): SU.el's first argument is the TAG NAME and
       the second the class. Calling it with only 'sim-readouts' created a
       <sim-readouts> element with no class, so the readout grid styling never
       applied. */
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const N1 = SU.slider(
      ctr,
      'n₁ (top)',
      1,
      2,
      0.01,
      1,
      () => {},
      (v) => v.toFixed(2)
    );
    const N2 = SU.slider(
      ctr,
      'n₂ (bottom)',
      1,
      2.4,
      0.01,
      1.5,
      () => {},
      (v) => v.toFixed(2)
    );
    const TH = SU.slider(ctr, 'θ₁ (°)', 5, 85, 1, 40, () => {});
    const rT2 = SU.readout(ro, 'θ₂'),
      rC = SU.readout(ro, 'Critical'),
      rSt = SU.readout(ro, 'Result');
    /* The geometry is a pure function of the three sliders, so there is
       nothing to integrate: advance only moves the clock, render redraws. */
    let t = 0;
    function advance(h) {
      t += h;
    }
    function render() {
      const n1 = N1.get(),
        n2 = N2.get(),
        th1 = (TH.get() * Math.PI) / 180,
        mid = cv.H / 2;
      const ix = cv.W * 0.3;
      const sin2 = (n1 / n2) * Math.sin(th1);
      const tir = sin2 > 1;
      const th2 = tir ? 0 : Math.asin(sin2);
      const crit = n2 > n1 ? (Math.asin(n1 / n2) * 180) / Math.PI : Infinity;
      rT2.set(tir ? '—' : ((th2 * 180) / Math.PI).toFixed(1) + '°');
      rC.set(isFinite(crit) ? crit.toFixed(1) + '°' : 'none');
      rSt.set(tir ? '💡 Total internal reflection' : 'Refracted');
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      g.fillStyle = 'rgba(34,211,238,.06)';
      g.fillRect(0, mid, cv.W, cv.H - mid);
      g.fillStyle = '#6b7a99';
      g.font = '11px Segoe UI';
      g.fillText('medium n₁', 12, 18);
      g.fillText('medium n₂', 12, mid + 18);
      g.strokeStyle = 'rgba(154,168,195,.5)';
      g.lineWidth = 1;
      g.setLineDash([5, 5]);
      g.beginPath();
      g.moveTo(0, mid);
      g.lineTo(cv.W, mid);
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = 'rgba(154,168,195,.4)';
      g.beginPath();
      g.moveTo(ix, 0);
      g.lineTo(ix, cv.H);
      g.stroke();
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
      g.fillStyle = '#9aa8c3';
      g.font = '11px Segoe UI';
      g.fillText('θ₁=' + TH.get() + '°', ix + 14, mid - 8);
      if (!tir) g.fillText('θ₂=' + ((th2 * 180) / Math.PI).toFixed(0) + '°', ix + 14, mid + 22);
    }
    attachTimeControls({
      frame,
      advance,
      render,
      reset: () => {
        t = 0;
      },
      getTime: () => t,
      canAdvance: () => true,
      stepLabel: 'time step',
      probe: () => {
        const n1 = N1.get(),
          n2 = N2.get(),
          th1 = (TH.get() * Math.PI) / 180;
        const sin2 = (n1 / n2) * Math.sin(th1);
        const tir = sin2 > 1;
        const th2 = tir ? 0 : Math.asin(sin2);
        return {
          t,
          n1,
          n2,
          th1,
          sin2,
          tir,
          th2Deg: tir ? null : (th2 * 180) / Math.PI,
          critDeg: n2 > n1 ? (Math.asin(n1 / n2) * 180) / Math.PI : null,
          state: {}
        };
      }
    });
  }
);

/* ---------------- 6. Buoyancy / Archimedes ---------------- */
Sims.register(
  'buoyancy',
  'Buoyancy',
  'Buoyant force = weight of displaced fluid. Float if ρ < ρ_fluid.',
  '🛟',
  (frame) => {
    const cv = SU.canvas(frame, 290);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const act = SU.el('div', 'sim-actions');
    frame.appendChild(act);
    const G = 9.8,
      sc = 120; /* px per metre — the only display-scale constant */
    let y = 0 /* block TOP, px */,
      vy = 0 /* m/s — SI; the drawing scale never touches dynamics */,
      sub = 0,
      t = 0,
      Wk = 0,
      Bk = 0;
    /* The block starts ABOVE the waterline: the sim is about the drop, so a
       reset must re-drop it, not teleport it into equilibrium. The old reset
       put y at 0 and the loop then snapped floating blocks straight to their
       equilibrium depth on the next frame — instantaneous, unphysical. */
    const reset = () => {
      y = 96 - S.get() * sc - 24;
      vy = 0;
      t = 0;
    };
    const RB = SU.slider(ctr, 'Block density ρ (kg/m³)', 200, 2000, 10, 600, reset);
    const RF = SU.slider(ctr, 'Fluid density ρ_f', 500, 1500, 10, 1000, reset);
    const S = SU.slider(ctr, 'Block side (m)', 0.2, 0.6, 0.02, 0.4, reset, (v) => v.toFixed(2));
    const rW = SU.readout(ro, 'Weight'),
      rB = SU.readout(ro, 'Buoyant'),
      rSub = SU.readout(ro, 'Submerged'),
      rSt = SU.readout(ro, 'Status');
    /* Archimedes with position-dependent submersion: buoyancy grows as the
       block enters the water, so the drop is a real two-force problem.
       Velocity Verlet (two half kicks) because a depends on position. */
    const geo = () => {
      const side = S.get();
      return {
        side,
        V: side * side * side,
        bs: side * sc,
        waterTop: 96,
        tankBot: cv.H - 18
      };
    };
    function advance(h) {
      t += h;
      /* Integrating in metres. The first draft mixed px-velocities with
         newtons, which gave the dropped block ~9 kJ of kinetic energy and a
         tank-banging fight instead of a damped settle to Archimedes'
         balance. With vy in m/s the energies are the textbook ones. */
      const { side, V, waterTop, tankBot } = geo();
      const A = side * side;
      const rb = RB.get();
      const m = rb * V;
      if (m <= 0) return;
      const omega = Math.sqrt((RF.get() * G * A) / m);
      /* Linear drag tuned to ζ ≈ 0.55 so a dropped block settles in a few
         bobs instead of ringing essentially forever (the buoyant spring
         alone is nearly lossless). */
      const c = 1.1 * m * omega;
      const waterM = waterTop / sc;
      const yM = y / sc;
      const floorM = tankBot / sc - side;
      const depth = Math.max(0, Math.min(side, yM + side - waterM));
      sub = side > 0 ? depth / side : 0;
      Wk = rb * G * V;
      const Bf = RF.get() * G * A * depth;
      Bk = Bf;
      const a1 = (Wk - Bf - c * vy) / m;
      const y2 = yM + vy * h + 0.5 * a1 * h * h;
      const vHalf = vy + 0.5 * a1 * h;
      const depth2 = Math.max(0, Math.min(side, y2 + side - waterM));
      const a2 = (Wk - RF.get() * G * A * depth2 - c * vHalf) / m;
      vy = vHalf + 0.5 * a2 * h;
      if (y2 > floorM) {
        y = floorM * sc;
        vy = 0;
      } else {
        y = y2 * sc;
      }
    }
    function render() {
      const { side, waterTop, tankBot } = geo();
      const rb = RB.get();
      const floats = rb < RF.get();
      /* The measured submersion — at equilibrium a floater's own balance
         makes it converge to ρ/ρ_f, and a sinker reads 1 at the floor. */
      const subFrac = sub;
      rW.set((Wk / 1000).toFixed(2) + ' kN');
      /* The honest number is the buoyant force RIGHT NOW, not the maximum;
         a half-submerged block is not feeling Bmax. In equilibrium the two
         agree (that is exactly Archimedes' balance), which the readout makes
         visible: W and B converge as the block settles. */
      rB.set((Bk / 1000).toFixed(2) + ' kN');
      rSub.set((subFrac * 100).toFixed(0) + ' %');
      rSt.set(
        floats
          ? Math.abs(vy) > 0.05
            ? '🌊 Bobbing'
            : '🟢 Floating equilibrium'
          : y >= tankBot - side * sc
            ? '⛔ On the bottom'
            : '🔴 Sinking'
      );
      const px = cv.W / 2;
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      g.fillStyle = 'rgba(34,211,238,.18)';
      g.fillRect(px - 110, waterTop, 220, tankBot - waterTop);
      g.strokeStyle = '#22d3ee';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(px - 110, waterTop);
      g.lineTo(px + 110, waterTop);
      g.stroke();
      g.fillStyle = rb < RF.get() ? '#34d399' : '#f87171';
      g.fillRect(px - (side * sc) / 2, y, side * sc, side * sc);
      g.fillStyle = 'rgba(255,255,255,.15)';
      g.fillRect(px - (side * sc) / 2, y, side * sc, 6);
      const cyc = y + (side * sc) / 2;
      pxArrow(g, px, cyc, 0, 42, '#f87171'); // weight (down)
      pxArrow(g, px, cyc, 0, -42 * subFrac, '#22d3ee'); // buoyant: grows with submersion
      pxLabel(g, px + 10, cyc + 46, 'W', '#f87171');
      pxLabel(g, px + 10, cyc - 42 * subFrac - 6, 'B', '#22d3ee');
    }
    attachTimeControls({
      frame,
      advance,
      render,
      reset,
      replaceButtons: ['⟲ Drop'],
      getTime: () => t,
      /* A sunken block has reached the tank floor; there is nothing left to
         integrate, so Step must not advance the clock through a frozen state. */
      canAdvance: () => {
        const { side, tankBot } = geo();
        return !(RB.get() >= RF.get() && y >= tankBot - side * sc && vy === 0);
      },
      stepLabel: 'time step',
      probe: () => ({
        t,
        y,
        vyMs: +vy.toFixed(4),
        subFrac: +sub.toFixed(4),
        floats: RB.get() < RF.get(),
        W: +(Wk / 1000).toFixed(4),
        B: +(Bk / 1000).toFixed(4),
        state: { y: +y.toFixed(6), vy: +vy.toFixed(6) }
      })
    });
  }
);

/* ---------------- 7. RC circuit (capacitor charging) ---------------- */
Sims.register(
  'rc',
  'RC Circuit',
  'Capacitor fills as Vc = V(1−e^(−t/RC)); the time constant τ = RC.',
  '🔋',
  (frame) => {
    const cv = SU.canvas(frame, 270);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const act = SU.el('div', 'sim-actions');
    frame.appendChild(act);
    const V = SU.slider(ctr, 'Battery V', 1, 12, 0.5, 9, () => {});
    const R = SU.slider(ctr, 'R (kΩ)', 0.5, 20, 0.5, 4, () => {});
    const C = SU.slider(ctr, 'C (mF)', 0.1, 10, 0.1, 2, () => {});
    const rTau = SU.readout(ro, 'τ = RC'),
      rVc = SU.readout(ro, 'V_cap'),
      rI = SU.readout(ro, 'Current I');
    let t = 0,
      mode = 1,
      ph = 0,
      VcS = 0,
      IS = 0;
    const reset = () => {
      t = 0;
    };
    SU.btn(act, '⚡ Charge', () => {
      mode = 1;
      t = 0;
    });
    SU.btn(act, '⬇ Discharge', () => {
      mode = 0;
      t = 0;
    });
    const hist = [];
    const tauOf = () => R.get() * 1000 * C.get() * 1e-3;
    /* One fixed physics step: the exponential is evaluated at the exact
       sub-step time, so Vc(t) = V(1−e^(−t/τ)) holds with no integrator at
       all. The old code advanced this inside the draw loop at frame rate
       with a variable dt, which hid the law behind the animation. */
    function advance(h) {
      t += h;
      const tau = tauOf();
      const V0 = V.get();
      VcS = mode ? V0 * (1 - Math.exp(-t / tau)) : V0 * Math.exp(-t / tau);
      IS = mode
        ? (V0 / (R.get() * 1000)) * Math.exp(-t / tau)
        : (-V0 / (R.get() * 1000)) * Math.exp(-t / tau);
      ph = (ph + Math.min(1, Math.abs(IS) * 4000) * h) % 1;
      hist.push(VcS);
      if (hist.length > 200) hist.shift();
    }
    function render() {
      const tau = tauOf();
      const V0 = V.get();
      rTau.set((tau * 1000).toFixed(0) + ' ms');
      rVc.set(VcS.toFixed(2) + ' V');
      rI.set((IS * 1000).toFixed(2) + ' mA');
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      const L = 60,
        T = 60,
        Rt = cv.W - 70,
        B = cv.H - 70,
        mx = (L + Rt) / 2;
      g.strokeStyle = '#4a5878';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(L, T);
      g.lineTo(mx - 40, T);
      g.moveTo(mx + 40, T);
      g.lineTo(Rt, T);
      g.moveTo(Rt, T);
      g.lineTo(Rt, B);
      g.moveTo(L, B);
      g.lineTo(L, T);
      g.stroke();
      g.beginPath();
      g.moveTo(L, T);
      g.lineTo(L, B);
      g.stroke();
      g.strokeStyle = '#9aa8c3';
      g.lineWidth = 3;
      let zx = mx - 40;
      g.beginPath();
      g.moveTo(zx, T);
      for (let i = 0; i < 7; i++) {
        g.lineTo(zx + 5, T + (i % 2 ? 11 : -11));
        zx += 5;
      }
      g.lineTo(mx - 40, T);
      g.lineTo(mx + 40, T);
      g.stroke();
      g.strokeStyle = '#fbbf24';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(mx - 14, T - 16);
      g.lineTo(mx - 14, T + 16);
      g.moveTo(mx + 14, T - 16);
      g.lineTo(mx + 14, T + 16);
      g.stroke();
      g.fillStyle = 'rgba(251,191,36,' + ((VcS / V0) * 0.8 + 0.05) + ')';
      g.fillRect(mx - 14, T + 16 - (VcS / V0) * 30, 28, (VcS / V0) * 30);
      for (let n = 0; n < 14; n++) {
        const want = (ph + n / 14) % 1;
        const px = L + (Rt - L) * (want < 0.5 ? want * 2 : (want - 0.5) * 2);
        const onTop = want < 0.5;
        const py = onTop ? T : B;
        g.fillStyle = mode ? '#22d3ee' : '#f87171';
        g.beginPath();
        g.arc(px, py, 3, 0, 7);
        g.fill();
      }
      const gx0 = 40,
        gy0 = cv.H - 24,
        gw = cv.W - 70;
      g.strokeStyle = '#26314a';
      g.lineWidth = 1;
      g.strokeRect(gx0, gy0 - 70, gw, 70);
      g.strokeStyle = '#34d399';
      g.lineWidth = 2;
      g.beginPath();
      hist.forEach((v, i) => {
        const X = gx0 + (i / 200) * gw,
          Y = gy0 - (v / 12) * 66;
        i ? g.lineTo(X, Y) : g.moveTo(X, Y);
      });
      g.stroke();
      g.fillStyle = '#6b7a99';
      g.font = '10px Segoe UI';
      g.fillText('V_cap(t)', gx0, gy0 - 74);
    }
    /* Charge/Discharge stay as mode buttons (they are part of the experiment,
       not a reset of it) — so no replaceButtons here: the time bar only owns
       Reset, and Reset rewinds the same experiment. */
    attachTimeControls({
      frame,
      advance,
      render,
      reset,
      getTime: () => t,
      canAdvance: () => true,
      stepLabel: 'time step',
      probe: () => {
        const tau = tauOf();
        return {
          t,
          mode,
          V0: V.get(),
          Rk: R.get(),
          Cm: C.get(),
          tauMs: +(tau * 1000).toFixed(3),
          Vc: +VcS.toFixed(4),
          I: +IS.toFixed(6),
          frac: V.get() > 0 ? +(VcS / V.get()).toFixed(4) : 0,
          state: {}
        };
      }
    });
  }
);

/* ---------------- 8. Newton's law of cooling ---------------- */
Sims.register(
  'cooling',
  'Cooling Curve',
  'T(t) = T_amb + (T₀−T_amb)·e^(−kt). Hot bodies lose heat exponentially.',
  '🌡️',
  (frame) => {
    const cv = SU.canvas(frame, 280);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    /* BUG FIX (pre-existing, live): SU.el's first argument is the TAG NAME and
       the second the class. Calling it with only 'sim-readouts' created a
       <sim-readouts> element with no class, so the readout grid styling never
       applied. */
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const act = SU.el('div', 'sim-actions');
    frame.appendChild(act);
    const Tamb = SU.slider(ctr, 'Ambient T_amb', 0, 40, 1, 20, () => {});
    const T0 = SU.slider(ctr, 'Start T₀', 50, 100, 1, 90, () => {});
    const K = SU.slider(
      ctr,
      'Rate k',
      0.02,
      0.4,
      0.01,
      0.12,
      () => {},
      (v) => v.toFixed(2)
    );
    const rT = SU.readout(ro, 'T now'),
      rHalf = SU.readout(ro, 'Half-life');
    let t = 0,
      T = 0;
    const reset = () => {
      t = 0;
      T = T0.get();
    };
    reset();
    const hist = [];
    /* advance evaluates the closed form at the exact sub-step time; the old
       code folded this into the draw loop, so the temperature curve advanced
       at frame rate with a variable dt and could not be paused or stepped. */
    function advance(h) {
      t += h;
      T = Tamb.get() + (T0.get() - Tamb.get()) * Math.exp(-K.get() * t);
      hist.push(T);
      if (hist.length > 240) hist.shift();
    }
    function render() {
      const Ta = Tamb.get();
      rT.set(T.toFixed(1) + ' °C');
      rHalf.set((Math.log(2) / K.get()).toFixed(1) + ' s');
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      const tx = 70,
        top = 40,
        bot = 230,
        tubeH = bot - top;
      const TtoY = (Tv) => bot - ((Tv - 0) / 100) * tubeH;
      g.strokeStyle = '#4a5878';
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(tx - 14, top, 28, tubeH, 14);
      g.stroke();
      g.fillStyle = '#f87171';
      const my = TtoY(Math.max(0, Math.min(100, T)));
      g.fillRect(tx - 10, my, 20, bot - my);
      g.fillStyle = '#e8edf7';
      g.beginPath();
      g.arc(tx, top - 6, 16, 0, 7);
      g.fill();
      g.fillStyle = '#6b7a99';
      g.font = '11px Segoe UI';
      g.fillText(T.toFixed(0) + '°C', tx + 24, my + 4);
      const gx0 = 110,
        gw = cv.W - 130,
        gh = tubeH;
      g.strokeStyle = '#26314a';
      g.lineWidth = 1;
      g.strokeRect(gx0, top, gw, gh);
      g.fillStyle = '#6b7a99';
      g.font = '10px Segoe UI';
      g.fillText('T vs t', gx0, top - 6);
      g.strokeStyle = '#22d3ee';
      g.lineWidth = 2;
      g.beginPath();
      hist.forEach((v, i) => {
        const X = gx0 + (i / 240) * gw,
          Y = bot - (v / 100) * gh;
        i ? g.lineTo(X, Y) : g.moveTo(X, Y);
      });
      g.stroke();
      g.strokeStyle = 'rgba(52,211,153,.5)';
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(gx0, TtoY(Ta));
      g.lineTo(gx0 + gw, TtoY(Ta));
      g.stroke();
      g.setLineDash([]);
    }
    attachTimeControls({
      frame,
      advance,
      render,
      reset,
      replaceButtons: ['⟲ Reset'],
      getTime: () => t,
      canAdvance: () => true,
      stepLabel: 'time step',
      probe: () => ({
        t,
        T: +T.toFixed(3),
        Ta: Tamb.get(),
        t0: T0.get(),
        k: K.get(),
        half: Math.log(2) / K.get(),
        excess: T - Tamb.get(),
        state: {}
      })
    });
  }
);

/* ---------------- 9. 2D collision lab ---------------- */
Sims.register(
  'collision2d',
  '2D Collision Lab',
  'Real elastic collisions in two dimensions — momentum & energy conserved.',
  '💥',
  (frame) => {
    const cv = SU.canvas(frame, 280);
    const ctr = SU.el('div', 'sim-controls');
    frame.appendChild(ctr);
    const ro = SU.el('div', 'sim-readouts');
    frame.appendChild(ro);
    const act = SU.el('div', 'sim-actions');
    frame.appendChild(act);
    const rad = (m) => 12 + Math.sqrt(m) * 6;
    let a,
      b,
      trailA = [],
      trailB = [],
      t = 0,
      pS = 0,
      keS = 0,
      p0S = 0,
      ke0S = 1;
    const relaunch = () => {
      a = {
        m: M1.get(),
        x: cv.W * 0.3,
        y: cv.H * 0.4,
        vx: Math.cos((A1.get() * Math.PI) / 180) * S1.get(),
        vy: Math.sin((A1.get() * Math.PI) / 180) * S1.get(),
        r: 0,
        col: '#22d3ee'
      };
      b = { m: M2.get(), x: cv.W * 0.7, y: cv.H * 0.6, vx: -S2.get(), vy: 0, r: 0, col: '#fbbf24' };
      a.r = rad(a.m);
      b.r = rad(b.m);
      trailA = [];
      trailB = [];
      t = 0;
      /* Baseline for the conservation claim the readout makes: |p| and KE at
         the moment of relaunch, so "conserved" is a statement against a
         recorded initial value rather than a slogan. */
      p0S = Math.hypot(a.m * a.vx + b.m * b.vx, a.m * a.vy + b.m * b.vy);
      ke0S = 0.5 * a.m * (a.vx * a.vx + a.vy * a.vy) + 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
    };
    const M1 = SU.slider(ctr, 'Mass 1 (kg)', 0.5, 8, 0.5, 3, relaunch);
    const M2 = SU.slider(ctr, 'Mass 2 (kg)', 0.5, 8, 0.5, 3, relaunch);
    const S1 = SU.slider(ctr, 'Speed 1 (m/s)', 1, 10, 0.5, 5, relaunch);
    const S2 = SU.slider(ctr, 'Speed 2 (m/s)', 0, 10, 0.5, 3, relaunch);
    const A1 = SU.slider(ctr, 'Angle 1 (°)', -80, 80, 1, 20, relaunch);
    const E = SU.slider(
      ctr,
      'Restitution e',
      0.2,
      1,
      0.05,
      1,
      () => {},
      (v) => v.toFixed(2)
    );
    const rP = SU.readout(ro, '|p|'),
      rK = SU.readout(ro, 'KE'),
      rSt = SU.readout(ro, 'Type');
    SU.btn(act, '⟲ Relaunch', relaunch, true);
    relaunch();
    const bump = (p, w) => {
      if (p.x < p.r) {
        p.x = p.r;
        p.vx = Math.abs(p.vx) * w;
      }
      if (p.x > cv.W - p.r) {
        p.x = cv.W - p.r;
        p.vx = -Math.abs(p.vx) * w;
      }
      if (p.y < p.r) {
        p.y = p.r;
        p.vy = Math.abs(p.vy) * w;
      }
      if (p.y > cv.H - p.r) {
        p.y = cv.H - p.r;
        p.vy = -Math.abs(p.vy) * w;
      }
    };
    /* Impulse-based collision — the same j = −(1+e)·v_rel·n̂ / (1/m₁+1/m₂)
       formula the readouts are checked against — but now inside one fixed
       physics step instead of the draw loop. The position scale (22 px per
       metre) and every constant are unchanged. */
    function advance(h) {
      t += h;
      a.x += a.vx * 22 * h;
      a.y += a.vy * 22 * h;
      b.x += b.vx * 22 * h;
      b.y += b.vy * 22 * h;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        dist = Math.hypot(dx, dy);
      if (dist < a.r + b.r && dist > 0) {
        const nx = dx / dist,
          ny = dy / dist;
        const rvx = b.vx - a.vx,
          rvy = b.vy - a.vy,
          vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const e = E.get(),
            j = (-(1 + e) * vn) / (1 / a.m + 1 / b.m);
          a.vx -= (j * nx) / a.m;
          a.vy -= (j * ny) / a.m;
          b.vx += (j * nx) / b.m;
          b.vy += (j * ny) / b.m;
        }
        const ov = (a.r + b.r - dist) / 2;
        a.x -= nx * ov;
        a.y -= ny * ov;
        b.x += nx * ov;
        b.y += ny * ov;
      }
      bump(a, 1);
      bump(b, 1);
      trailA.push([a.x, a.y]);
      if (trailA.length > 80) trailA.shift();
      trailB.push([b.x, b.y]);
      if (trailB.length > 80) trailB.shift();
      pS = Math.hypot(a.m * a.vx + b.m * b.vx, a.m * a.vy + b.m * b.vy);
      keS = 0.5 * a.m * (a.vx * a.vx + a.vy * a.vy) + 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
    }
    function render() {
      rP.set(pS.toFixed(1) + ' kg·m/s');
      rK.set(keS.toFixed(1) + ' J');
      rSt.set(E.get() >= 0.95 ? 'Elastic' : 'Inelastic');
      const g = cv.g;
      g.fillStyle = '#05070d';
      g.fillRect(0, 0, cv.W, cv.H);
      const drawTrail = (tr, col) => {
        g.strokeStyle = col;
        g.lineWidth = 1.5;
        g.beginPath();
        tr.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
        g.stroke();
      };
      drawTrail(trailA, 'rgba(34,211,238,.4)');
      drawTrail(trailB, 'rgba(251,191,36,.4)');
      [a, b].forEach((p) => {
        g.fillStyle = p.col;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, 7);
        g.fill();
        pxArrow(g, p.x, p.y, p.vx * 4, p.vy * 4, '#34d399');
        g.fillStyle = '#6b7a99';
        g.font = '11px Segoe UI';
        g.textAlign = 'center';
        g.fillText(p.m + 'kg', p.x, p.y - p.r - 6);
        g.textAlign = 'left';
      });
    }
    attachTimeControls({
      frame,
      advance,
      render,
      reset: relaunch,
      replaceButtons: ['⟲ Relaunch'],
      getTime: () => t,
      canAdvance: () => true,
      stepLabel: 'time step',
      probe: () => ({
        t,
        e: E.get(),
        m1: a.m,
        m2: b.m,
        p: +pS.toFixed(4),
        ke: +keS.toFixed(4),
        p0: +p0S.toFixed(4),
        ke0: +ke0S.toFixed(4),
        v1: +Math.hypot(a.vx, a.vy).toFixed(4),
        v2: +Math.hypot(b.vx, b.vy).toFixed(4),
        state: {
          ax: +a.x.toFixed(6),
          ay: +a.y.toFixed(6),
          bx: +b.x.toFixed(6),
          by: +b.y.toFixed(6)
        }
      })
    });
  }
);
