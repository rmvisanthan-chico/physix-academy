/* Guards the chapter <-> quiz-topic bridge in mastery.js.
 *
 * The two halves of the site were authored independently, so nothing but this
 * check stops the mapping from rotting: rename a chapter, delete a quiz file, or
 * retag a question, and roadmap status would silently start reporting on
 * topics that no longer exist. Fails loudly instead.
 *
 * IMPORTANT: this reads every data-*.js that pushes into CURRICULUM, not just
 * data-core.js. The first version of this script did read only data-core, so it
 * saw 2 levels and 15 chapters and reported every one of the 10 real levels as
 * nonexistent. An audit that inspects the wrong data is worse than no audit,
 * because it looks authoritative.
 *
 * Run: node tools/audit-bridge.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* same import list, same order, as js/main.js */
const CURRICULUM_FILES = [
  'data-core.js', 'data-ncert9.js', 'data-ncert10.js', 'data-ncert11.js',
  'data-ncert12.js', 'data-jee.js', 'data-slarora11.js', 'data-l3a.js',
  'data-l3b.js', 'data-l3c.js', 'data-l3d.js', 'data-l3e.js', 'data-l4.js'
];

/* Evaluate the curriculum for real: strip the DOM imports, point the shared
   CURRICULUM identifier at one array, load it. */
let bundle = 'globalThis.__CUR = [];\n';
for (const f of CURRICULUM_FILES) {
  let src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  src = src.replace(/^import .*from .*;$/gm, '');
  src = src.replace(/^export const CURRICULUM = \[\];/gm, '');
  src = src.replace(/\bCURRICULUM\b/g, 'globalThis.__CUR');
  bundle += src + '\n';
}
bundle += '\nexport default globalThis.__CUR;';
const tmp = path.join(ROOT, 'tools', '.bridge-cur.mjs');
fs.writeFileSync(tmp, bundle);
const CURRICULUM = (await import('./.bridge-cur.mjs')).default;
fs.unlinkSync(tmp);

const core = 'loaded from ' + CURRICULUM_FILES.length + ' files';

const chapterIds = [];
const levelIds = [];
for (const lv of CURRICULUM) {
  levelIds.push(lv.id);
  for (const ch of lv.chapters || []) chapterIds.push(ch.id);
}
const chapterSet = new Set(chapterIds);
const levelSet = new Set(levelIds);
const lvlKeys = new Set();   /* filled once LEVEL_TOPICS is parsed below */

/* every quiz topic across the three bank files */
const quizTopics = new Set();
for (const f of ['js/data-quiz-a.js', 'js/data-quiz-b.js', 'js/data-quiz-c.js']) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of s.matchAll(/topic:'([^']+)'/g)) quizTopics.add(m[1]);
}

/* pull CHAPTER_TOPICS out of mastery.js without importing the module (which
   would need a DOM) */
const mastery = fs.readFileSync(path.join(ROOT, 'js/mastery.js'), 'utf8');
const block = mastery.match(/const CHAPTER_TOPICS = \{([\s\S]*?)\n\};/);
if (!block) {
  console.error('  FAIL: CHAPTER_TOPICS not found in js/mastery.js');
  process.exit(1);
}
const map = {};
for (const m of block[1].matchAll(/'([^']+)'\s*:\s*\[([^\]]*)\]/g)) {
  map[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]);
}

let bad = 0;
const fail = (msg) => { console.log(`  FAIL  ${msg}`); bad++; };

console.log(`  curriculum            : ${core}`);
console.log(`  levels                : ${levelIds.length}`);
console.log(`  chapters              : ${chapterIds.length}`);
console.log(`  quiz topics           : ${quizTopics.size}`);
console.log(`  chapters mapped       : ${Object.keys(map).length}\n`);

/* 1. no mapping points at a chapter that does not exist */
for (const id of Object.keys(map)) {
  if (!chapterSet.has(id)) fail(`CHAPTER_TOPICS has "${id}", which is not a chapter`);
}

/* 2. parse LEVEL_TOPICS and check it in the same pass. Parsing has to happen
   before the "every level is mapped" check below, or that check reads an empty
   set and reports all ten levels as missing. */
const lvlBlock = mastery.match(/const LEVEL_TOPICS = \{([\s\S]*?)\n\};/);
if (!lvlBlock) {
  fail('LEVEL_TOPICS not found in js/mastery.js');
} else {
  const lmap = {};
  for (const m of lvlBlock[1].matchAll(/(\w+)\s*:\s*\[([^\]]*)\]/g)) {
    lmap[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]);
  }
  for (const [lid, topics] of Object.entries(lmap)) {
    if (!levelSet.has(lid)) fail(`LEVEL_TOPICS has "${lid}", which is not a level in the curriculum`);
    for (const t of topics) {
      if (!quizTopics.has(t)) fail(`level "${lid}" maps to quiz topic "${t}", which does not exist`);
    }
    lvlKeys.add(lid);
  }
  console.log(`  levels mapped          : ${Object.keys(lmap).length}`);
}

/* 3. every level is mapped, so a new level cannot be forgotten. Chapters may
   fall back to their level, so a missing chapter entry is fine by design - a
   missing LEVEL is not. */
for (const lid of levelIds) {
  if (!lvlKeys.has(lid)) fail(`level "${lid}" has no entry in LEVEL_TOPICS`);
}

for (const [id, topics] of Object.entries(map)) {
  for (const t of topics) {
    if (!quizTopics.has(t)) fail(`chapter "${id}" maps to quiz topic "${t}", which does not exist`);
  }
}

/* 4. informational: topics with no chapter. Not a failure - they are extra
   practice that belongs to no stage of the path - but worth seeing. */
const mappedTopics = new Set(Object.values(map).flat());
const orphans = [...quizTopics].filter(t => !mappedTopics.has(t)).sort();

console.log(`  quiz topics not in any chapter (extra practice): ${orphans.length}`);
if (orphans.length) console.log(`    ${orphans.join(', ')}`);

console.log('');
if (bad) {
  console.log(`  bridge audit FAILED: ${bad} problem(s)`);
  process.exit(1);
}
console.log('  bridge audit clean');