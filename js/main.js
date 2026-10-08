/* PhysiX Academy - ES module entry point (Vite).
   Import order below is the exact former <script> order in index.html.
   Order matters: the data-*.js files push into CURRICULUM / QUIZ_BANK and
   the sims-*.js files call Sims.register() at module evaluation time.
   Vendor libs (three.min.js etc.) stay CLASSIC scripts in index.html;
   they are UMD and would break if loaded as modules. */

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
import './sims-a.js';
import './sims-b.js';
import './sims-c.js';
import './sims-d.js';
import './sims-e.js';
import './sims-ncert.js';
import './sims-realism.js';
import './sims-more.js';
import './sims-phet.js';
import './games.js';
import './sims3d-a.js';
import './sims3d-b.js';
import './sims3d-pages.js';
import './blocks.js';
import './tutor.js';
import './views.js';
import './pages.js';
import './formulas.js';
import './calculators.js';
import './graph.js';
import './progress.js';
import './mastery.js';
import './mistakes.js';
import './dashboard.js';
import './scientists.js';
import './cinematic.js';
import './anime-demo.js';
import './hero3d.js';
import './3d.js';
import './scroll-cinema.js';
import './app.js';

/* Disarms the boot watchdog in js/boot-guard.js. This line only runs if every
   import above evaluated cleanly, which is exactly the condition the watchdog
   is waiting for. */
window.__PHYSIX_BOOTED = true;
