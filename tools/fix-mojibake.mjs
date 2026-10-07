/* Repairs cp1252 mojibake in-place.
 *
 * The damage pattern: text that was originally UTF-8 got decoded as cp1252 and
 * then saved back as UTF-8. Every original byte 0x80-0x9F became a visible
 * "smart character", so "’" (E2 80 99) turned into the three characters
 * "â€™". The file is still valid UTF-8, which is why this is invisible to a
 * strict decoder and only shows up as odd glyphs in the browser.
 *
 * Reversal is: map each mojibake character back to the cp1252 byte it stands
 * for, then decode that byte string as UTF-8. A naive Buffer.from(s,'latin1')
 * does NOT work, because cp1252 and latin1 disagree across 0x80-0x9F — that
 * range is where the smart quotes, dashes and euro live, which is precisely
 * the range this damage lands in. Hence the explicit table.
 *
 * Safety: a file is only rewritten if the repair both changes it AND produces
 * strictly fewer mojibake markers, so this can never make things worse.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* cp1252 code points for bytes 0x80-0x9F. Index 0 is byte 0x80. */
const CP1252_HIGH =
  [0x20AC, 0x0081, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
   0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008D, 0x017D, 0x008F,
   0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
   0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x009D, 0x017E, 0x0178];

const REVERSE = new Map();
for (let b = 0x80; b <= 0x9F; b++) REVERSE.set(CP1252_HIGH[b - 0x80], b);
for (let b = 0x00; b <= 0x7F; b++) REVERSE.set(b, b);
for (let b = 0xA0; b <= 0xFF; b++) REVERSE.set(b, b);

function repair(text) {
  const bytes = [];
  for (const ch of text) {
    const b = REVERSE.get(ch.codePointAt(0));
    /* Not a cp1252 character at all (e.g. a real emoji, or CJK): leave the
       whole repair alone rather than corrupting genuine non-Latin content. */
    if (b === undefined) return null;
    bytes.push(b);
  }
  const out = Buffer.from(bytes).toString('utf8');
  /* Reject anything that introduced replacement characters. */
  return out.includes('\uFFFD') ? null : out;
}

const MARKERS = ['â€™', 'â€œ', 'â€', 'Ã©', 'Ã¨', 'Ã¼', 'Ã¶', 'Ã¤',
  'Ã±', 'Ã¢', 'Ã¯', 'Ã³', 'Â°', 'Â·', 'Â«', 'Â»', 'Â±', 'Â½',
  'Âµ', 'Â§', 'Â£', 'Â©', 'Â®', 'ðŸ'];

const count = s => MARKERS.reduce((n, m) => n + (s.split(m).length - 1), 0);

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('usage: node tools/fix-mojibake.mjs <file> [file...]');
  process.exit(2);
}

for (const rel of targets) {
  const p = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  const before = fs.readFileSync(p, 'utf8');
  const n0 = count(before);
  if (n0 === 0) { console.log(`  ${rel}: already clean`); continue; }

  const after = repair(before);
  if (after === null) {
    console.log(`  ${rel}: SKIPPED - contains genuine non-cp1252 characters, not simple mojibake`);
    continue;
  }
  const n1 = count(after);
  if (n1 >= n0) {
    console.log(`  ${rel}: SKIPPED - repair did not reduce markers (${n0} -> ${n1})`);
    continue;
  }
  fs.writeFileSync(p, after, 'utf8');
  console.log(`  ${rel}: repaired ${n0} -> ${n1} markers`);
}