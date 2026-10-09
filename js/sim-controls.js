/* PhysiX Academy — Phase 3C: shared Play / Pause / Step / Reset controls.

/* THE PROBLEM THIS SOLVES
   Every simulation in the project used to be driven by SU.loop, which hands the
   physics a VARIABLE timestep:

       const dt = Math.min(0.033, (t - last) / 1000);   // core.js

   Two consequences, one cosmetic and one real:

   1. "Step forward one step" has no meaning. There is no step. Whatever fraction
      of a second the display happened to take IS the step, so it differs on a
      60Hz laptop, a 144Hz gaming monitor, and after a GC pause.

   2. The trajectory is frame-rate dependent. These integrators are first-order
      (semi-implicit Euler), so the answer depends on the sampling rate: the range
      a student measures depends on their monitor's refresh rate. That is not a
      rounding difference, it is a wrong number for a physics lesson, and it would
      silently undermine the prediction exercise that asks a student to trust what
      the simulation integrated.

   So the controls drive a FIXED timestep, FIXED_DT, and run
   floor(accumulated / FIXED_DT) sub-steps per frame. Same integrator, same
   equations, no physics rewritten - only the clock is now honest. At 60Hz this is
   one sub-step per frame, which is what the old variable step produced at 60Hz,
   so the existing verified numbers are preserved while 144Hz users stop getting a
   different answer.

   FIXED_DT is 1/60 s because that matches the nominal frame the old variable step
   was aiming for on a 60Hz display. It sits comfortably inside the stability limit
   of the stiffest spring in the project (SHM k=80, m=0.5 gives w = sqrt(k/m) ~ 12.6
   rad/s, so w*dt ~ 0.21, well under the ~2 that explicit integration tolerates).

ONE LOOP, ONE INTEGRATION PATH
   The most likely way to get this wrong is a Step button that advances the physics
   while the animation frame ALSO advances it - the same simulated instant gets
   integrated twice and the ball silently teleports. Here the loop and the Step
   button both go through advanceFixed(), and nothing else is permitted to call
   advance(). Step is not a second copy of the physics; it is the same code path
   asked to do one iteration instead of n.

PAUSE IS A GATE, NOT A TEARDOWN
   Pausing keeps the render loop alive and keeps drawing, so the frozen state stays
   on screen and the graph stays visible. Only the integration is skipped. Tearing
   the loop down instead would blank the canvas and look like a crash.

RESUME DOES NOT TIME-JUMP
   On resume the fractional accumulator is cleared and the clock re-based to the
   moment of the click. Time that passed while paused was not simulated, so it must
   not be handed to the physics as one enormous catch-up step. The same reasoning
   clears the accumulator across a hidden tab: the existing hidden-tab guard skips
   integration, and a backdated clock here would undo that guard.
*/

/* Upper bound on sub-steps consumed by a single frame. A long stall (GC, a heavy
   repaint, a throttled backgrounded window) must not become a burst of catch-up
   integration that takes longer than the next frame to compute, which is how a
   "spiral of death" starts. Past this the backlog is dropped, not chased. */
export const MAX_SUBSTEPS_PER_FRAME = 10;

/* Real time we are willing to integrate in one go. Anything longer is a stall and
   is skipped: a teaching simulation is not obliged to reconstruct every
   millisecond a laptop spent asleep. */
const MAX_FRAME_DT = 0.25;

export const FIXED_DT = 1 / 60;

export function createSimControls(opts) {
  const parent = opts.parent;
  const advance = opts.advance;      /* (h) => integrate exactly one sub-step */
  const sample = opts.sample;        /* () => push ONE graph sample          */
  const render = opts.render;        /* () => draw only, never integrate      */
  /* Where to sit in the frame. These simulations build canvas -> sliders ->
     readouts -> graph, and the graph already owns the bottom of the panel. A
     bar appended last would land BELOW the graph, pushing the thing the
     student is interrogating a full screen away from the controls that
     interrogate it. So the bar is inserted before the graph by default. */
  const anchor = opts.anchor || parent.querySelector('.pgraph') || null;
  const getTime = opts.getTime || (() => 0);
  const timeUnit = opts.timeUnit || 's';
  const canAdvance = opts.canAdvance || (() => true);
  const stepLabel = opts.stepLabel || 'simulation time step';

  /* `paused` is the single source of truth for whether physics runs. A plain
     boolean rather than a stack of flags, so five Play clicks still leave exactly
     one running loop in exactly one running state. */
  let paused = false;
  let stepSeconds = FIXED_DT;
  let acc = 0;
  let last = 0;
  let alive = true;
  let raf = 0;

  /* Counts every advance() call. This exists so a test can prove the integration
     path ran exactly N times for N intended steps, instead of inferring it from
     a time difference. Inferring from time is the weaker assertion: a double
     integration and a slow frame can produce the same elapsed time, so a
     time-based check would pass a real bug. Read-only to callers - nothing here
     lets a test drive the physics. */
  let advanceCalls = 0;

  /* ---------- the one integration path ---------- */

  /* n fixed sub-steps, then one graph sample. Free-running calls this with however
     many sub-steps the elapsed time bought; Step calls it with the number of
     sub-steps in the configured step. They share it, which is what makes "the step
     handler and the loop cannot double-integrate" a property of the code rather
     than a promise in a comment. */
  function advanceFixed(n) {
    let done = 0;
    for (let i = 0; i < n; i++) {
      if (!canAdvance()) break;      /* landed, or the run is otherwise finished */
      advance(FIXED_DT);
      /* One sample PER SUB-STEP, not one per frame.
         The old SU.loop code pushed once per animation frame, which coincided
         with one physics step only because the old dt was frame-derived and
         nominally 60Hz. Once the timestep became fixed that coincidence stopped
         being guaranteed, and the graph would have become a sampled sketch of
         the trajectory instead of a record of it: two sub-steps inside one frame
         would leave only the final one on the plot.

         Sampling here rather than after the loop is what makes the graph an exact
         record of every instant the physics visited, and what makes Step exact -
         one step is one point. It also keeps the sample spacing independent of
         the display refresh rate. */
      sample();
      advanceCalls++;
      done++;
    }
    return done;
  }

  /* ---------- the single animation loop ---------- */
  function frame(now) {
    if (!alive || !parent.isConnected) { destroy(); return; }

    /* Hidden-tab protection, preserved from SU.loop: keep the rAF chain alive so
       returning does not need a re-mount, but integrate nothing, and re-base the
       clock so the first visible frame cannot see a huge dt. */
    if (document.hidden) {
      last = now; acc = 0;
      raf = requestAnimationFrame(frame);
      render();
      return;
    }

    let dt = (now - last) / 1000;
    last = now;
    if (!(dt >= 0)) dt = 0;          /* first frame has no reference yet */
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;

    if (paused) {
      acc = 0;                        /* time while paused was not simulated */
    } else {
      acc += dt;
      let n = Math.floor(acc / FIXED_DT);
      if (n > MAX_SUBSTEPS_PER_FRAME) n = MAX_SUBSTEPS_PER_FRAME;
      acc -= n * FIXED_DT;
      if (acc > FIXED_DT) acc = 0;    /* a dropped backlog must not accumulate */
      if (n > 0) { advanceFixed(n); updateClock(); }
    }

    /* Drawn unconditionally, including while paused, on purpose. */
    render();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- controls UI ---------- */

  const bar = document.createElement('div');
  bar.className = 'sim-time';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Simulation time controls');

  function mkBtn(cls, text, aria, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-sm ' + cls;
    b.textContent = text;
    b.setAttribute('aria-label', aria);
    b.addEventListener('click', fn);
    bar.appendChild(b);
    return b;
  }

  /* One toggle rather than separate Play and Pause buttons: two buttons for one
     boolean means one is always meaningless, and a student who presses the wrong
     one is left unsure whether anything happened. */
  const playBtn = mkBtn('sim-time-play', '⏸ Pause', 'Pause the simulation', () => {
    if (paused) play(); else pause();
  });

  const stepBtn = mkBtn('sim-time-step', '⏭ Step', 'Advance one ' + stepLabel, () => step());

  const resetBtn = mkBtn('sim-time-reset', '⟲ Reset',
    'Reset the simulation to its initial conditions', () => reset());

  /* Step size. A 1.44s flight is 87 clicks at 1/60s - tedious enough to be a real
     barrier to using the control for its purpose. Coarser options stay ACCURATE: a
     1/30s step is integrated as two 1/60s sub-steps, so the physics never sees a
     bigger step than before, only the number of samples on screen changes. */
  const stepWrap = document.createElement('label');
  stepWrap.className = 'sim-time-stepwrap';
  const stepCaption = document.createElement('span');
  stepCaption.textContent = 'Step size';
  const stepSel = document.createElement('select');
  stepSel.className = 'sim-time-stepsize';
  stepSel.setAttribute('aria-label', 'Length of one step');
  [[FIXED_DT, '1/60 s'], [1 / 30, '1/30 s'], [1 / 20, '1/20 s'], [0.1, '0.1 s']]
    .forEach(([val, label]) => {
      const o = document.createElement('option');
      o.value = String(val);
      o.textContent = label;
      if (val === FIXED_DT) o.selected = true;
      stepSel.appendChild(o);
    });
  stepSel.addEventListener('change', () => {
    stepSeconds = parseFloat(stepSel.value) || FIXED_DT;
    updateClock();
  });
  stepWrap.appendChild(stepCaption);
  stepWrap.appendChild(stepSel);
  bar.appendChild(stepWrap);

  /* Running/paused as an icon AND a word, never colour alone. */
  const state = document.createElement('span');
  state.className = 'sim-time-state';
  state.setAttribute('role', 'status');    /* announced on change */
  bar.appendChild(state);

  const clock = document.createElement('span');
  clock.className = 'sim-time-clock';
  bar.appendChild(clock);

  if (anchor && anchor.parentNode === parent) parent.insertBefore(bar, anchor);
  else parent.appendChild(bar);

  /* ---------- public actions ---------- */

  function setPaused(v) {
    if (paused === v) return;
    paused = v;
    playBtn.textContent = paused ? '▶ Play' : '⏸ Pause';
    playBtn.setAttribute('aria-label', paused ? 'Resume the simulation' : 'Pause the simulation');
    playBtn.setAttribute('aria-pressed', String(!paused));
    bar.classList.toggle('is-paused', paused);
    bar.classList.toggle('is-running', !paused);
    /* A role=status region announces only when its text CHANGES, so this has to
       carry a word the student can act on, not just a swapped glyph. */
    state.textContent = paused ? '⏸ Paused' : '▶ Running';
    if (paused) acc = 0; else last = performance.now();
    updateClock();
    if (opts.onStateChange) opts.onStateChange(paused);
  }

  function play() {
    /* Deliberately does NOT start a new loop. The loop has run since mount; Play
       only opens the gate. This is the entire reason repeated Play clicks cannot
       stack up duplicate animation loops. */
    setPaused(false);
  }

  function pause() { setPaused(true); }

  /* Step while running pauses FIRST, then advances one step. Stepping on top of a
     moving simulation would leave the student unsure whether they are looking
     before or after the step, and would risk integrating the same instant twice
     if the loop happened to fire in between. */
  function step() {
    setPaused(true);
    const n = Math.max(1, Math.round(stepSeconds / FIXED_DT));
    advanceFixed(n);
    last = performance.now();
    render();
    updateClock();
  }

  /* Reset keeps the current play/pause state on purpose. A student who paused,
     stepped to an interesting state and then hits Reset wants to be left paused
     at t = 0 so they can step forward again - not launched. */
  function reset() {
    acc = 0;
    opts.reset();
    last = performance.now();
    render();
    updateClock();
  }

  function updateClock() {
    const t = getTime();
    clock.textContent = (paused && t > 0 ? 'paused at ' : 't = ') + t.toFixed(2) + ' ' + timeUnit;
    clock.classList.toggle('is-paused', paused);
  }

  /* Keyboard parity, scoped to this bar so a focused slider or a prediction input
     keeps its own key handling: Space on a focused button must remain that
     button's Space, and ArrowRight must not page through the prediction field. */
  bar.addEventListener('keydown', e => {
    if (e.target !== bar && e.target !== playBtn && e.target !== stepBtn && e.target !== resetBtn) return;
    if (e.key === ' ') { e.preventDefault(); if (paused) play(); else pause(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(); }
  });

  function destroy() {
    if (!alive) return;
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    /* The test probe is a global, so a stale one would survive navigation and
       keep answering with a simulation that no longer exists. Cleared here so a
       later sim cannot be mistaken for this one. Only removed if it is still
       OURS - another sim may have mounted and claimed it since. */
    if (opts.onDestroy) opts.onDestroy();
  }

  /* Initial UI, then the one and only loop. */
  playBtn.setAttribute('aria-pressed', 'true');
  state.textContent = '▶ Running';
  bar.classList.add('is-running');
  updateClock();
  raf = requestAnimationFrame(frame);

  return {
    play, pause, step, reset, destroy,
    isPaused: () => paused,
    /* How many times advance() has been called. See the note above - this is how
       the tests prove "one Step = exactly one integration" rather than guessing
       from elapsed time. */
    advanceCalls: () => advanceCalls,
    get stepSeconds() { return stepSeconds; },
    setStepSeconds(v) { stepSeconds = v || FIXED_DT; stepSel.value = String(stepSeconds); },
    refresh: updateClock,
    FIXED_DT
  };
}

/* Exposed last, deliberately: touching window before the module's consts are
   initialised throws a ReferenceError that takes down every importer - the entire
   app. */
if (typeof window !== 'undefined') {
  window.PhysixTimeControls = { createSimControls, FIXED_DT, MAX_SUBSTEPS_PER_FRAME };
}