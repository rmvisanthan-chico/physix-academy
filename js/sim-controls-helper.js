/* PhysiX Academy — Phase 3C.1 helper: attach shared time controls to a
 * simulation whose physics already exists as a plain function.
 *
 * WHY THIS EXISTS
 * Phase 3C proved the architecture on three simulations by hand: split the
 * simulation into advance(h) / sample() / render(), then hand those to
 * createSimControls. That is correct but it is ~40 lines of boilerplate per
 * simulation, done 48 times by hand, and hand-repetition is exactly how
 * simulations start to disagree with each other about when they pause and when
 * they sample.
 *
 * So this wraps the same shared controller rather than reimplementing it. There
 * is still ONE loop, ONE integration path and ONE teardown, all owned by
 * js/sim-controls.js. This module adds no physics, no state and no graph of its
 * own - it only removes the repetition.
 *
 * WHAT IT DOES NOT DO
 * It does not give a simulation a clock it did not have. Several simulations
 * advance purely from a frame delta (a travelling wave is a function of time, not
 * an integrator), and several are static diagrams with no time axis at all. Those
 * are classified as not applicable rather than being given a Step button that
 * would advance nothing and imply otherwise.
 */
import { createSimControls, FIXED_DT } from './sim-controls.js';

/**
 * Attach Play / Pause / Step / Reset to a simulation.
 *
 * @param {object}   o
 * @param {Element}  o.frame     the .sim-frame element (the panel that gets torn
 *                                down on navigation)
 * @param {Function} o.advance   (h) => void  one fixed physics sub-step
 * @param {Function} o.render    () => void   draw only; must never integrate
 * @param {Function} [o.sample]  () => void   one graph sample; omit when the
 *                                simulation has no graph
 * @param {Function} o.reset     () => void   restore initial conditions
 * @param {Function} [o.getTime] () => number simulation time in seconds
 * @param {Function} [o.canAdvance] () => boolean  stop integrating (ball landed,
 *                                run finished)
 * @param {string}   [o.timeUnit='s']
 * @param {string}   [o.stepLabel]
 * @param {string[]} [o.replaceButtons] button labels whose existing Reset button
 *                                this control bar supersedes, so a simulation
 *                                cannot end up with two different resets
 * @returns {object} the controls handle, plus .destroy()
 */
export function attachTimeControls(o) {
  /* Called whenever play/pause/reset changes state. Lets a simulation refresh
     readouts that depend on values which can be edited while paused - otherwise
     moving a slider during a pause would leave the readout describing the old
     run, with no visible cause. */
  const onStateChange = o.onStateChange;

  /* Remove a superseded Reset/Restart/Replay button. Left in place, a simulation
     would have two resets with different rules - one that re-ran the sim, one
     that holds the pause state - and a student would have no way to know which
     rule applied. The class is used rather than the label so a disabled or
     re-worded button is still caught. */
  if (o.replaceButtons && o.replaceButtons.length) {
    const acts = o.frame.querySelectorAll('.sim-actions');
    acts.forEach(act => {
      [...act.children].forEach(btn => {
        if (o.replaceButtons.some(label => btn.textContent.includes(label))) btn.remove();
      });
      /* An emptied .sim-actions still carries `padding:0 1rem 1rem`, so an empty
         one would leave a stray gap under the controls. Removed only when it is
         genuinely empty - a sim that keeps other buttons keeps its row. */
      if (!act.children.length) act.remove();
    });
  }

  const ctl = createSimControls({
    parent: o.frame,
    advance: o.advance,
    render: o.render,
    sample: o.sample,
    reset: o.reset,
    getTime: o.getTime || (() => 0),
    timeUnit: o.timeUnit || 's',
    canAdvance: o.canAdvance,
    stepLabel: o.stepLabel,
    onStateChange
  });

  /* Phase 3C.1 test probe.
     Exposed so the shared verification suite can assert on a simulation's own
     physics state rather than on repainted pixels. That distinction is not
     pedantry: a canvas that simply was not redrawn looks identical to a
     simulation that genuinely stopped integrating, and only the second is a bug.
     `calls` is the controller's integration counter, which is how the suite
     proves "one Step = exactly one integration" rather than inferring it from an
     elapsed time that a slow frame could imitate.

     Replaced only if the previous owner released it (see the destroy hook), and
     cleared on unmount so a stale probe cannot outlive its simulation. */
  if (o.probe) {
    const probe = () => {
      const p = o.probe() || {};
      p.calls = ctl.advanceCalls();
      p.paused = ctl.isPaused();
      return p;
    };
    if (!window.__tcOwner || !window.__tcOwner.connected) {
      window.__tcProbe = probe;
      window.__tcOwner = o.frame;
    }
    ctl.onRelease = () => {
      if (window.__tcProbe === probe) { window.__tcProbe = null; window.__tcOwner = null; }
    };
  }

  /* Teardown. The controls own their own rAF chain - unlike SU.loop's, which
     stops on its own when the canvas disconnects - so it has to be cancelled
     explicitly or it keeps calling render() on a detached canvas forever.
     Every simulation needs this, and forgetting it is invisible in a screenshot
     and shows up only as rising memory across navigations. */
  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(() => {
      if (!o.frame.isConnected) {
        ctl.destroy();
        mo.disconnect();
        if (window.__tcOwner === o.frame) { window.__tcProbe = null; window.__tcOwner = null; }
      }
    });
    mo.observe(document.getElementById('main') || o.frame, { childList: true, subtree: true });
  }

  return ctl;
}

/* Re-exported so a simulation only has to import from one place. */
export { FIXED_DT };