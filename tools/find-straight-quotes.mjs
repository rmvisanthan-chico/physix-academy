import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'dist', 'graphify-out', 'release', 'astra', 'electron', '.git']);
const EXTS = new Set(['.js', '.html']);

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); }
    else if (EXTS.has(path.extname(e.name).toLowerCase())) files.push(p);
  }
})(ROOT);

/* Straight quotes sitting immediately after an entity are the tell-tale of a
   hand-edit that lost its curly quotes: the author wrote "&mdash;" + a raw
   ASCII quote instead of &ldquo;. Renders as a lone " in the middle of prose. */
const PAT = /&(?:mdash|ndash|hellip|ldquo|rdquo|lsquo|rsquo);["']/g;

let total = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const hits = [...s.matchAll(PAT)];
  if (!hits.length) continue;
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const lines = s.split('\n');
  lines.forEach((l, i) => {
    if (PAT.test(l)) { PAT.lastIndex = 0; }
    if ([...l.matchAll(PAT)].length) {
      console.log(`  ${rel}:${i + 1}`);
      console.log(`      ${l.trim().slice(0, 120)}`);
    }
  });
  total += hits.length;
}
console.log(`\n  TOTAL raw quotes after entities: ${total}`);