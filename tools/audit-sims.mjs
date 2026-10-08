/* Phase 3 audit, step 1-2: extract the real simulation inventory.
 *
 * Loads the actual curriculum + quiz + sim data by evaluating the modules with
 * their DOM imports stripped, so the numbers come from the running code rather
 * than from filenames or from a comment somewhere.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', '.audit-tmp.mjs');

/* Same order as js/main.js. */
const FILES = [
  'data-core.js', 'data-ncert9.js', 'data-ncert10.js', 'data-ncert11.js',
  'data-ncert12.js', 'data-jee.js', 'data-slarora11.js', 'data-l3a.js',
  'data-l3b.js', 'data-l3c.js', 'data-l3d.js', 'data-l3e.js', 'data-l4.js',
  'data-quiz-a.js', 'data-quiz-b.js', 'data-quiz-c.js',
  'sims-a.js', 'sims-b.js', 'sims-c.js', 'sims-d.js', 'sims-e.js',
  'sims-ncert.js', 'sims-realism.js', 'sims-more.js', 'sims-phet.js',
  'sims3d-a.js', 'sims3d-b.js', 'sims3d-pages.js'
];

let bundle = `
globalThis.__CUR = [];
globalThis.__QB  = [];
globalThis.__SIM = { reg: {}, register(id,t,d,i,r){ this.reg[id]={id,title:t,desc:d,icon:i,run:r}; }, mount(){} };
const CURRICULUM = globalThis.__CUR;
const QUIZ_BANK  = globalThis.__QB;
const Sims       = globalThis.__SIM;
const SU = { el:(t,c,h)=>({tagName:t,className:c,innerHTML:h||'',appendChild(){},querySelector:()=>null,querySelectorAll:()=>[],style:{},addEventListener(){},children:[]}) };
const pxArrow = () => {}; const pxLabel = () => {};
function esc(s){return s;}
const window = { addEventListener(){}, devicePixelRatio:1, matchMedia:()=>({matches:false}) };
const document = { createElement:()=>({style:{},getContext:()=>({}),addEventListener(){}}), querySelector:()=>null, addEventListener(){}, documentElement:{style:{setProperty(){}},dataset:{}} };
const performance = { now:()=>0 };
const requestAnimationFrame = () => 0;
`;
for (const f of FILES) {
  let src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  src = src.replace(/^import .*from .*;$/gm, '');
  src = src.replace(/^export const CURRICULUM = \[\];/gm, '');
  src = src.replace(/^export const QUIZ_BANK = \[\];/gm, '');
  /* sims-a.js defines Sims; the others only import it. Removing the real
     definition would leave a redeclaration, so delete the whole block. */
  src = src.replace(/^export const Sims = \{[\s\S]*?\n\};\s*$/m, '');
  src = src.replace(/^export (const|function|let) /gm, '$1 ');
  src = src.replace(/\bCURRICULUM\.push/g, 'globalThis.__CUR.push');
  src = src.replace(/\bQUIZ_BANK\.push/g, 'globalThis.__QB.push');
  bundle += src + '\n';
}
/* The files declare CURRICULUM / QUIZ_BANK as consts at the top of their own
   module; expose them on globalThis rather than re-declaring here. */
bundle += `
globalThis.__EXPORTS = { CURRICULUM, QUIZ_BANK, Sims };
`;
fs.writeFileSync(OUT, bundle);

let mod;
try { mod = await import('./.audit-tmp.mjs'); }
finally { fs.unlinkSync(OUT); }

const { CURRICULUM, QUIZ_BANK, Sims } = globalThis.__EXPORTS;
const reg = Sims.reg;
const ids = Object.keys(reg);

console.log(`  registered simulations : ${ids.length}`);
console.log(`  quiz questions         : ${QUIZ_BANK.length}`);
console.log(`  curriculum chapters    : ${CURRICULUM.reduce((n, l) => n + (l.chapters || []).length, 0)}`);
console.log('');

/* --- capability detection, by reading each sim's SOURCE (the only place the
   truth lives; a control that exists but is never wired shows up here) --- */
const sources = new Map();
for (const f of fs.readdirSync(path.join(ROOT, 'js'))) {
  if (!/^sims/.test(f) || !f.endsWith('.js')) continue;
  sources.set(f, fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'));
}
const allSimSrc = [...sources.values()].join('\n');

/* slice the source belonging to one registration */
function simSource(id) {
  for (const src of sources.values()) {
    const key = `Sims.register('${id}'`;
    const i = src.indexOf(key);
    if (i < 0) continue;
    /* end at the next registration or end of file */
    const j = src.indexOf("Sims.register('", i + key.length);
    return src.slice(i, j < 0 ? src.length : j);
  }
  return '';
}

const CAPS = [
  ['sliders',    /SU\.slider\(/],
  ['buttons',    /SU\.btn\(/],
  ['readout',    /SU\.readout\(/],
  ['canvas',     /SU\.canvas\(/],
  ['webgl',      /new THREE\.|WebGLRenderer|three\./],
  ['drag',       /pointerdown|mousedown|touchstart/],
  ['playpause',  /paused|\btogglePause\b|\bplay\(\)|\bpause\(\)/],
  ['reset',      /\breset\b/i],
  ['step',       /\bstep\w*\s*[=(]/i],
  ['loop',       /SU\.loop\(/],
  ['vectors',    /pxArrow|arrowH|vecH|drawArrow/i],
  ['graph',      /plotGraph|drawGraph|Graph\(|#graph|graphCtx/i],
  ['challenge',  /challenge|target|hit the|goal/i],
  ['units',      /\bN\b|\bm\/s\b|\bkg\b|\bJ\b|\bW\b/],
  ['svg',        /createElementNS|<svg/],
  ['equation',   /katex|Tex\.|renderMath|\$\$|tex:/]
];

const rows = [];
for (const id of ids) {
  const src = simSource(id);
  const row = { id, title: reg[id].title, len: src.length, caps: {} };
  for (const [name, re] of CAPS) row.caps[name] = re.test(src);
  rows.push(row);
}

/* write the matrix */
fs.writeFileSync(path.join(ROOT, 'tools', '.sim-matrix.json'), JSON.stringify(rows, null, 1));

console.log('  capability counts across all sims:');
for (const [name] of CAPS) {
  const n = rows.filter(r => r.caps[name]).length;
  const bar = '#'.repeat(Math.round(n / rows.length * 30));
  console.log(`    ${name.padEnd(10)} ${String(n).padStart(3)}/${rows.length}  ${bar}`);
}

const none = rows.filter(r => !Object.values(r.caps).some(Boolean));
console.log(`\n  sims with NO detectable capability: ${none.length}${none.length ? ' -> ' + none.map(r => r.id).join(', ') : ''}`);

console.log('\n  biggest sims by source length:');
rows.sort((a, b) => b.len - a.len).slice(0, 6).forEach(r => console.log(`    ${r.id.padEnd(20)} ${(r.len / 1024).toFixed(1)} KB`));