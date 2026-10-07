/* Audits source files for genuine encoding damage.
 *
 * The point of doing this in Node rather than reading files through a shell is
 * that the shell lies: UTF-8 emoji bytes (F0 9F ...) get shown as "ðŸª" by
 * Windows-1252 consoles, which looks identical to real mojibake but is not.
 * This script works on raw bytes so the answer is unambiguous:
 *
 *   invalid UTF-8  -> the file contains byte sequences that are not valid
 *                     UTF-8 at all. Real damage, always.
 *   U+FFFD         -> bytes were already lossy-decoded somewhere and a
 *                     replacement char got saved into the file.
 *   mojibake sigs  -> file IS valid UTF-8, but contains classic double-encoded
 *                     sequences ("â€™", "Ã©", "ðŸ"). Damage, but recoverable.
 *   clean          -> valid UTF-8, no markers. Nothing to do.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'dist', 'graphify-out', 'release', 'astra', 'electron', '.git', '.shots', 'downloads']);
const EXTS = new Set(['.js', '.html', '.css', '.json', '.md', '.mjs', '.cjs', '.txt', '.svg']);

/* Markers of text that was decoded as cp1252/latin1 and then saved as UTF-8.
   These are valid UTF-8, so a strict decoder will not flag them. */
const MOJIBAKE = [
  'â€™', 'â€œ', 'â€\u009d', 'â€¦', 'â€“', 'â€”', 'â€˜', 'â€¦',
  'Ã©', 'Ã¨', 'Ã¼', 'Ã¶', 'Ã¤', 'Ã±', 'Ã¢', 'Ã¯', 'Ã³',
  'Â°', 'Â·', 'Â«', 'Â»', 'Â±', 'Â½', 'Âµ', 'Â§', 'Â£', 'Â©', 'Â®', 'â„¢',
  'ðŸ', 'ï¿½', 'Ã\x83', 'Ã\x82'
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') && e.name !== '.gitignore') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p, out); }
    else if (EXTS.has(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const rows = [];
let invalidTotal = 0, fffdTotal = 0, mojiTotal = 0;

for (const f of files) {
  const buf = fs.readFileSync(f);
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');

  let invalid = 0, text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    // Not valid UTF-8. Decode lossily and count the replacement chars as a proxy.
    text = new TextDecoder('utf-8').decode(buf);
    invalid = (text.match(/\uFFFD/g) || []).length;
  }
  const fffd = (text.match(/\uFFFD/g) || []).length;
  const hits = MOJIBAKE.filter(m => text.includes(m));
  const nMoji = hits.reduce((n, m) => n + text.split(m).length - 1, 0);

  if (invalid || fffd || nMoji) {
    rows.push({ rel, invalid, fffd, nMoji, hits });
    invalidTotal += invalid; fffdTotal += fffd; mojiTotal += nMoji;
  }
}

console.log(`  scanned ${files.length} files\n`);
if (!rows.length) {
  console.log('  CLEAN: no encoding damage anywhere');
} else {
  rows.sort((a, b) => (b.invalid + b.fffd + b.nMoji) - (a.invalid + a.fffd + a.nMoji));
  for (const r of rows) {
    const tags = [
      r.invalid ? `invalid-utf8:${r.invalid}` : '',
      r.fffd ? `U+FFFD:${r.fffd}` : '',
      r.nMoji ? `mojibake:${r.nMoji}` : ''
    ].filter(Boolean).join('  ');
    console.log(`  ${r.rel}\n      ${tags}${r.hits.length ? '  [' + r.hits.join(' ') + ']' : ''}`);
  }
  console.log(`\n  TOTALS  invalid-utf8=${invalidTotal}  U+FFFD=${fffdTotal}  mojibake=${mojiTotal}`);
}
console.log(`\n${JSON.stringify({ invalidTotal, fffdTotal, mojiTotal })}`);