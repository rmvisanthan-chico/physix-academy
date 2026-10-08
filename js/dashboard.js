/* PhysiX Academy — the student dashboard.
 *
 * Answers one question above all: what should I learn next?
 *
 * This is a RENDERER. Every number, status and recommendation on this page
 * comes from mastery.js over Store.data. Nothing is computed here that is not
 * already computed there, and nothing is invented: there are no placeholder
 * percentages, no example rows, no fake activity. If the data says nothing,
 * the page says nothing and offers a next action instead.
 *
 * Two states, and the choice between them is data-driven rather than cosmetic
 * (see isNewStudent): a brand-new student gets an invitation, not an empty
 * dashboard full of zeros. "0% mastery" across four tiles teaches a new student
 * that they have already failed.
 */
import { $, esc, Store } from './utils.js';
import { App } from './core.js';
import { userLabel } from './profile.js';
import { CURRICULUM } from './data-core.js';
import { QUIZ_BANK } from './data-quiz-a.js';
import {
  allMastery, recommendation, roadmap, roadmapByLevel, roadmapProgress,
  currentChapter, curriculumProgress, skillBreakdown, overallMastery,
  reviewQueue, isNewStudent, topicMastery
} from './mastery.js';

/* Deliberately does NOT import afterRender from views.js. views.js imports this
   module to register the route, so calling back into it would make a cycle,
   and the cycle would bite on whichever module evaluated first. The dashboard
   has no .sim-slot, no .quiz-slot and no .reveal, so there is nothing for
   afterRender to do here anyway. */

const STATE_LABEL = { todo: 'Not started', learning: 'Learning', mastered: 'Mastered' };
const STATE_ICON = { todo: '○', learning: '◐', mastered: '●' };

/* ---------- defensive view lookups ----------
   The chapter list is static build-time data, but a hand-written typo in a
   lookup must not take the page down: every read goes through here and returns
   null instead of throwing. */
const lessonAt = (chapter, i) => {
  try { return chapter && chapter.lessons && chapter.lessons[i]; } catch (e) { return null; }
};
const chaptersOf = (level) => {
  try { return (level && Array.isArray(level.chapters)) ? level.chapters : []; } catch (e) { return []; }
};
const lessonsOf = (chapter) => {
  try { return (chapter && Array.isArray(chapter.lessons)) ? chapter.lessons : []; } catch (e) { return []; }
};

/* ---------- tiny local render helpers ---------- */
const pctOf = (n) => `${n}%`;
const tone = (p) => (p < 60 ? 'weak' : p < 80 ? 'ok' : 'good');

function greet() {
  const label = userLabel();
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return label ? `${part}, ${label.split(' · ')[0]}` : part;
}

/* ---------- empty state: the invitation ---------- */
function onboarding() {
  const cp = curriculumProgress();
  return `
  <div class="wrap">
    <div class="dash-hello">
      <div class="dash-kicker">${greet()}</div>
      <h1 class="dash-title">Your physics journey starts here.</h1>
      <p class="dash-lede">Pick any topic below and start building. PhysiX will track what you
        understand, flag what slips, and tell you what to do next — you will never have to guess.</p>
      <div class="btn-row" style="margin-top:1.4rem">
        <a class="btn btn-primary" href="#/learn">Start Learning →</a>
        <a class="btn" href="#/sims">Explore simulations</a>
      </div>
      <p class="small muted" style="margin-top:1rem">${cp.total} lessons across ${CURRICULUM.length} levels,
        ${QUIZ_BANK.length}+ questions that explain themselves, and 40 live simulations.</p>
    </div>

    <section class="sec">
      <div class="sec-title"><h2>Your path</h2>
        <span class="chip plain">${cp.total} lessons · nothing ticked yet</span></div>
      ${roadmapView()}
    </section>
  </div>`;
}

/* ---------- next step: the most important block on the page ---------- */
function nextStep() {
  const rec = recommendation();
  if (!rec) return '';
  return `
  <section class="sec dash-next">
    <div class="sec-title"><h2>Recommended next</h2>
      ${rec.badge ? `<span class="chip ${rec.kind === 'review' || rec.kind === 'retry' ? 'red' : 'cyan'}">${esc(rec.badge)}</span>` : ''}
    </div>
    <div class="card dash-next-card">
      <div class="dash-next-body">
        <h3>${esc(rec.title)}</h3>
        <p class="muted">${esc(rec.why)}</p>
      </div>
      <a class="btn btn-primary dash-next-cta" href="${esc(rec.href)}">${esc(rec.cta)} →</a>
    </div>
  </section>`;
}

/* ---------- continue / resume ---------- */
function continueCard() {
  const rec = recommendation();
  const ch = currentChapter();
  const cp = curriculumProgress();
  if (!ch) return '';
  const resume = rec && rec.kind === 'resume' ? rec : null;
  return `
  <section class="sec">
    <div class="sec-title"><h2>Where you are</h2>
      <span class="chip plain">${cp.done} of ${cp.total} lessons</span></div>
    <div class="card dash-where">
      <div class="dash-where-icon" aria-hidden="true">${ch.icon || '◆'}</div>
      <div class="dash-where-body">
        <div class="small muted">${esc(ch.level)} · ${esc(ch.tag || ch.levelId)}</div>
        <h3>${esc(ch.title)}</h3>
        <p class="muted">${resume ? esc(resume.why) : esc(ch.tagline || '')}</p>
        <div class="progress-track" style="margin-top:.8rem;max-width:420px">
          <div class="progress-fill" style="width:${ch.pct}%"></div>
        </div>
        <div class="small muted" style="margin-top:.4rem">${ch.done}/${ch.lessons} lessons${ch.quizPct != null ? ` · ${pctOf(ch.quizPct)} on questions` : ''}</div>
      </div>
      <a class="btn ${resume ? 'btn-primary' : ''}" href="${esc(ch.lessonHref)}">${resume ? 'Continue →' : esc(ch.lessonTitle.length > 22 ? 'Open chapter →' : 'Start →')}</a>
    </div>
  </section>`;
}

/* ---------- mastery ---------- */
function masteryCard() {
  const overall = overallMastery();
  const skills = skillBreakdown();
  const topics = allMastery().filter(m => !m.provisional).sort((a, b) => b.pct - a.pct).slice(0, 6);
  if (overall == null && !topics.length) return '';

  return `
  <section class="sec">
    <div class="sec-title"><h2>Your mastery</h2>
      <span class="small muted">from ${Store.data.solved} answers</span></div>
    <div class="card dash-mastery">
      ${overall != null ? `
        <div class="dash-mastery-ring">
          <div class="dash-ring" style="--p:${overall}"
               role="img" aria-label="Overall mastery ${overall} percent">
            <span class="rv">${overall}%</span>
          </div>
          <div class="small muted" style="margin-top:.6rem">overall</div>
        </div>` : ''}
      <div class="dash-skills">
        ${skills.map(s => `
          <div class="dash-skill">
            <div class="bar-row">
              <span class="nm">${esc(s.label)}</span>
              <span class="mastery-track"><span class="mastery-fill ${tone(s.pct)}" style="width:${s.pct}%"></span></span>
              <span class="bv">${s.pct}%</span>
            </div>
            <div class="small muted">${s.total} ${s.total === 1 ? 'question' : 'questions'}</div>
          </div>`).join('') || '<p class="muted small">No questions answered yet.</p>'}
      </div>
    </div>

    ${topics.length ? `
    <div class="dash-topics">
      ${topics.map(m => `
        <div class="dash-topic">
          <a class="dash-topic-name" href="#/practice">${esc(m.topic)}</a>
          <span class="mastery-track"><span class="mastery-fill ${tone(m.pct)}" style="width:${m.pct}%"></span></span>
          <span class="mastery-pct">${m.pct}%</span>
          <span class="small muted">${m.correct}/${m.total}</span>
        </div>`).join('')}
    </div>` : ''}
  </section>`;
}

/* ---------- review queue ---------- */
function reviewCard() {
  const items = reviewQueue(4);
  if (!items.length) {
    /* Saying so plainly is better than an empty panel that looks broken. */
    const any = allMastery().length;
    return `
    <section class="sec">
      <div class="sec-title"><h2>Review this</h2></div>
      <div class="card">
        <p class="muted" style="margin:0">${any
          ? 'Nothing needs review right now — no topic is below 70%. Keep the streak going.'
          : 'Once you answer a few questions, anything you are shaky on will appear here automatically.'}</p>
      </div>
    </section>`;
  }
  return `
  <section class="sec">
    <div class="sec-title"><h2>Review this</h2>
      <a class="more" href="#/practice">Practise →</a></div>
    <div class="dash-review">
      ${items.map(r => {
        const m = topicMastery(r.topic);
        const cls = r.kind === 'weak' ? 'red' : 'amber';
        return `
        <a class="card dash-review-item" href="#/practice">
          <div>
            <div class="dash-review-topic">${esc(r.topic)}</div>
            <div class="small muted">${r.kind === 'weak' ? 'Needs review' : 'Improving — keep it fresh'}</div>
          </div>
          <div class="dash-review-pct">
            <span class="chip ${cls}">${r.pct}%</span>
            <span class="small muted">${m ? `${m.correct}/${m.total}` : ''}</span>
          </div>
        </a>`;
      }).join('')}
    </div>
  </section>`;
}

/* ---------- recent mistakes: the entry point, not the notebook ---------- */
function mistakesCard() {
  const all = Store.openMistakes ? Store.openMistakes({}) : Store.mistakes({});
  const recent = all.slice(0, 3);
  if (!recent.length) return '';

  const byId = {};
  QUIZ_BANK.forEach(q => { byId[q.id] = q; });

  return `
  <section class="sec">
    <div class="sec-title"><h2>Recent mistakes</h2>
      <a class="more" href="#/mistakes">All ${all.length} →</a></div>
    <div class="dash-mistakes">
      ${recent.map(m => {
        const q = byId[m.qid];
        const letters = ['A', 'B', 'C', 'D'];
        const stem = q ? q.q.replace(/\s+/g, ' ').trim() : `${m.qid} (no longer in the question bank)`;
        return `
        <div class="card dash-mistake">
          <div class="dash-mistake-top">
            <span class="chip plain">${esc(m.topic)}</span>
            ${m.times > 1 ? `<span class="chip red">missed ${m.times}×</span>` : '<span class="chip amber">not yet cleared</span>'}
          </div>
          <div class="small">${esc(stem.length > 130 ? stem.slice(0, 128) + '…' : stem)}</div>
          ${q && m.given != null ? `<div class="small muted">You picked ${letters[m.given]}. ${esc(q.choices[m.given])}</div>` : ''}
          <div class="btn-row" style="margin-top:.7rem">
            <a class="btn btn-sm" href="#/mistakes">Review &amp; retry</a>
          </div>
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

/* ---------- roadmap ----------
   Grouped by level. Collapsible, because 108 chapters is a lot to show at once
   and a student only needs the level they are in plus a sense of what is left.
   Level 1 is open by default; the rest open when they contain the student. */
function roadmapView() {
  const groups = roadmapByLevel();
  const current = currentChapter();
  if (!groups.length) return '<p class="muted">Curriculum could not be read.</p>';

  return `
  <div class="dash-levels">
    ${groups.map(g => {
      const holds = current && g.chapters.some(c => c.id === current.id);
      return `
      <details class="dash-level" ${holds || g.state !== 'todo' ? 'open' : ''}>
        <summary>
          <span class="dash-level-icon" aria-hidden="true">${g.icon || '◆'}</span>
          <span class="dash-level-name">${esc(g.name)}</span>
          <span class="small muted">${g.reached}/${g.total} chapters</span>
          ${g.state === 'mastered' ? '<span class="chip green">Mastered</span>' : ''}
          ${holds ? '<span class="chip cyan">you are here</span>' : ''}
          <span class="dash-level-pct">${g.pct}%</span>
        </summary>
        <ol class="dash-roadmap">
          ${g.chapters.map(c => `
            <li class="dash-node is-${c.state} ${current && c.id === current.id ? 'is-current' : ''}"
                style="--lv:${c.color || 'var(--acc)'}">
              <span class="dash-node-dot" aria-hidden="true">${STATE_ICON[c.state]}</span>
              <div class="dash-node-body">
                <div class="dash-node-title">${c.icon || ''} ${esc(c.title)}</div>
                <div class="dash-node-meta">
                  <span class="dash-node-state">${STATE_LABEL[c.state]}</span>
                  <span class="small muted">${c.done}/${c.lessons} lessons${c.quizPct != null ? ` · ${pctOf(c.quizPct)} quiz` : ''}</span>
                  ${current && c.id === current.id ? '<span class="chip cyan">here</span>' : ''}
                </div>
                <span class="mastery-track dash-node-track">
                  <span class="mastery-fill ${c.state === 'mastered' ? 'good' : c.state === 'learning' ? 'ok' : ''}"
                        style="width:${c.pct}%"></span>
                </span>
              </div>
              <a class="dash-node-go" href="${esc(c.href)}" aria-label="Open ${esc(c.title)}"
                 >${c.state === 'mastered' ? '✓' : '→'}</a>
            </li>`).join('')}
        </ol>
      </details>`;
    }).join('')}
  </div>`;
}

function roadmapCard() {
  const rp = roadmapProgress();
  const cp = curriculumProgress();
  return `
  <section class="sec">
    <div class="sec-title"><h2>Roadmap progress</h2>
      <span class="chip plain">${rp.reached} of ${rp.total} chapters reached</span></div>
    <div class="card" style="margin-bottom:1rem">
      <div class="dash-progress-line">
        <div>
          <div class="dash-progress-big">${rp.pct}%</div>
          <div class="small muted">of the path reached</div>
        </div>
        <div class="dash-progress-facts">
          <div><b>${rp.mastered}</b><span class="small muted">mastered</span></div>
          <div><b>${rp.reached - rp.mastered}</b><span class="small muted">in progress</span></div>
          <div><b>${rp.total - rp.reached}</b><span class="small muted">not started</span></div>
          <div><b>${cp.done}/${cp.total}</b><span class="small muted">lessons read</span></div>
        </div>
      </div>
    </div>
    ${roadmapView()}
  </section>`;
}

/* ---------- view ---------- */
export function viewDashboard() {
  /* Compute once. Every helper walks the curriculum or the history, so calling
     them inside a template literal would repeat that work per interpolation. */
  let body;
  try {
    if (isNewStudent()) {
      body = onboarding();
    } else {
      body = `
      <div class="wrap">
        <div class="dash-hello">
          <div class="dash-kicker">${greet()}</div>
          <h1 class="dash-title">Here is where you stand.</h1>
        </div>
        ${nextStep()}
        ${continueCard()}
        ${masteryCard()}
        ${reviewCard()}
        ${mistakesCard()}
        ${roadmapCard()}
      </div>`;
    }
  } catch (e) {
    /* One malformed record must not take the dashboard with it. The error
       boundary is the backstop, but a dashboard that survives one bad topic is
       better than one that hands the whole page to a recovery panel. */
    console.error('[dashboard]', e);
    body = `
    <div class="wrap">
      <div class="dash-hello">
        <div class="dash-kicker">${greet()}</div>
        <h1 class="dash-title">Something in your data needs a moment.</h1>
        <p class="dash-lede">Part of your progress could not be read. Your saved work has not been
          deleted — you can carry on learning while this is sorted out.</p>
        <div class="btn-row" style="margin-top:1.4rem">
          <a class="btn btn-primary" href="#/learn">Continue learning →</a>
          <a class="btn" href="#/mistakes">Mistake notebook</a>
        </div>
      </div>
    </div>`;
  }

  App.el.innerHTML = body;
}