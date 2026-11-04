/* PhysiX Academy - ES module entry point (Vite).
   Import order below is the exact former <script> order in index.html.
   Order matters: the data-*.js files push into CURRICULUM / QUIZ_BANK and
   the sims-*.js files call Sims.register() at module evaluation time.
   Vendor libs (three.min.js etc.) stay CLASSIC scripts in index.html;
   they are UMD and would break if loaded as modules.

   M9: SIMULATION MODULES REMOVED FROM EAGER IMPORTS.
   They are now lazy-loaded via js/sims-loader.js when Sims.mount() is called.
   Non-critical feature views (pages.js, lab.js, etc.) are also deferred. */

import './tex-speech.js';
import './utils.js';
import './data-core.js';
import './data-ncert9.js';
import './data-ncert10.js';
import './data-ncert11.js';
import './data-ncert12.js';
import './data-jee.js';
import './data-slarora11.js';
import './videos.js';
import './data-l3a.js';
import './data-l3b.js';
import './data-l3c.js';
import './data-l3d.js';
import './data-l3e.js';
import './data-l4.js';
import './data-quiz-a.js';
import './data-quiz-b.js';
import './data-quiz-c.js';
/* sims-a.js imported for Sims registry + mount() — sims-b/c/d/e/ncert/phet/more/3d-a/3d-b/3d-pages/realism removed */
import './sims-a.js';
import './blocks.js';
import './tutor.js';
import './views.js';
/* pages.js deferred — loaded on first navigation to /practice, /sims, /tutor */
import './formulas.js';
import './calculators.js';
import './graph.js';
import './progress.js';
import './mastery.js';
import './path-engine.js';
import './data-achievements.js';
import './achievements.js';
import './data-quiz-meta.js';
import './assessment-engine.js';
import './mistakes.js';
import './dashboard.js';
import './scientists.js';
import './cinematic.js';
import './anime-demo.js';
import './hero3d.js?v=77';
import './3d.js';
import './scroll-cinema.js';
import './app.js';
import './core.js';
import './graph-engine.js';
import './sim-controls-helper.js';
import './prediction.js';
import './sim-controls.js';
import './profile.js';
/* lab.js deferred — loaded on first navigation to /lab */
/* lab-experiments.js deferred — loaded with lab.js */

/* Disarms the boot watchdog in js/boot-guard.js. This line only runs if every
   import above evaluated cleanly, which is exactly the condition the watchdog
   is waiting for. */
window.__PHYSIX_BOOTED = true;
