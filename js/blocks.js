/* PhysiX Academy — Content Block Renderers + Quiz Engine */
'use strict';

function mdInline(s) {
  return esc(String(s == null ? '' : s)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

function formulaCard(f) {
  let h = '<div class="formula-card">';
  if (f.name) h += '<div class="f-name"><b>' + mdInline(f.name) + '</b></div>';
  h += '<div class="f-eq">$$' + (f.tex || '') + '$$</div>';
  if (f.vars && f.vars.length) h += '<div class="f-vars">' + f.vars.map(v => '<b>' + mdInline(v[0]) + '</b> = ' + mdInline(v[1])).join(' &nbsp;·&nbsp; ') + '</div>';
  if (f.note) h += '<div class="f-note">ℹ️ ' + mdInline(f.note) + '</div>';
  return h + '</div>';
}

function calloutBox(cls, label, inner) {
  return '<div class="callout ' + cls + '"><div class="co-label">' + label + '</div>' + inner + '</div>';
}

const Blocks = {
  h: t => '<h3>' + mdInline(t) + '</h3>',
  p: t => '<p>' + mdInline(t) + '</p>',
  ul: a => '<ul>' + a.map(i => '<li>' + mdInline(i) + '</li>').join('') + '</ul>',
  why: b => calloutBox('co-why', 'Why it matters',
    '<p><b>' + mdInline(b.q) + '</b></p><p>' + mdInline(b.p) + '</p>'),
  intuition: a => calloutBox('co-intuition', 'Build intuition',
    a.map(x => '<p><b>' + mdInline(x.h) + '</b> ' + mdInline(x.p) + '</p>').join('')),
  def: a => calloutBox('co-def', 'Key definitions',
    a.map(x => '<p><b>' + mdInline(x.term) + '</b> — ' + mdInline(x.text) + '</p>').join('')),
  mistakes: a => calloutBox('co-mistake', 'Where people slip',
    '<ul>' + a.map(i => '<li>' + mdInline(i) + '</li>').join('') + '</ul>'),
  revise: a => calloutBox('co-revise', 'Quick revision',
    '<ul>' + a.map(i => '<li>' + mdInline(i) + '</li>').join('') + '</ul>'),
  formula: f => formulaCard(f),
  formulas: a => a.map(formulaCard).join(''),
  derive: d => '<div class="derive">' +
    (d.title ? '<strong>' + mdInline(d.title) + '</strong>' : '') +
    d.steps.map(s => '<div class="step">' + mdInline(s.do) +
      '<span class="why">Why: ' + mdInline(s.why || '') + '</span></div>').join('') + '</div>',
  example: e => {
    const cells = [];
    if (e.given && e.given.length) cells.push(['Given', e.given]);
    if (e.concept) cells.push(['Concept', [e.concept]]);
    return '<details class="example-box"><summary>✏️ Worked example: ' + mdInline(e.title || '') +
      '<span class="caret">▾</span></summary><div class="example-body">' +
      '<div class="ex-grid">' + cells.map(c =>
        '<div class="ex-cell"><b>' + c[0] + '</b>' + c[1].map(mdInline).join('<br>') + '</div>').join('') + '</div>' +
      (e.solution && e.solution.length ?
        '<ol class="sol-steps">' + e.solution.map(s => '<li>' + mdInline(s) + '</li>').join('') + '</ol>' : '') +
      (e.answer ? '<p class="mt0"><span class="answer-pill">✓ ' + mdInline(e.answer) + '</span></p>' : '') +
      (e.interp ? '<p class="muted small mb0"><b>Interpretation:</b> ' + mdInline(e.interp) + '</p>' : '') +
      '</div></details>';
  },
  table: t => '<div style="overflow-x:auto"><table class="tbl"><thead><tr>' +
    t.head.map(h => '<th>' + mdInline(h) + '</th>').join('') +
    '</tr></thead><tbody>' + t.rows.map(r => '<tr>' + r.map(c => '<td>' + mdInline(c) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div>',
  svg: s => '<div class="svg-box" style="margin:1rem 0;text-align:center">' + s + '</div>',
  sim: id => '<div class="sim-slot" data-sim="' + esc(id) + '"></div>',
  quiz: ids => '<div class="quiz-slot" data-quiz="' + ids.map(esc).join(',') + '"></div>'
};

function renderBlocks(content) {
  if (!Array.isArray(content)) return '';
  return content.map((b, i) => {
    if (!b) return '';
    const k = Object.keys(b)[0];
    const fn = Blocks[k];
    if (!fn) { console.warn('Unknown block type:', k); return ''; }
    try { return fn(b[k]); } catch (err) { console.error('Block render error', k, err); return ''; }
  }).join('');
}

/* ---------------- Quiz engine ---------------- */
const Quiz = {
  byId: null,
  init() {
    this.byId = new Map(QUIZ_BANK.map(q => [q.id, q]));
  },
  get(id) { return this.byId.get(id); },

  renderOne(parent, q, onAnswered) {
    const box = document.createElement('div');
    box.className = 'quiz-q';
    const diff = DIFFS[q.difficulty] || DIFFS.beginner;
    box.innerHTML =
      '<div class="q-head"><span class="chip plain">' + esc(q.topic) + '</span>' +
      '<span class="diff-dot">' + diff.dot + ' ' + diff.label + '</span></div>' +
      '<div class="q-text">' + mdInline(q.q) + '</div><div class="opts"></div>' +
      '<div class="feedback"></div>';
    const optsBox = box.querySelector('.opts');
    const fb = box.querySelector('.feedback');
    const letters = ['A', 'B', 'C', 'D'];
    let answered = false;

    q.choices.forEach((choiceText, i) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.innerHTML = '<span class="k">' + letters[i] + '</span><span>' + mdInline(choiceText) + '</span>';
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const correct = i === q.answer;
        const btns = Array.from(optsBox.children);
        btns.forEach((bb, j) => {
          bb.disabled = true;
          if (j === q.answer) bb.classList.add('correct');
          else if (j === i) bb.classList.add('wrong');
          else bb.classList.add('dim');
        });
        fb.className = 'feedback show ' + (correct ? 'ok' : 'bad');
        fb.innerHTML = (correct ? '<b>✓ Correct!</b> ' : '<b>✗ Not quite.</b> ') +
          '<div class="q-explain"><b>Why:</b> ' + mdInline(q.why) + '</div>';
        Store.recordAnswer(q, correct);
        if (typeof onAnswered === 'function') onAnswered(correct, fb);
      });
      optsBox.appendChild(b);
    });

    parent.appendChild(box);
    return box;
  },

  renderList(host, ids) {
    ids.forEach(id => {
      const q = this.get(id);
      if (!q) { console.warn('Missing quiz:', id); return; }
      this.renderOne(host, q);
    });
  }
};

/* ---------------- Shared data helpers ---------------- */
function flatLessons() {
  if (flatLessons._c) return flatLessons._c;
  flatLessons._c = [];
  CURRICULUM.forEach(level => level.chapters.forEach(ch =>
    ch.lessons.forEach(ls => flatLessons._c.push({ level, chapter: ch, lesson: ls }))));
  return flatLessons._c;
}
function findLesson(id) { return flatLessons().find(e => e.lesson.id === id); }
function levelDoneCount(level) {
  return level.chapters.reduce((n, ch) => n + ch.lessons.filter(ls => Store.isComplete(ls.id)).length, 0);
}
function levelTotalCount(level) {
  return level.chapters.reduce((n, ch) => n + ch.lessons.length, 0);
}
function levelPct(level) {
  const t = levelTotalCount(level);
  return t ? Math.round(100 * levelDoneCount(level) / t) : 0;
}
function overallPct() {
  const all = flatLessons();
  return all.length ? Math.round(100 * all.filter(e => Store.isComplete(e.lesson.id)).length / all.length) : 0;
}
