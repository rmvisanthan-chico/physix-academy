import { pxArrow, pxLabel, SU } from './core.js';
import { Sims } from './sims-a.js';
import { createGraph, GRAPH_COLORS as GC } from './graph-engine.js';
import { createPrediction } from './prediction.js';
import { createSimControls } from './sim-controls.js';
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

  /* Prediction is built at the very END of this simulation, after the sliders,
     launch() and the animation loop exist. See the block below. */
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
  /* Phase 3C: a slider move has to invalidate any pending prediction. The
     question names a target instant derived from these sliders, so moving one
     after the question was built leaves the student answering "how high at
     t = 1.44 s" while the screen now asks something else - and the reveal poller
     would keep waiting for a target belonging to the previous launch.
     The handler is a mutable binding rather than a direct call because `pred` is
     declared much further down (see the Phase 3B note); it starts as a plain
     relaunch and is upgraded once the prediction exists. */
  let predApi = null;
  let onParamsChanged = () => launch();
  const SP = SU.slider(ctr, 'Speed u (m/s)', 5, 45, 1, 25, () => onParamsChanged());
  const AN = SU.slider(ctr, 'Angle θ (°)', 10, 80, 1, 45, () => onParamsChanged());
  const H0 = SU.slider(ctr, 'Launch height (m)', 0, 30, 1, 0, () => onParamsChanged());
  const DR = SU.slider(ctr, 'Air drag k', 0, 0.4, 0.01, 0, () => onParamsChanged(), v => v.toFixed(2));
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

  /* Phase 3C: the physics, the sampling and the drawing are now three separate
     functions instead of one fused closure. That separation is the whole point:
     Pause has to skip integration while still drawing, and Step has to integrate
     exactly once and then draw - which is impossible if integration, sampling and
     rendering share a body and nobody can say which half runs when.
     advance() integrates one fixed sub-step and never touches the canvas or the
     graph; sample() records one graph point; render() draws and never integrates. */

  /* One fixed sub-step of physics. Semantics unchanged from the old code - the
     same semi-implicit Euler update, just handed a constant h instead of a
     frame-dependent dt, so the answer no longer depends on the display's
     refresh rate. */
  function advance(h) {
    if (!st || st.done) return;
    const k = DR.get();
    st.t += h;
    const sp = Math.hypot(st.vx, st.vy);
    st.vx += (-k * st.vx * sp) * h; st.vy += (-G - k * st.vy * sp) * h;
    st.x += st.vx * h; st.y += st.vy * h;
    if (st.y > st.hmax) st.hmax = st.y;
    if (st.y <= 0 && st.t > 0.05) { st.y = 0; st.done = true; }
    trail.push([st.x, st.y]); if (trail.length > 400) trail.shift();
  }

  /* Exactly one graph point per completed step. Called once per sub-step batch
     by the controls, never by render() - so pausing genuinely stops the graph
     growing rather than just stopping it being drawn. */
  function sample() {
    if (!st) return;
    graph.push({ x: st.t, y: st.y, vx: st.vx, vy: st.vy });
  }

  /* Draws only. Runs on every frame including while paused, which is what keeps
     the frozen ball and the existing curve on screen when the student hits
     Pause to inspect them. */
  function render() {
    const k = DR.get(), id = ideal();
    const scale = Math.min((cv.W - 70) / Math.max(5, id.R), (cv.H - 50) / Math.max(5, id.Hmax)) * 0.9;
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
  }

  /* ---------- Phase 3C time controls ----------
     One control bar owns one animation loop for this simulation. It is created
     here - after advance/sample/render exist, and after the sliders, because
     reset() re-reads the sliders and launch() re-seeds the state from them. */
  const controls = createSimControls({
    parent: frame,
    advance, sample, render,
    reset: launch,
    getTime: () => (st ? st.t : 0),
    timeUnit: 's',
    /* Once the ball has landed there is nothing left to integrate, so Step must
       not keep advancing the clock into empty air - canAdvance stops the
       sub-step loop and leaves the run honestly finished. */
    canAdvance: () => !!(st && !st.done),
    stepLabel: 'flight time step'
  });

  /* Phase 3C test probe: reads the simulation's real state and the graph's real
     sample count. Exposed so tools/verify-timecontrols.mjs can assert on physics
     rather than on repainted pixels - "the loop stopped integrating" and "the
     canvas was not repainted" are different failures and a DOM check cannot tell
     them apart. */
  const probe = () => ({
    t: st ? st.t : 0,
    x: st ? st.x : 0,
    y: st ? st.y : 0,
    vy: st ? st.vy : 0,
    y0: H0.get(),
    done: !!(st && st.done),
    paused: controls.isPaused(),
    /* Counted on ONE named series, not summed across all three. Summing would
       triple every sample, which would quietly turn a test for "exactly one
       sample per step" into a test for "exactly three" and stop meaning
       anything. */
    samples: graph.sampleCount('y'),
    calls: controls.advanceCalls()
  });
  window.__tcProbe = probe;
  /* Only clear the global if it is still ours. A later simulation may already
     have mounted and claimed it, and blanking that one's probe would break it. */
  const clearProbe = () => { if (window.__tcProbe === probe) window.__tcProbe = null; };

  /* ---------- Phase 3B prediction ----------
     Built HERE, after the sliders, launch() and the loop exist. Placed earlier
     it threw "Cannot access 'SP' before initialization" and the whole
     simulation failed to start: the prediction reads the slider values to build
     its question, and they are `const`s declared further down.

     The observed value is read from the graph's own record of what the
     simulation integrated - never recomputed from theory - so the comparison
     and the curve on screen cannot disagree. */
  const targetFor = () => {
    const u = SP.get(), th = AN.get() * Math.PI / 180, h = H0.get();
    const vy0 = u * Math.sin(th);
    /* Ideal flight time; drag has no closed form, so this only PROPOSES an
       instant. The reveal waits for the real recorded range and reports
       honestly if the target turns out to be unreachable. */
    const tFly = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G * h)) / G;
    /* 40% of the flight, not 60%. Apex sits at 50% of the flight, so 60% asked
       "how high is it on the way DOWN" - measurably true, but it throws away
       the teaching moment, because the interesting prediction is the one made
       while the ball is still climbing. Clamped to at least 0.3s so a slow,
       low-angle launch still gets a readable question, and to 92% of flight so
       a very fast one stays inside the run. */
    return Math.min(Math.max(0.3, tFly * 0.4), tFly * 0.92);
  };

  let pendingReveal = null;
  let revealTimer = 0;
  function stopWatching() {
    if (revealTimer) { clearInterval(revealTimer); revealTimer = 0; }
  }
  function watchForTarget() {
    stopWatching();
    revealTimer = setInterval(() => {
      if (!pendingReveal || pred.prediction === null || pred.result) return;
      const range = graph.timeRange('y');
      if (range && range.to >= pendingReveal) {
        if (pred.reveal()) { pendingReveal = null; stopWatching(); }
      }
    }, 120);
  }

  const pred = createPrediction(frame, {
    graph,
    series: 'y',
    unit: 'm',
    quantity: 'height',
    absFloor: 0.2,          /* metres; 20% of a small height would be silly */
    context() {
      const u = SP.get(), th = AN.get() * Math.PI / 180, h = H0.get(), k = DR.get();
      return {
        u, th, h, k,
        paramsText: `u = ${u} m/s, θ = ${Math.round(th * 180 / Math.PI)}°, h₀ = ${h} m, drag k = ${k}`
      };
    },
    targetTime: targetFor,
    question() {
      return `Predict before you launch: how high is the ball at t = ${targetFor().toFixed(2)} s?`;
    },
    /* The measured value. Same instant the question named, because both call
       targetFor() - so the number asked about and the number measured can
       never drift apart. */
    observe() {
      const hit = graph.valueAt('y', targetFor());
      return hit ? { value: hit.y, exact: hit.exact } : null;
    },
    explain(r, ctx) {
      const t = targetFor();
      const ideal = ctx.h + ctx.u * Math.sin(ctx.th) * t - 0.5 * G * t * t;
      if (ctx.k > 0) {
        return `With drag on, the ball bleeds vertical speed as it climbs, so it sits a little below the
          ${ideal.toFixed(1)} m the drag-free formula gives. Drag only ever removes energy.`;
      }
      return `Height follows <b>y = h₀ + (u·sin θ)t − ½gt²</b>. Here that is
        ${ctx.h} + ${(ctx.u * Math.sin(ctx.th) * t).toFixed(1)} − ${(0.5 * G * t * t).toFixed(1)}
        = ${ideal.toFixed(1)} m. The launch term lifts the ball, gravity subtracts, and the subtraction grows
        with t² — which is exactly why the height curve bends over instead of rising forever.`;
    },
    onLock() {
      /* A new estimate means a new run, so the measured height belongs to the
         parameters the student was actually shown. */
      launch();
      pendingReveal = targetFor();
      /* Phase 3C: locking a prediction must RESUME the run. Before the time
         controls existed, the simulation always ran, so the target was always
         reached on its own. With Pause available, a student who paused, read the
         question, typed an estimate and locked it would then sit watching a
         frozen ball forever with the reveal never firing - the poller waits on
         the graph's recorded time range, and a paused graph does not grow. The
         student asked a question that requires the run, so the run starts. */
      controls.play();
      pred.refresh();
      watchForTarget();
    },
    onReset() {
      pendingReveal = null;
      stopWatching();
      launch();
      pred.refresh();
    }
  });
  /* Now that the prediction exists, a slider move can refresh the question and
     cancel a stale reveal as well as relaunching. Assigned once, here. */
  predApi = pred;
  onParamsChanged = () => {
    launch();
    pendingReveal = null;
    stopWatching();
    predApi.refresh();
  };
  pred.refresh();

  /* Lifecycle: the poller must die with the frame. Without this it keeps
     firing against a detached graph after every route change. The time controls
     are torn down here too - they own their own rAF loop, and unlike SU.loop's
     chain it has to be cancelled explicitly or it keeps calling render() on a
     detached canvas. */
if (window.MutationObserver) {
    const mo2 = new MutationObserver(() => {
      if (!frame.isConnected) { stopWatching(); controls.destroy(); clearProbe(); mo2.disconnect(); }
    });
    mo2.observe(document.getElementById('main') || frame, { childList: true, subtree: true });
  }
});

/* ---------------- Spring-mass SHM ---------------- */
Sims.register('shm', 'Spring-Mass SHM', 'x(t) = A cos ωt — the heartbeat of physics.', '⏱️', frame => {
  const cv = SU.canvas(frame, 260);
  const ctr = SU.el('div', 'sim-controls'); frame.appendChild(ctr);
  const ro = SU.el('div', 'sim-readouts'); frame.appendChild(ro);
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

  /* Phase 3C: same three-way split as the projectile - advance integrates one
     fixed sub-step, sample records one graph point, render draws only. The SHM
     integrator is unchanged; only the timestep is now constant. */
  function advance(h) {
    const m = M.get(), k = K.get(), dmp = D.get();
    /* physics, in PIXELS per second - exactly as before this change */
    v += (-k / m * xPix - dmp * v) * h;
    xPix += v * h;
    gt += h;
    trace.push(xPix); if (trace.length > 320) trace.shift();
  }

  function sample() {
    /* Graph and readout both report displacement in metres (px / 60), so the
       plotted curve and the number beside it agree. Velocity is converted with
       the same factor - the first version pushed raw px/s and the legend read
       "-295 m/s", which is not a velocity anything in this sim produces. */
    graph.push({ gt, x: xPix / 60, v: v / 60 });
  }

  function render() {
    const m = M.get(), k = K.get(), dmp = D.get();
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
  }

  /* The old "⟲ Restart" button is replaced by the shared control bar's Reset.
     Left in place it would have been a second, differently-behaved reset - this
     one would re-run while the bar's would hold the pause state - and a student
     would have no way to tell which rule applied. */
  const controls = createSimControls({
    parent: frame,
    advance, sample, render,
    reset,
    getTime: () => gt,
    timeUnit: 's',
    /* The mass never runs out of oscillation - damping can only slow it, and
       with d = 0 it swings forever - so Step is never blocked here. */
    canAdvance: () => true,
    stepLabel: 'oscillation time step'
  });

  const shmProbe = () => ({
    t: gt, x: xPix / 60, v: v / 60,
    y0: (AM ? AM.get() : 80) / 60,
    paused: controls.isPaused(),
    samples: graph.sampleCount('x'),   /* one series only - see the projectile note */
    calls: controls.advanceCalls()
  });
  window.__tcProbe = shmProbe;
  const clearProbe = () => { if (window.__tcProbe === shmProbe) window.__tcProbe = null; };

  /* ---------- Phase 3B prediction ----------
     SHM's teaching moment is the QUARTER-PERIOD relationship: starting from
     maximum displacement with zero velocity, the mass reaches equilibrium
     after T/4. Asking "where is it at T/4" forces the student to work out
     what a quarter of an oscillation looks like, and the graph shows the
     crossing rather than a peak - which is the intuition the curve exists to
     give. Target is one quarter of the period this configuration actually has,
     so it always lands inside the run. */
  const periodOf = () => 2 * Math.PI * Math.sqrt(M.get() / K.get());
  const targetFor = () => periodOf() * 0.25;

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
    quantity: 'displacement',
    absFloor: 0.05,        /* metres; displacement is small in this sim */
    context() {
      return {
        m: M.get(), k: K.get(), d: D.get(),
        T: periodOf(),
        paramsText: `m = ${M.get()} kg, k = ${K.get()} N/m, T = ${periodOf().toFixed(2)} s`
      };
    },
    targetTime: targetFor,
    question() {
      return `Predict first: starting from maximum displacement, what is the displacement at
        t = ${targetFor().toFixed(2)} s?`;
    },
    observe() {
      const hit = graph.valueAt('x', targetFor());
      return hit ? { value: hit.y, exact: hit.exact } : null;
    },
    explain(r, ctx) {
      const t = targetFor();
      if (ctx.d > 0.02) {
        return `Damped, so the mass arrives a little before zero and slightly under the ideal amplitude.
          Remove damping (set it to 0) and this becomes exactly zero: it is the crossing point.`;
      }
      return `This is the quarter-period. Starting at maximum displacement with v = 0, simple harmonic motion is
        <b>x(t) = A·cos(ωt)</b>, and at t = T/4 we have ωt = π/2, so cos(π/2) = 0 and
        x = 0. A quarter of an oscillation after the start, the mass is passing through
        equilibrium — and that is where its speed is greatest.`;
    },
    onLock() {
      /* Phase 3C: resume the run, same reason as the projectile - the reveal
         poller waits on the graph's recorded time range, and a paused graph does
         not grow, so a student who locked a prediction while paused would wait
         forever. The question requires the run, so the run starts. */
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
