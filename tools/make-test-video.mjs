/* Generates a throwaway webm so the video-backdrop code path can be tested for
   real rather than only its no-file fallback. Written to assets/login-bg.webm
   and meant to be deleted afterwards - it is a grey gradient, not site content. */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); }
  catch { return createRequire(path.join(process.env.APPDATA + '\\npm\\node_modules', 'noop.js'))('playwright'); }
}
const { chromium } = loadPlaywright();

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();

await page.setContent('<canvas id="c" width="960" height="540"></canvas>');

const b64 = await page.evaluate(async () => {
  const c = document.getElementById('c');
  const x = c.getContext('2d');
  const stream = c.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 400000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.start();

  let t = 0;
  await new Promise(res => {
    const draw = () => {
      t += 1 / 30;
      const g = x.createLinearGradient(0, 0, 960, 540);
      g.addColorStop(0, `hsl(${(t * 40) % 360} 60% 22%)`);
      g.addColorStop(1, `hsl(${(t * 40 + 90) % 360} 60% 12%)`);
      x.fillStyle = g;
      x.fillRect(0, 0, 960, 540);
      x.fillStyle = '#c9d4ff';
      for (let i = 0; i < 26; i++) {
        x.beginPath();
        x.arc(120 + i * 30, 270 + Math.sin(t * 2 + i * 0.4) * 90, 7, 0, Math.PI * 2);
        x.fill();
      }
      if (t < 2.5) requestAnimationFrame(draw); else res();
    };
    draw();
  });

  rec.stop();
  const blob = await new Promise(res => { rec.onstop = async () => res(new Blob(chunks, { type: 'video/webm' })); });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s);
});

await browser.close();

const out = path.join(ROOT, 'assets', 'login-bg.webm');
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log(`  wrote ${out}  (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
