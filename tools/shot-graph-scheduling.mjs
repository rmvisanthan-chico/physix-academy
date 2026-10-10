/* PhysiX Academy — Phase 3C.2 visual verification for the gutter and idle-loop
 * fixes. Captures the real graph before/after a resize, and while running vs
 * paused, at desktop and 390px.
 *
 * Run: node tools/shot-graph-scheduling.mjs [baseUrl]
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();

const BASE = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'chrome' });

for (const [tag, vp] of [['desktop', { width: 1280, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await browser.newPage({ viewport: vp });
  await p.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'networkidle' });
  await p.waitForSelector('.pgraph-plot');
  await p.waitForTimeout(900);

  /* The graph only, so the gutter and the plot edge are actually visible. */
  const shot = async (name) => {
    const el = await p.$('.pgraph');
    if (el) await el.screenshot({ path: `tools/.shots/tc2-${name}-${tag}.png` });
  };

  const geom = await p.evaluate(() => {
    const g = window.PhysixGraph.graphs.all[0];
    return { W: g.cssW, gut: g._gut, PW: g._PW, identity: Math.abs(g._PW + g._gut - g.cssW) < 1e-6 };
  });
  console.log(`  ${tag} wide : W=${geom.W} gut=${geom.gut} PW=${geom.PW} identity-ok=${geom.identity}`);
  await shot('wide');

  /* Narrow the viewport, which is the case the review named: the first frame
     after a resize must already use the new width and the re-measured gutter. */
  await p.setViewportSize(tag === 'mobile'
    ? { width: 390, height: 844 }
    : { width: 700, height: 1000 });
  await p.waitForTimeout(500);
  const geom2 = await p.evaluate(() => {
    const g = window.PhysixGraph.graphs.all[0];
    return {
      W: g.cssW, gut: g._gut, PW: g._PW,
      identity: Math.abs(g._PW + g._gut - g.cssW) < 1e-6,
      capped: g._gut <= Math.floor(g.cssW * 0.30)
    };
  });
  console.log(`  ${tag} narrow: W=${geom2.W} gut=${geom2.gut} PW=${geom2.PW} ` +
    `identity-ok=${geom2.identity} capped=${geom2.capped}`);
  await shot('narrow');

  /* Paused vs running: the curve must be identical, because Pause stops physics
     and the graph must not invent movement. */
  await p.click('.sim-time-play');
  await p.waitForTimeout(400);
  await shot('paused');
  const pausedState = await p.evaluate(() => {
    const g = window.PhysixGraph.graphs.all[0];
    return { draw: g.drawCount, n: g.series[0].len, state: document.querySelector('.sim-time-state').textContent.trim() };
  });
  await p.waitForTimeout(900);
  const stillPaused = await p.evaluate(() => {
    const g = window.PhysixGraph.graphs.all[0];
    return { draw: g.drawCount, n: g.series[0].len };
  });
  console.log(`  ${tag} paused: ${pausedState.state} | draws ${pausedState.draw} -> ${stillPaused.draw} ` +
    `| samples ${pausedState.n} -> ${stillPaused.n} (both must be unchanged)`);

  /* Resume must draw again. */
  await p.click('.sim-time-play');
  await p.waitForTimeout(700);
  const resumed = await p.evaluate(() => {
    const g = window.PhysixGraph.graphs.all[0];
    return { draw: g.drawCount, n: g.series[0].len };
  });
  console.log(`  ${tag} resumed: draws ${stillPaused.draw} -> ${resumed.draw} ` +
    `| samples ${stillPaused.n} -> ${resumed.n} (both must grow)`);
  await shot('resumed');

  await p.close();
}
await browser.close();
console.log('  wrote tc2-*.png');