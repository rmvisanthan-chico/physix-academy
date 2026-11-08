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
const SKIP = new Set([
  'node_modules',
  'dist',
  'graphify-out',
  'release',
  'astra',
  'electron',
  '.git',
  '.shots',
  'downloads'
]);
const EXTS = new Set(['.js', '.html', '.css', '.json', '.md', '.mjs', '.cjs', '.txt', '.svg']);

/* Control characters that should never appear in source text. A stray \x15 is
   the residue of a lossy emoji conversion: the glyph was replaced by two
   ordinary characters and a control byte before the file was saved. Valid
   UTF-8, so neither the decoder nor the mojibake list above can see it. */
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/* Residual fragments of emoji that were destroyed before version control.
   "dYs?" is what the PhET atom glyph became in js/pages.js; keeping the exact
   fragment here means the next occurrence fails CI instead of shipping.
   (Bare `dY"` is NOT listed: `id="dY"` is a legitimate element id.) */
const LOST_GLYPHS = ['dYs?'];

/* Markers of text that was decoded as cp1252/latin1 and then saved as UTF-8.
   These are valid UTF-8, so a strict decoder will not flag them. */
const MOJIBAKE = [
  'â€™',
  'â€œ',
  'â€\u009d',
  'â€¦',
  'â€“',
  'â€”',
  'â€˜',
  'â€¦',
  'Ã©',
  'Ã¨',
  'Ã¼',
  'Ã¶',
  'Ã¤',
  'Ã±',
  'Ã¢',
  'Ã¯',
  'Ã³',
  'Â°',
  'Â·',
  'Â«',
  'Â»',
  'Â±',
  'Â½',
  'Âµ',
  'Â§',
  'Â£',
  'Â©',
  'Â®',
  'â„¢',
  'ðŸ',
  'ï¿½',
  'Ã\x83',
  'Ã\x82'
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') && e.name !== '.gitignore') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) walk(p, out);
    } else if (EXTS.has(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

/* The detector's own marker list necessarily contains the markers it looks for,
   so it always flags itself. Skipping these files is not a loophole - they are
   the tools that repair the damage, and their "corruption" is the specification
   of what to look for. */
const SELF = new Set(['tools/audit-encoding.mjs', 'tools/fix-mojibake.mjs']);

const files = walk(ROOT);
const rows = [];
let invalidTotal = 0,
  fffdTotal = 0,
  mojiTotal = 0,
  ctrlTotal = 0,
  lostTotal = 0;

for (const f of files) {
  const buf = fs.readFileSync(f);
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');

  let invalid = 0,
    text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    // Not valid UTF-8. Decode lossily and count the replacement chars as a proxy.
    text = new TextDecoder('utf-8').decode(buf);
    invalid = (text.match(/\uFFFD/g) || []).length;
  }
  const fffd = (text.match(/\uFFFD/g) || []).length;
  const hits = MOJIBAKE.filter((m) => text.includes(m));
  const nMoji = hits.reduce((n, m) => n + text.split(m).length - 1, 0);
  const nCtrl = (text.match(CTRL) || []).length;
  const lost = LOST_GLYPHS.filter((g) => text.includes(g));
  const nLost = lost.reduce((n, g) => n + text.split(g).length - 1, 0);

  if ((invalid || fffd || nMoji || nCtrl || nLost) && !SELF.has(rel)) {
    rows.push({ rel, invalid, fffd, nMoji, nCtrl, nLost, hits: [...hits, ...lost] });
    invalidTotal += invalid;
    fffdTotal += fffd;
    mojiTotal += nMoji;
    ctrlTotal += nCtrl;
    lostTotal += nLost;
  }
}

console.log(`  scanned ${files.length} files\n`);
if (!rows.length) {
  console.log('  CLEAN: no encoding damage anywhere');
} else {
  rows.sort(
    (a, b) =>
      b.invalid +
      b.fffd +
      b.nMoji +
      b.nCtrl +
      b.nLost -
      (a.invalid + a.fffd + a.nMoji + a.nCtrl + a.nLost)
  );
  for (const r of rows) {
    const tags = [
      r.invalid ? `invalid-utf8:${r.invalid}` : '',
      r.fffd ? `U+FFFD:${r.fffd}` : '',
      r.nMoji ? `mojibake:${r.nMoji}` : '',
      r.nCtrl ? `control-chars:${r.nCtrl}` : '',
      r.nLost ? `lost-glyphs:${r.nLost}` : ''
    ]
      .filter(Boolean)
      .join('  ');
    console.log(`  ${r.rel}\n      ${tags}${r.hits.length ? '  [' + r.hits.join(' ') + ']' : ''}`);
  }
  console.log(
    `\n  TOTALS  invalid-utf8=${invalidTotal}  U+FFFD=${fffdTotal}  mojibake=${mojiTotal}  control=${ctrlTotal}  lost-glyphs=${lostTotal}`
  );
}
console.log(`\n${JSON.stringify({ invalidTotal, fffdTotal, mojiTotal, ctrlTotal, lostTotal })}`);
/* Non-zero when anything was found, so CI can gate on it. */
if (rows.length) process.exitCode = 1;
