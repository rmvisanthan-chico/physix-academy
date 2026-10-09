/* Visual check: a real prediction, paused and stepped to the target, desktop and
   390px. Screenshots alone cannot confirm the reveal fires, so the verdict text is
   printed too and compared against the value read off the graph. */
import { createRequire } from 'node:module';
import path from 'node:path';
const req = createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'));
const { chromium } = req('playwright');

const BASE = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'chrome' });

for (const [tag, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 1000 }]]) {
  const p = await browser.newPage({ viewport: vp });
  await p.goto(`${BASE}/#/sims/projectile`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.sim-time');
  await p.waitForTimeout(300);

  /* Read the target the question is asking about, then answer with something
     deliberately wrong so the "not close" branch and its explanation show. */
  const q = await p.textContent('.predict-q');
  const target = +(q.match(/t\s*=\s*([\d.]+)/) || [])[1];
  console.log(`  ${tag}: question "${q.trim().slice(0, 62)}"`);
  console.log(`  ${tag}: target t = ${target}s`);

  await p.fill('.predict-input', '3');
  await p.click('.predict-actions .btn-primary');

  /* Pause immediately, then step to the target. This is the real Phase 3C
     promise: a student can advance time one deliberate step at a time and still
     get a correct observation. */
  await p.click('.sim-time-play');
  await p.waitForTimeout(120);
  while (true) {
    const s = await p.evaluate(() => window.__tcProbe());
    if (s.t >= target + 0.2 || s.done) break;
    await p.click('.sim-time-step');
  }
  await p.waitForTimeout(400);

  const out = await p.evaluate(() => {
    const el = document.querySelector('.predict-out');
    return {
      text: el ? el.innerText.replace(/\s+/g, ' ').trim() : '(no .predict-out)',
      t: window.__tcProbe().t,
      samples: window.__tcProbe().samples,
      state: document.querySelector('.sim-time-state').textContent.trim()
    };
  });
  console.log(`  ${tag}: ${out.state} at t=${out.t.toFixed(3)}s, ${out.samples} samples`);
  console.log(`  ${tag}: ${out.text.slice(0, 150)}`);

  await p.evaluate(() => {
    const r = document.querySelector('.predict').getBoundingClientRect();
    window.scrollTo(0, r.y + window.scrollY - 120);
  });
  await p.waitForTimeout(200);
  await p.screenshot({ path: `tools/.shots/tc-${tag}-prediction.png` });
  await p.close();
}
await browser.close();