/* PhysiX Academy — Phase 3C.2 regression tests for the two Graph Engine defects.
 *
 *   node tools/verify-graph-scheduling.mjs [baseUrl]
 *
 * 1. STALE GUTTER. The y-tick gutter is derived from measureText() over the
 *    current y-scale, and every x-coordinate in the plot depends on the plot
 *    width, which depends on the gutter. The engine used to measure the gutter
 *    AFTER deriving the plot width, so the plot was laid out with the PREVIOUS
 *    frame's gutter - off by exactly one frame everywhere, and worst right after
 *    a resize or after the no-data path (which zeroed it).
 *
 *    The test forces the exact conditions that make the lag visible: narrow the
 *    canvas so the 30% gutter cap binds, push data whose labels are WIDE, then
 *    resize and inspect the geometry of the frame drawn immediately afterwards.
 *
 * 2. CONTINUOUS FRAMES WHILE IDLE. The engine used to re-arm its rAF callback
 *    unconditionally at the end of every frame, so an idle graph still cost a
 *    frame every 16ms. The test counts real animation frames attributable to the
 *    graph while nothing is happening, then proves live updates, resizing and
 *    tab-return still redraw correctly.
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
const results = [];
const ok = (n, c, extra) => results.push({ n, pass: !!c, extra });

const browser = await chromium.launch({ channel: 'chrome' });

/* Does this deployment serve the engine as a standalone ES module?
   The Vite bundle inlines it into one chunk, so /js/graph-engine.js does not
   exist there. The two unit sections below import that path directly, so against
   dist/ they cannot run - and the whole suite used to abort on a 30s timeout
   instead of saying so. Production serves the repo unbundled, so the units run
   there; the bundled build still gets the end-to-end section, which exercises
   the same code through the real app. */
const engineModuleAvailable = await (async () => {
  try {
    const res = await fetch(`${BASE}/js/graph-engine.js`);
    if (!res.ok) return false;
    return /export\s+(class|function|const)/.test(await res.text());
  } catch { return false; }
})();
if (!engineModuleAvailable) {
  console.log('  note: /js/graph-engine.js is not served here (bundled build inlines it);');
  console.log('        skipping the module-level gutter and scheduling units,');
  console.log('        still running the end-to-end section against the real app.');
}

/* A genuinely EMPTY page on the server's origin.
   The first version of this test did `goto(index.html)` then `setContent(...)`.
   That looked like it produced a bare page and did not: goto boots the entire
   app, every module and its rAF loops start, and setContent then swaps the DOM
   underneath a still-running application. The idle counter was therefore counting
   the APP's frames, not the graph's, and reported ~60/sec against an engine that
   had already stopped re-arming. A routing stub keeps the same origin - needed
   so the graph module can be imported over http - with nothing else running. */
async function barePage(browser, width = 640) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/__graph_test.html', route => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: `<!doctype html><html><head><meta charset="utf-8">
      <title>graph test</title>
      <link rel="stylesheet" href="/css/style.css">
      </head><body style="margin:0;background:#0b1020">
      <div id="host" style="width:${width}px"></div>
      <script type="module">
        import '/js/graph-engine.js';
        window.__engineReady = true;
      </script></body></html>`
  }));
  await page.goto(`${BASE}/__graph_test.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__engineReady);
  return page;
}

if (engineModuleAvailable) {
  /* ------------------------------------------------------------------ *
   * 1. Gutter geometry
   * ------------------------------------------------------------------ */
  {
    const page = await barePage(browser, 640);
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).split('\n')[0]));

    await page.addScriptTag({ type: 'module', content: `
      import { createGraph } from '/js/graph-engine.js';
      const g = createGraph(document.getElementById('host'), {
        xLabel: 'Time', xUnit: 's', yLabel: 'y', yUnit: 'm', title: 'gutter test', height: 180
      }, [{ id: 'y', label: 'y', unit: 'm', color: '#ff00ff' }]);
      window.__g = g;
    `});
    await page.waitForFunction(() => !!window.__g);

    /* Draw with wide tick labels. The y range spans -9999..9999, so every label is
       five characters and the gutter is at its widest for this width. */
    const wide = await page.evaluate(async () => {
      const g = window.__g;
      for (let i = 0; i <= 60; i++) g.push({ x: i / 60, y: -9999 + (19998 * i) / 60 });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { gut: g._gut, W: g.cssW, PW: g.cssW - g._gut };
    });

    ok('gutter: engine measured a non-zero gutter for wide labels', wide.gut > 0,
      `gut=${wide.gut}px`);
    ok('gutter: plot width excludes the gutter', Math.abs(wide.PW - (wide.W - wide.gut)) < 1e-6,
      `PW=${wide.PW.toFixed(2)} W-gut=${(wide.W - wide.gut).toFixed(2)}`);

    /* The real assertion: the gutter reported for THIS frame must be the one the
       labels for THIS frame needed. Recomputed independently here, using the same
       scale the engine is drawing, and compared against what it reports.
       If the engine measured before computing the scale - or measured last frame's
       scale - these disagree, which is exactly the bug. */
    const consistent = await page.evaluate(async () => {
      const g = window.__g;
      await new Promise(r => requestAnimationFrame(r));
      const expect = g._measureTicks(g.cssW);
      return { reported: g._gut, expected: expect, scale: g.scale };
    });
    ok('gutter: reported gutter matches a fresh measurement of the CURRENT scale',
      consistent.reported === consistent.expected,
      `reported=${consistent.reported} expected=${consistent.expected} ` +
      `y=[${consistent.scale && consistent.scale.y0}, ${consistent.scale && consistent.scale.y1}]`);

    /* Now resize narrow enough that the 30% cap binds, and check the very next
       drawn frame - this is the case that produced overlapping/clipped labels. */
    await page.evaluate(() => { document.getElementById('host').style.width = '150px'; });
    await page.waitForTimeout(150);
    const narrow = await page.evaluate(async () => {
      const g = window.__g;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { gut: g._gut, W: g.cssW, cap: Math.floor(g.cssW * 0.30) };
    });
    ok('gutter: after a resize the gutter respects the 30% cap for the NEW width',
      narrow.gut <= narrow.cap,
      `gut=${narrow.gut} cap=${narrow.cap} W=${narrow.W}`);
    ok('gutter: after a resize the plot still has positive width',
      narrow.W - narrow.gut > 0,
      `plot=${(narrow.W - narrow.gut).toFixed(1)}px`);

    /* Repeated resizes must not drift: the last frame's gutter is never used. */
    const seq = await page.evaluate(async () => {
      const host = document.getElementById('host');
      const g = window.__g;
      const seen = [];
      for (const w of [640, 320, 180, 500, 140]) {
        host.style.width = w + 'px';
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        seen.push({ w: g.cssW, gut: g._gut });
      }
      return seen;
    });
    const drift = seq.filter(s => s.gut > Math.floor(s.w * 0.30) || s.gut < 0);
    ok('gutter: no drift across five rapid resizes', drift.length === 0,
      drift.length ? JSON.stringify(drift) : seq.map(s => `${s.w}->${s.gut}`).join(' '));

    /* The no-data path used to zero the gutter outright; a graph that then gained
       data drew its first real frame with a gutter of 0. */
    const nodata = await page.evaluate(async () => {
      const g = window.__g;
      g.clear();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const afterClear = g._gut;
      for (let i = 0; i <= 60; i++) g.push({ x: i / 60, y: -9999 + (19998 * i) / 60 });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { afterClear, afterData: g._gut, expected: g._measureTicks(g.cssW) };
    });
    ok('gutter: no-data frame uses zero (nothing to reserve for)', nodata.afterClear === 0,
      `gut=${nodata.afterClear}`);
    ok('gutter: first frame WITH data has the correct gutter, not zero',
      nodata.afterData > 0 && nodata.afterData === nodata.expected,
      `gut=${nodata.afterData} expected=${nodata.expected}`);

    /* The assertion that actually catches the bug.
       Reading `g._gut` proves nothing: the buggy version stores the CORRECT gutter
       by the end of the draw - it just derived the plot width from the PREVIOUS
       one. So the stored value looks fine while the canvas was laid out with the
       old gutter. A test that reads _gut passes against the defect, which is
       exactly what the first attempt at this suite did.

       The invariant is an identity that must hold for the frame just drawn:

           plot width + gutter == canvas width

       With the bug, the plot width comes from the previous frame's gutter and
       `_gut` is overwritten with the new one, so the sum is wrong by exactly the
       change in gutter - with no tolerance needed. The engine stores `_PW`
       alongside the `_PH` it already kept, which is what makes the identity
       checkable rather than merely observable in pixels. */
    const identity = await page.evaluate(async () => {
      const g = window.__g;

      /* A wide-label range first, then a narrower one, then back again - so the
         gutter genuinely changes and the stale frame has something to be stale
         against. Measured with this engine: 0..40 -> 38px, -0.5..0.5 -> 43px.

         clear() between feeds is essential and was missing at first: the scale is
         computed over ALL retained samples, so appending 0..40 and then -0.5..0.5
         without clearing leaves a union range of roughly -0.5..40 whose labels are
         all four characters - the gutter never moved, and the test was asserting
         nothing while reporting a pass. */
      const settle = () => new Promise(r => setTimeout(r, 200));
      const feed = (lo, hi) => {
        g.clear();
        for (let i = 0; i <= 60; i++) g.push({ x: i / 60, y: lo + (hi - lo) * i / 60 });
      };

      feed(0, 40); await settle();
      const first = { PW: g._PW, gut: g._gut, W: g.cssW };

      feed(-0.5, 0.5); await settle();
      const second = { PW: g._PW, gut: g._gut, W: g.cssW };

      feed(0, 40); await settle();
      const third = { PW: g._PW, gut: g._gut, W: g.cssW };

      /* A resize changes the width and the 30% cap together - the case the review
         called out by name. */
      document.getElementById('host').style.width = '220px';
      await settle();
      const afterResize = { PW: g._PW, gut: g._gut, W: g.cssW };

      return { first, second, third, afterResize };
    });

    ok('gutter: the gutter really does change between these ranges',
      identity.second.gut !== identity.first.gut,
      `${identity.first.gut}px -> ${identity.second.gut}px`);

    for (const [label, f] of [
      ['settled frame 1', identity.first],
      ['frame after the gutter changed', identity.second],
      ['frame after changing back', identity.third],
      ['frame after a resize', identity.afterResize]
    ]) {
      ok(`gutter: plot width + gutter == canvas width (${label})`,
        Math.abs((f.PW + f.gut) - f.W) < 1e-6,
        `PW=${f.PW} gut=${f.gut} sum=${f.PW + f.gut} W=${f.W}`);
    }

    /* Pixel-level confirmation, and the check that works on BOTH the old and the
       new engine.

       The `_PW` identity above is precise but can only exist once `_PW` does, so on
       its own it cannot prove it would have caught the original defect - a missing
       field is not the same as a violated invariant. This measures the DRAWN plot
       width from the canvas instead, by finding the rightmost magenta pixel of the
       curve.

       The invariant: when the gutter grows by d, the plot must narrow by exactly d,
       because plotWidth = canvasWidth - gutter. So the curve's right edge must move
       LEFT by d. Measured on this engine:

         old  engine: gutter 38 -> 43, curve stays at 581px   (stale: no response)
         new  engine: gutter 38 -> 43, curve moves to 577px    (5px left, correct)

       That difference - the drawing responding to the measurement - is the bug,
       and it is visible without any help from the code under test. */
    const pixels = await page.evaluate(async () => {
      const g = window.__g;
      document.getElementById('host').style.width = '640px';
      await new Promise(r => setTimeout(r, 200));

      const settle = () => new Promise(r => setTimeout(r, 200));
      const rightmostCurve = () => {
        const cv = g.canvas, ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        const d = ctx.getImageData(0, 0, W, H).data;
        const scale = W / g.cssW;
        for (let x = W - 1; x >= 0; x--) {
          for (let y = 0; y < H; y++) {
            const i = (y * W + x) * 4;
            if (d[i] > 180 && d[i + 1] < 120 && d[i + 2] > 180) return x / scale;
          }
        }
        return -1;
      };
      const feed = (lo, hi) => {
        g.clear();
        for (let i = 0; i <= 60; i++) g.push({ x: i / 60, y: lo + (hi - lo) * i / 60 });
      };

      feed(0, 40); await settle();
      const a = { gut: g._gut, right: rightmostCurve() };

      feed(-0.5, 0.5); await settle();
      const b = { gut: g._gut, right: rightmostCurve() };

      return { a, b, dGut: b.gut - a.gut, dRight: b.right - a.right };
    });

    ok('gutter: the gutter really did grow between the two frames',
      pixels.dGut > 0, `gutter ${pixels.a.gut} -> ${pixels.b.gut} (${pixels.dGut > 0 ? '+' : ''}${pixels.dGut}px)`);
    ok('gutter: curve was found on the canvas for both frames',
      pixels.a.right > 0 && pixels.b.right > 0,
      `${pixels.a.right.toFixed(1)} / ${pixels.b.right.toFixed(1)}`);
    /* 1px tolerance for canvas antialiasing and fractional device pixels. */
    ok('gutter: plot narrows by exactly the gutter growth (no stale layout)',
      Math.abs(pixels.dRight + pixels.dGut) <= 1,
      `gutter +${pixels.dGut}px, curve moved ${pixels.dRight.toFixed(1)}px ` +
      `(expected ${(-pixels.dGut).toFixed(1)}px)`);

    ok('gutter: no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    await page.close();
  }

  /* ------------------------------------------------------------------ *
   * 2. Idle scheduling
   * ------------------------------------------------------------------ */
  {
    const page = await barePage(browser, 600);
    await page.addScriptTag({ type: 'module', content: `
      window.__raf = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) { window.__raf++; return raf(cb); };
      const m = await import('/js/graph-engine.js');
      const g = m.createGraph(document.getElementById('host'), {
        xLabel: 'Time', xUnit: 's', yLabel: 'y', yUnit: 'm', title: 'scheduling test', height: 180
      }, [{ id: 'y', label: 'y', unit: 'm', color: '#22d3ee' }]);
      for (let i = 0; i <= 40; i++) g.push({ x: i / 40, y: Math.sin(i / 6) });
      window.__g = g;
    `});
    await page.waitForFunction(() => !!window.__g);
    await page.waitForTimeout(300);

    /* Settle, then measure the idle floor. */
    await page.evaluate(() => { window.__raf = 0; });
    await page.waitForTimeout(1000);
    const idle = await page.evaluate(() => window.__raf);
    ok('scheduling: an idle graph requests almost NO frames',
      idle <= 6, `${idle} frames in 1.0s idle (a live rAF loop would be ~60)`);

    /* drawCount must not creep either - that is the other half of "idle". */
    const d1 = await page.evaluate(() => window.__g.drawCount);
    await page.waitForTimeout(1000);
    const d2 = await page.evaluate(() => window.__g.drawCount);
    ok('scheduling: idle graph does not redraw', d2 === d1, `drawCount ${d1} -> ${d2}`);

    /* LIVE UPDATES must still work. This is the behaviour most at risk from
       making scheduling on-demand: if push() forgot to kick, the curve would freeze
       while the simulation ran - and every "idle" test above would still pass. */
    const before = await page.evaluate(() => ({ r: window.__raf, d: window.__g.drawCount }));
    await page.evaluate(() => {
      for (let i = 41; i <= 70; i++) window.__g.push({ x: i / 40, y: Math.sin(i / 6) });
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({
      r: window.__raf, d: window.__g.drawCount,
      n: window.__g.series[0].len
    }));
    ok('scheduling: pushes still redraw (on-demand, not broken)',
      after.d > before.d, `drawCount ${before.d} -> ${after.d}, frames ${after.r - before.r}`);
    ok('scheduling: pushed data actually landed in the series',
      after.n > 41, `samples=${after.n}`);

    /* 30 pushes in one tick must coalesce into ONE frame, not 30 - the engine is
       allowed to batch, and doing so is what makes on-demand scheduling cheap. */
    const batch = await page.evaluate(async () => {
      const g = window.__g;
      const d0 = g.drawCount, r0 = window.__raf;
      for (let i = 100; i < 130; i++) g.push({ x: i / 40, y: 0 });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { dd: g.drawCount - d0, dr: window.__raf - r0 };
    });
    ok('scheduling: a burst of 30 pushes coalesces into a small number of frames',
      batch.dd <= 2, `${batch.dr} frames requested, ${batch.dd} draws`);

    /* RESIZE must redraw. */
    const rz = await page.evaluate(async () => {
      const g = window.__g;
      const d0 = g.drawCount;
      document.getElementById('host').style.width = '340px';
      await new Promise(r => setTimeout(r, 250));
      return { dd: g.drawCount - d0, w: g.cssW };
    });
    ok('scheduling: resize still triggers a redraw', rz.dd >= 1, `${rz.dd} draws, width=${rz.w}`);
    ok('scheduling: resize actually changed the measured width', rz.w > 0 && rz.w < 640,
      `cssW=${rz.w}`);

    /* TAB RETURN must redraw, because dpr and viewport can change while hidden. */
    const vis = await page.evaluate(async () => {
      const g = window.__g;
      const d0 = g.drawCount;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(r => setTimeout(r, 120));
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(r => setTimeout(r, 200));
      return { dd: g.drawCount - d0 };
    });
    ok('scheduling: returning to the tab triggers a redraw', vis.dd >= 1, `${vis.dd} draws`);

    /* destroy() must leave NOTHING scheduled - this is the cleanup the
       on-demand change makes newly load-bearing. */
    const dead = await page.evaluate(async () => {
      const g = window.__g;
      g.destroy();
      await new Promise(r => setTimeout(r, 120));
      const before = window.__raf;
      await new Promise(r => setTimeout(r, 400));
      return { drift: window.__raf - before, el: !!document.querySelector('.pgraph') };
    });
    ok('cleanup: destroy stops the engine requesting frames', dead.drift === 0,
      `${dead.drift} frames after destroy`);
    ok('cleanup: destroy removes the graph element', dead.el === false);

    /* A destroyed graph must not resurrect itself from a queued visibility event. */
    const ghost = await page.evaluate(async () => {
      const before = window.__raf;
      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(r => setTimeout(r, 300));
      return window.__raf - before;
    });
    ok('cleanup: a destroyed graph does not re-schedule on visibilitychange',
      ghost === 0, `${ghost} frames`);

    await page.close();
  }

} else {
  results.push({ n: 'module-level units require an unbundled engine module', pass: true, extra: 'skipped, not applicable to this deployment shape' });
}

/* ------------------------------------------------------------------ *
 * 3. End-to-end: the real simulation graph still behaves
 * ------------------------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.pgraph-plot');
  await page.waitForTimeout(800);

  const live = await page.evaluate(async () => {
    const g = window.PhysixGraph.graphs.all[0];
    const s = g.series[0];
    const n0 = s.len, d0 = g.drawCount;
    await new Promise(r => setTimeout(r, 700));
    return { n0, n1: s.len, d0, d1: g.drawCount, gut: g._gut };
  });
  ok('e2e: the live simulation graph keeps receiving samples',
    live.n1 > live.n0, `samples ${live.n0} -> ${live.n1}`);
  ok('e2e: the live graph keeps redrawing while the simulation runs',
    live.d1 > live.d0, `draws ${live.d0} -> ${live.d1}`);
  ok('e2e: live graph has a sane gutter for its current scale',
    live.gut > 0 && live.gut < 1280 * 0.3, `gut=${live.gut}px`);

  /* Pause the simulation, then the graph must go quiet too. */
  await page.click('.sim-time-play');
  await page.waitForTimeout(400);
  const paused0 = await page.evaluate(() => {
    const g = window.PhysixGraph.graphs.all[0];
    return { raf: 0, d: g.drawCount, n: g.series[0].len };
  });
  await page.waitForTimeout(1000);
  const paused1 = await page.evaluate(() => {
    const g = window.PhysixGraph.graphs.all[0];
    return { d: g.drawCount, n: g.series[0].len };
  });
  ok('e2e: a paused simulation stops the graph sampling',
    paused1.n === paused0.n, `samples ${paused0.n} -> ${paused1.n}`);
  ok('e2e: a paused simulation stops the graph redrawing',
    paused1.d === paused0.d, `draws ${paused0.d} -> ${paused1.d}`);

  /* Step must produce exactly one sample AND one redraw. */
  const step = await page.evaluate(async () => {
    const g = window.PhysixGraph.graphs.all[0];
    const n0 = g.series[0].len, d0 = g.drawCount;
    document.querySelector('.sim-time-step').click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { dn: g.series[0].len - n0, dd: g.drawCount - d0 };
  });
  ok('e2e: one Step = exactly one graph sample', step.dn === 1, `+${step.dn}`);
  ok('e2e: one Step = exactly one redraw', step.dd === 1, `+${step.dd}`);

  /* Resize while paused must still relayout and repaint. */
  await page.setViewportSize({ width: 760, height: 900 });
  await page.waitForTimeout(400);
  const resized = await page.evaluate(async () => {
    const g = window.PhysixGraph.graphs.all[0];
    return { gut: g._gut, W: g.cssW, draw: g.drawCount };
  });
  ok('e2e: resizing while paused relayouts the graph',
    resized.W > 0 && resized.W < 1280, `cssW=${resized.W} gut=${resized.gut}`);
  ok('e2e: gutter after a real resize is non-zero and capped',
    resized.gut > 0 && resized.gut <= Math.floor(resized.W * 0.3),
    `gut=${resized.gut} cap=${Math.floor(resized.W * 0.3)}`);

  await page.close();
}

await browser.close();

const pass = results.filter(r => r.pass).length;
for (const r of results) {
  if (!r.pass) console.log(`  FAIL  ${r.n}${r.extra ? '  [' + r.extra + ']' : ''}`);
}
console.log(`\ngraph scheduling + gutter  ${pass}/${results.length} ok`);
process.exit(pass === results.length ? 0 : 1);
