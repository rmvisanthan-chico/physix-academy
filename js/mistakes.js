/* PhysiX Academy — Your Physics Mistakes.
 *
 * A view over Store.mistakes(), not a new store. The data has been recording
 * every miss with topic, difficulty, a question id and a timestamp all along;
 * all that was missing was somewhere to look at it.
 *
 * Deliberate choices:
 *  - repeats of one question collapse into a single card with a count, because
 *    being wrong three times is one thing to fix, not three rows of nagging
 *  - the real explanation from the question bank is shown, never invented
 *  - "Try again" re-asks the actual question rather than linking somewhere vague
 *  - everything is optional: an empty notebook says so and links to practice
 */
import { $, esc, Store, toast } from './utils.js';
/* All three quiz files must be imported, in order. b and c push into the same
   QUIZ_BANK that a.js exports, so importing only a.js leaves 52 of the 87
   questions unresolvable - and a mistake from those silently renders as
   "no longer available to retry". Same import order as js/main.js. */
import { QUIZ_BANK } from './data-quiz-a.js';
import './data-quiz-b.js';
import './data-quiz-c.js';
import { App } from './core.js';
import { topicMastery } from './mastery.js';

const Q_BY_ID = {};
QUIZ_BANK.forEach(q => { Q_BY_ID[q.id] = q; });

const DIFF_DOT = {
  beginner: '🟢', intermediate: '🔵', advanced: '🟠', expert: '🟣'
};

function ago(ts) {
  const d = Math.max(0, Date.now() - ts);
  const m = Math.round(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

/* Group by topic so a student sees "you have three gaps in mechanics", not a
   flat feed in reverse-chronological order. Within a topic, most recent first. */
function groupByTopic(mistakes) {
  const map = new Map();
  for (const m of mistakes) {
    if (!map.has(m.topic)) map.set(m.topic, []);
    map.get(m.topic).push(m);
  }
  return [...map.entries()]
    .map(([topic, items]) => ({ topic, items, count: items.length }))
    .sort((a, b) => b.count - a.count);
}

export function viewMistakes() {
  const all = Store.openMistakes({});
  const groups = groupByTopic(all);

  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head">
      <h1>🧠 Your Physics Mistakes</h1>
      <p class="sub">Every question you have got wrong, kept with the reason. Fixing these is worth
         more than any new lesson, because these are the exact places your understanding is thin.</p>
    </div>

    ${all.length ? `
      <div class="grid g2" style="align-items:center;margin-bottom:1.6rem">
        <div class="card stat"><div class="sv">${all.length}</div><div class="sl">Distinct questions missed</div></div>
        <div class="card stat"><div class="sv">${groups.length}</div><div class="sl">Topics affected</div></div>
      </div>
      ${renderGroups(groups)}
      <div class="btn-row" style="margin-top:2rem">
        <a class="btn btn-primary" href="#/practice">Practise weak topics</a>
        <a class="btn" href="#/progress">Back to progress</a>
      </div>
    ` : `
      <div class="empty-state">
        <h2>No mistakes yet 🎉</h2>
        <p>Either you have not answered anything, or you have not got anything wrong.
           Answer some practice questions and this page fills up with the ones you miss.</p>
        <a class="btn btn-primary btn-sm" href="#/practice">Answer questions →</a>
      </div>
    `}
  </div>`;

  if (all.length) wireRetry();
}

function renderGroups(groups) {
  return groups.map(g => {
    const m = topicMastery(g.topic);
    const bar = m
      ? `<div class="topic-meta"><span class="chip ${m.pct >= 70 ? 'green' : 'red'}">${m.pct}% in ${g.topic}</span>
           <span class="small muted">${m.correct}/${m.total} correct</span></div>`
      : '';
    return `
    <section class="sec">
      <div class="sec-title">
        <h2>${esc(g.topic)}</h2>
        <span class="chip red">${g.count} ${g.count === 1 ? 'mistake' : 'mistakes'}</span>
      </div>
      ${bar}
      ${g.items.map(card).join('')}
    </section>`;
  }).join('');
}

function card(m) {
  const q = Q_BY_ID[m.qid];
  if (!q) {
    /* The question bank changed since this was answered. Say so rather than
       showing an empty card or crashing. */
    return `<div class="card mistake-card"><p class="muted">A question from an older version of the
      question bank (${esc(m.topic)}). It is no longer available to retry.</p></div>`;
  }
  const letters = ['A', 'B', 'C', 'D'];
  const given = m.given != null && q.choices[m.given] != null
    ? `<div class="mistake-given">You picked <b>${letters[m.given]}. ${esc(q.choices[m.given])}</b></div>`
    : '';
  /* Guard on a real count rather than truthiness: m.times is always a number,
     but if a future caller passes a collapsed entry without it, a badge
     reading "missed 1x" on a single miss would be a lie. */
  const times = Number(m.times) || 1;
  const repeat = times > 1
    ? `<span class="chip red">missed ${times}&times;</span>`
    : '';
  /* Be explicit that this is not cleared yet, rather than leaving the student
     wondering why it is still here. */
  const streak = `<p class="mistake-streak small muted">Needs ${Store.CLEAN_STREAK} correct answers in a row to clear.</p>`;

  return `
  <div class="card mistake-card" data-qid="${esc(q.id)}">
    <div class="mistake-top">
      <span class="diff-dot">${DIFF_DOT[q.difficulty] || '⚪'} ${esc(q.difficulty)}</span>
      ${repeat}
      <span class="small muted">${ago(m.last)}</span>
    </div>
    <div class="q-text">${q.q}</div>
    ${given}
    <div class="mistake-correct"><b>Correct answer:</b> ${letters[q.answer]}. ${esc(q.choices[q.answer])}</div>
    <details class="mistake-why">
      <summary>Why</summary>
      <div class="q-explain">${esc(q.why)}</div>
    </details>
    <div class="btn-row" style="margin-top:.9rem">
      <button class="btn btn-sm btn-primary" data-retry="${esc(q.id)}">Try again</button>
    </div>
    ${streak}
    <div class="retry-slot"></div>
  </div>`;
}

/* Re-ask the actual question in place, rather than navigating away and losing
   the student's place in their own list. */
function wireRetry() {
  $$all('[data-retry]').forEach(btn => {
    btn.addEventListener('click', () => {
      const qid = btn.dataset.retry;
      const host = btn.closest('.mistake-card').querySelector('.retry-slot');
      host.innerHTML = '';
      btn.disabled = true;
      btn.textContent = 'Answering…';
      import('./blocks.js').then(({ Quiz }) => {
        Quiz.renderOne(host, Q_BY_ID[qid], (correct) => {
          if (correct) {
            /* Deliberately does NOT remove the card. One right answer after a
               miss is often a guess, and clearing on a guess teaches the
               student that the notebook is arbitrary. The question stays with
               an explicit progress note until the streak is met, so the
               requirement is visible rather than mysterious. */
            const need = Store.CLEAN_STREAK;
            const card = btn.closest('.mistake-card');
            const note = card.querySelector('.mistake-streak') ||
              card.querySelector('.btn-row').parentElement.querySelector('.mistake-streak');
            const clear = Store.clearedSinceMiss(qid);
            const line = document.createElement('p');
            line.className = 'mistake-streak small';
            line.textContent = clear
              ? `✓ Fixed — ${need} correct in a row. Removed from your notebook.`
              : `Correct. Answer it ${need} times in a row and it leaves this list — one right answer can still be a guess.`;
            (note || card.querySelector('.retry-slot').parentElement).appendChild(line);

            if (clear) {
              card.style.transition = 'opacity .3s';
              card.style.opacity = '0';
              setTimeout(() => { viewMistakes(); }, 340);
            } else {
              btn.disabled = true;
              btn.textContent = 'Answered ✓';
              toast('Right. Keep going to clear it.');
            }
          } else {
            btn.disabled = false;
            btn.textContent = 'Try again';
            toast('Still wrong. Read the explanation above.');
          }
        });
      });
    });
  });
}

const $$all = (sel) => Array.from(document.querySelectorAll(sel));