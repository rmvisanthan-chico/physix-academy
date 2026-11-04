import { $, $$, debounce, esc, Store, Tex, toast } from './utils.js';
import { speechifyText, texToSpeech } from './tex-speech.js';
import { QUIZ_BANK } from './data-quiz-a.js';
import { viewGames } from './games.js';
import {
  findLesson,
  flatLessons,
  levelDoneCount,
  levelPct,
  levelTotalCount,
  mdInline,
  Quiz,
  renderBlocks
} from './blocks.js';
import { Sims } from './sims-a.js';
import { viewGraph } from './graph.js';
import { chFirstLesson, SCIENTISTS, viewScientists } from './scientists.js';
/* viewPractice, viewSimsPage, viewTutorPage from pages.js — loaded lazily on first navigation */
/* viewLab from lab.js — loaded lazily on first navigation */
import { viewFormulas } from './formulas.js';
import { App, renderHooks } from './core.js';
import { viewProgress } from './progress.js';
import { viewMistakes } from './mistakes.js';
import { viewDashboard } from './dashboard.js';
import { viewCalculators } from './calculators.js';
import { CURRICULUM } from './data-core.js';
import {
  loadPath,
  getPathSummary,
  getCurrentStep,
  getChapterStatus,
  refreshPath,
  onLessonComplete,
  onQuizAnswer,
  onMistakeChange,
  getChapter,
  getLessons
} from './path-engine.js';
import {
  getAllAchievements,
  getAchievementsByCategory,
  getXPInfo,
  getUnlockedCount,
  onLessonComplete as onAchievementLessonComplete,
  onQuizAnswer as onAchievementQuizAnswer,
  onMistakeFixed,
  onSimulationOpen,
  onStreakUpdated,
  onPathChapterMastered,
  onReviewQueueCleared
} from './achievements.js';
import { ACHIEVEMENTS, TOTAL_XP, ACHIEVEMENT_CATEGORIES } from './data-achievements.js';
import {
  startAssessment,
  getCurrentSession,
  submitAnswer,
  finishAssessment,
  getAssessmentState,
  getAssessmentHistory,
  getSessionReport,
  getTopicDiagnosis,
  getRecommendations
} from './assessment-engine.js';
import {
  getQuestionMeta,
  getAllMetadata,
  ASSESSMENT_SKILLS,
  DIFFICULTY_CALIBRATION
} from './data-quiz-meta.js';
/* PhysiX Academy — Router + Home/Learn/Lesson/Topics views */
('use strict');

let _pagesPromise = null;
async function loadPages() {
  if (!_pagesPromise) {
    console.log('[loadPages] Importing pages.js...');
    _pagesPromise = import('./pages.js');
  }
  return _pagesPromise;
}

let _labPromise = null;
async function loadLab() {
  if (!_labPromise) _labPromise = import('./lab.js');
  return _labPromise;
}

function navActive(name) {
  $$('#mainnav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
}

export function afterRender(root) {
  const host = root || App.el;
  /* Each step is isolated. core.js claims the hooks "run isolated" and the hook
     loop below does, but the three lines above it never did: one sim slot that
     threw while mounting would abort every remaining mount, Quiz.renderList and
     Tex.render, leaving a page that rendered text but no maths and no canvas.
     Isolating is what makes one bad slot cost one slot. */
  const step = (name, fn) => {
    try {
      fn();
    } catch (e) {
      console.error('[afterRender:' + name + ']', e);
    }
  };
  /* Sims.mount is now async — wait for all to settle */
  step('sims', async () => {
    await Promise.all($$('.sim-slot', host).map((slot) => Sims.mount(slot.dataset.sim, slot)));
  });
  step('quiz', () =>
    $$('.quiz-slot', host).forEach((slot) => Quiz.renderList(slot, slot.dataset.quiz.split(',')))
  );
  step('accordion', () =>
    $$('.acc-head', host).forEach((h) =>
      h.addEventListener('click', () => h.parentElement.classList.toggle('open'))
    )
  );
  step('reveal', () => $$('.reveal', host).forEach((el) => io.observe(el)));
  step('tex', () => Tex.render(host));
  for (const hook of renderHooks) {
    try {
      hook(root);
    } catch (e) {
      console.error('[afterRender]', e);
    }
  }
}

export const io =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io.unobserve(e.target);
            }
          }),
        { threshold: 0.06 }
      )
    : {
        observe(el) {
          el.classList.add('in');
        }
      };
export async function route() {
  const doRoute = async () => {
    const parts = (location.hash || '#/').slice(1).split('/').filter(Boolean);
    window.scrollTo(0, 0);
    Store.touchToday();
    let nav = 'home';
    if (parts[0] === 'lesson') {
      viewLesson(decodeURIComponent(parts[1] || ''));
      nav = 'learn';
    } else {
      switch (parts[0]) {
        case undefined:
          viewHome();
          break;
        case 'learn':
          viewLearn();
          nav = 'learn';
          break;
        case 'topics':
          viewTopics();
          nav = 'topics';
          break;
        case 'sims': {
          const { viewSimsPage } = await loadPages();
          /* Wait for all sim modules to be loaded */
          await window.__SimsReady;
          await viewSimsPage(parts[1]);
          nav = 'sims';
          break;
        }
        case 'games':
          viewGames(parts[1]);
          nav = 'games';
          break;
        case 'practice': {
          const { viewPractice } = await loadPages();
          viewPractice();
          nav = 'practice';
          break;
        }
        case 'tutor': {
          const { viewTutorPage } = await loadPages();
          viewTutorPage();
          nav = 'tutor';
          break;
        }
        case 'formulas':
          viewFormulas(parts[1]);
          nav = 'formulas';
          break;
        case 'calculators':
          viewCalculators();
          nav = 'calculators';
          break;
        case 'graph':
          viewGraph();
          nav = 'graph';
          break;
        case 'scientists':
          viewScientists();
          nav = 'scientists';
          break;
        case 'dashboard':
          viewDashboard();
          nav = 'dashboard';
          break;
        case 'path':
          viewPath();
          nav = 'path';
          break;
        case 'achievements':
          viewAchievements();
          nav = 'achievements';
          break;
        case 'assessment':
          viewAssessment(parts[1], parts[2]);
          nav = 'assessment';
          break;
        case 'progress':
          viewProgress();
          nav = 'progress';
          break;
        case 'mistakes':
          viewMistakes();
          nav = 'mistakes';
          break;
        case 'support':
          viewSupport();
          nav = '';
          break;
        case 'lab': {
          const { viewLab } = await loadLab();
          viewLab(parts[1]);
          nav = 'lab';
          break;
        }
        case 'about':
          viewAbout();
          nav = '';
          break;
        default:
          viewHome();
      }
    }

    navActive(nav);
  };

  /* A view that throws used to end the page here: without a ViewTransition the
     exception escaped route() and left a half-built DOM, and with one it was
     swallowed by the transition's own rejected promise, so it looked like a
     mysteriously blank screen. Either way the visitor had no way forward, so
     the boundary renders a panel with Try again and Back to home. */
  const guarded = async () => {
    try {
      await doRoute();
      return true;
    } catch (e) {
      console.error('[route]', e);
      const detail = (e && (e.stack || e.message)) || String(e);
      if (window.physixRenderFailed) window.physixRenderFailed(detail);
      else {
        App.el.innerHTML = '';
      } /* guard absent: at least drop the corpse */
      navActive('');
      return false;
    }
  };

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced && document.startViewTransition) {
    /* startViewTransition returns a ViewTransition whose .ready and .finished
       promises REJECT when the transition is skipped (rapid navigation, tab
       hidden, another transition starting). Unhandled, that surfaces as an
       uncaught error in the console on almost every route change. */
    const vt = document.startViewTransition(guarded);
    if (vt && vt.ready && vt.ready.catch) {
      vt.ready.catch(() => {});
    }
    if (vt && vt.finished && vt.finished.catch) {
      vt.finished.catch(() => {});
    }
  } else {
    await guarded();
  }
}

/* ---------------- Home ---------------- */
function viewHome() {
  const simsN = Object.keys(Sims.reg).length;
  const studies = [
    {
      id: '01',
      title: 'Field / Lines',
      type: 'Electric fields, drawn in space',
      mins: '18 MIN LESSON',
      cls: 'art-a',
      img: 'assets/studies/field.jpg',
      ch: 'l3.charges'
    },
    {
      id: '02',
      title: 'Gravity / Well',
      type: 'Orbits you can tilt and warp',
      mins: '12 MIN LESSON',
      cls: 'art-b',
      img: 'assets/studies/gravity.jpg',
      ch: 'l2.gravity'
    },
    {
      id: '03',
      title: 'Light / Matter',
      type: 'Where waves become particles',
      mins: '16 MIN LESSON',
      cls: 'art-c',
      img: 'assets/studies/light.jpg',
      ch: 'l3.dual'
    }
  ];
  App.el.innerHTML = `
  <div id="home-cine">
  <section class="hero cine-hero">
    <div class="hero-mesh" aria-hidden="true"></div>
    <div class="hero-grid" aria-hidden="true"></div>
    <span class="hero-kicker"><i class="pulse-dot"></i> Interactive physics academy · MMXXVI</span>
    <h1 class="display">Understand<br><em>physics.</em><br><span class="dim">Don't memorize it.</span></h1>
    <p class="lede">Every lesson starts with a real question, builds intuition, proves the formulas, and hands you the simulation. Progress saves itself right here in your browser.</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#/learn">Start learning<svg class="bi" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      <a class="btn btn-ghost" href="#/sims">Explore simulations<svg class="bi" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4.2"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)"/></svg></a>
    </div>
  </section>

  <section class="statement">
    <p class="eyebrow">Our point of view</p>
    <p class="statement-copy">A formula is not decoration.<br><span>It is motion, written down.</span></p>
  </section>

  <div class="wrap">
    <div class="stat-grid">
      <div class="card stat"><div class="sv" data-count="${CURRICULUM.length}">${CURRICULUM.length}</div><div class="sl">Levels</div></div>
      <div class="card stat"><div class="sv" data-count="${CURRICULUM.reduce((n, l) => n + l.chapters.length, 0)}">${CURRICULUM.reduce((n, l) => n + l.chapters.length, 0)}</div><div class="sl">Chapters</div></div>
      <div class="card stat"><div class="sv" data-count="${flatLessons().length}">${flatLessons().length}</div><div class="sl">Lessons</div></div>
      <div class="card stat"><div class="sv" data-count="${simsN}">${simsN}</div><div class="sl">Simulations</div></div>
    </div>

    <!-- TRIAL: Physics-Lab-inspired Topics (local only, not pushed) -->
    <section class="sec px-topics">
      <div class="sec-title"><h2>Physics Topics</h2><a class="more" href="#/sims">All sims →</a></div>
      <p class="muted" style="margin:-.6rem 0 1.2rem">Choose your area of exploration — NCERT 9/10/11 mapped</p>
      <div class="px-topic-grid">
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">8 sims</span><h3>Classical Mechanics</h3><p>Motion, forces, energy and momentum</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">2 sims</span><h3>Fluid Dynamics</h3><p>Pressure, viscosity and flow behaviour</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">5 sims</span><h3>Wave Physics</h3><p>Oscillations, interference and propagation</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">2 sims</span><h3>Thermodynamics</h3><p>Heat transfer & ideal gas behaviour</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">6 sims</span><h3>Electricity & Magnetism</h3><p>Fields, circuits and electromagnetic effects</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
        <article class="px-topic-card" data-href="#/sims"><span class="px-count">4 sims</span><h3>Optics</h3><p>Light, mirrors, lenses & instruments</p><a class="px-link" href="#/sims">Explore simulations →</a></article>
      </div>
    </section>

    <section class="sec px-featured">
      <div class="sec-title"><h2>Featured Simulations</h2><a class="more" href="#/sims">All sims →</a></div>
      <p class="muted" style="margin:-.6rem 0 1.2rem">Popular concepts to get you started</p>
      <div class="px-featured-grid">
        <article class="px-featured-card" data-href="#/sims"><h3>Pendulum Motion</h3><p>Explore SHM with an interactive pendulum</p><span class="px-link">Open →</span></article>
        <article class="px-featured-card" data-href="#/sims"><h3>Projectile Motion</h3><p>Path under gravity — predict the flight</p><span class="px-link">Open →</span></article>
        <article class="px-featured-card" data-href="#/sims"><h3>Flow Rate Simulator</h3><p>Pipe width vs velocity — Bernoulli in action</p><span class="px-link">Open →</span></article>
      </div>
    </section>

    <section class="sec px-stats">
      <div class="px-stat"><span class="px-stat-num">${simsN}</span><span class="px-stat-label">Simulations</span></div>
      <div class="px-stat"><span class="px-stat-num">6</span><span class="px-stat-label">Topics</span></div>
      <div class="px-stat"><span class="px-stat-num">${CURRICULUM.length}</span><span class="px-stat-label">Levels</span></div>
      <div class="px-stat"><span class="px-stat-num">∞</span><span class="px-stat-label">Possibilities</span></div>
      <div class="px-stat"><span class="px-stat-num">100%</span><span class="px-stat-label">Offline</span></div>
    </section>

    <section class="sec">
      <div class="sec-title"><h2>Selected studies</h2><a class="more" href="#/topics">All topics →</a></div>
      <div class="st-grid">
        ${studies
          .map(
            (s) => `
        <article class="study" data-href="${chFirstLesson(s.ch)}">
          <div class="study-art ${s.cls}">
            <img class="study-img" src="${s.img}" alt="" loading="lazy" onerror="this.style.display='none'">
            <span class="art-shape"></span>
            <span class="study-num">${s.id}</span>
            <span class="study-go">↗</span>
          </div>
          <div class="study-meta">
            <div><h3>${esc(s.title)}</h3><p>${esc(s.type)}</p></div>
            <time>${s.mins}</time>
          </div>
        </article>`
          )
          .join('')}
      </div>
    </section>

    <section class="sec" id="home-path">
      <div class="sec-title"><h2>Your path</h2><a class="more" href="#/learn">Full curriculum →</a></div>
      <div class="grid g2">
        ${CURRICULUM.map(
          (l) => `
        <a class="card hover level-card ${l.id}" href="#/learn">
          <div class="lv-num">${esc(l.tag)}</div>
          <h3>${l.icon} ${esc(l.name)}</h3>
          <p class="muted">${esc(l.desc)}</p>
          <div class="topic-meta"><span class="chip plain">${levelTotalCount(l)} lessons</span>
          <span class="chip ${levelPct(l) ? 'cyan' : 'plain'}">${levelPct(l)}% done</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${levelPct(l)}%"></div></div>
        </a>`
        ).join('')}
      </div>
    </section>

    <section class="sec">
      <div class="sec-title"><h2>The method</h2></div>
      <div class="method-row">
        <div class="step"><span>01</span><h3>Find the question</h3><p>Every lesson starts underneath the formula — with the <b>why</b> that made someone ask.</p></div>
        <div class="step"><span>02</span><h3>Build the world</h3><p>Drag sliders, tilt orbits, trace fields across ${simsN} simulations. Intuition is engineered, not assumed.</p></div>
        <div class="step"><span>03</span><h3>Prove it</h3><p>Derivations close the loop, then ${QUIZ_BANK.length} quiz questions make sure the idea survives an exam.</p></div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-title"><h2>Meet the minds</h2><a class="more" href="#/scientists">All ${SCIENTISTS.length} physicists →</a></div>
      <div class="sci-strip">
        ${['einstein', 'curie', 'raman', 'newton', 'snbose', 'hawking']
          .map(
            (k) =>
              '<a class="sci-mini" href="#/scientists" title="Open the Hall of Physicists"><img loading="lazy" src="assets/scientists/' +
              (SCIENTISTS.find((s) => s.img === k + '.jpg') || {}).img +
              '" alt=""></a>'
          )
          .join('')}
        <a class="sci-mini sci-more" href="#/scientists">+${SCIENTISTS.length - 6} more →</a>
      </div>
    </section>

    <section class="sec">
      <div class="card rec-card" style="border-left-color:var(--warn)">
        <h3>Start here, not anywhere else</h3>
        <p class="muted">“Motion in a Straight Line” is the lesson we show people first: question → intuition → simulation → derivation → worked examples → quiz. If our method works for you, you'll know within twenty minutes.</p>
        <a class="btn btn-primary btn-sm" href="#/lesson/l3.kin1d.motion">Open the flagship lesson</a>
      </div>
    </section>
  </div>
  </div>`;

  $$('.study', App.el).forEach((card) =>
    card.addEventListener('click', () => (location.hash = card.dataset.href))
  );
  $$('.px-topic-card, .px-featured-card', App.el).forEach((c) =>
    c.addEventListener('click', () => (location.hash = c.dataset.href))
  );
  afterRender();
}

/* ---------------- Learn ---------------- */
function viewLearn() {
  const pills = ['all', ...CURRICULUM.map((l) => l.id)];
  const chosen = App.levelFilter;
  const levels = chosen === 'all' ? CURRICULUM : CURRICULUM.filter((l) => l.id === chosen);

  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>Learn</h1>
    <p class="sub">Four levels, ${CURRICULUM.reduce((n, l) => n + l.chapters.length, 0)} chapters. Open any chapter below — ticked lessons are ones you've completed.</p></div>
    <div class="pills">${pills
      .map((p) => {
        const l = CURRICULUM.find((x) => x.id === p);
        return (
          '<button class="pill' +
          (chosen === p ? ' active' : '') +
          '" data-lvl="' +
          p +
          '">' +
          (l ? l.icon + ' ' + esc(l.name) : 'All levels') +
          '</button>'
        );
      })
      .join('')}</div>
    ${levels
      .map(
        (l) => `
      <section class="sec">
        <div class="sec-title"><h2>${l.icon} ${esc(l.name)}</h2>
        <span class="chip ${levelDoneCount(l) ? 'green' : 'plain'}">${levelDoneCount(l)}/${levelTotalCount(l)} done</span></div>
        ${l.chapters
          .map((ch) => {
            const done = ch.lessons.filter((ls) => Store.isComplete(ls.id)).length;
            return `
          <div class="acc">
            <button class="acc-head"><span style="font-size:1.3rem">${ch.icon}</span>
              <span><span class="t">${esc(ch.title)}</span><span class="s">${esc(ch.tagline)}</span></span>
              <span class="chip ${done === ch.lessons.length ? 'green' : 'plain'}">${done}/${ch.lessons.length}</span>
              <span class="acc-caret">▾</span>
            </button>
            <div class="acc-body">
              ${ch.lessons
                .map(
                  (ls) => `
                <a class="lesson-row${Store.isComplete(ls.id) ? ' done' : ''}" href="#/lesson/${ls.id}">
                  <span class="ln">${Store.isComplete(ls.id) ? '✓' : ch.lessons.indexOf(ls) + 1}</span>
                  <span class="lt">${esc(ls.title)}</span>
                  <span class="lm">${ls.mins} min</span>
                </a>`
                )
                .join('')}
            </div>
          </div>`;
          })
          .join('')}
      </section>`
      )
      .join('')}
  </div>`;

  $$('.pill[data-lvl]', App.el).forEach((p) =>
    p.addEventListener('click', () => {
      App.levelFilter = p.dataset.lvl;
      viewLearn();
    })
  );
  afterRender();
}

/* ---------------- Lesson ---------------- */
function viewLesson(id) {
  const entry = findLesson(id);
  if (!entry) {
    App.el.innerHTML =
      '<div class="wrap"><div class="empty-state"><div class="big" style="font-family:var(--ff-head)">404<sup>physics</sup></div><h2>This lesson doesn\'t exist — yet</h2><p>Either the link is wrong, or this lesson hasn\'t been written. It\'s not you.</p><p><a href="#/learn">Back to the curriculum</a></p></div></div>';
    return;
  }
  const { level, chapter, lesson } = entry;
  Store.data.lastLesson = id;
  Store.save();
  const flat = flatLessons();
  const idx = flat.indexOf(entry);
  const prev = flat[idx - 1],
    next = flat[idx + 1];
  const formulas = [];
  lesson.content.forEach((b) => {
    if (!b) return;
    if (b.formula && b.formula.tex) formulas.push(b.formula);
    if (b.formulas)
      b.formulas.forEach((f) => {
        if (f.tex) formulas.push(f);
      });
  });
  const posInChapter = chapter.lessons.indexOf(lesson) + 1;

  App.el.innerHTML = `
  <div class="lesson-shell">
    <nav class="lesson-nav" aria-label="Curriculum">
      <a class="btn btn-sm btn-ghost" href="#/learn">‹ All levels</a>
      ${level.chapters
        .map(
          (ch) => `
        <div class="acc${ch.id === chapter.id ? ' open' : ''}">
          <button class="acc-head"><span>${ch.icon}</span><span class="t" style="font-size:.86rem">${esc(ch.title.replace(' ⭐', ''))}</span><span class="acc-caret">▾</span></button>
          <div class="acc-body">
            ${ch.lessons
              .map(
                (ls) => `
              <a class="lesson-row${Store.isComplete(ls.id) ? ' done' : ''}${ls.id === id ? '' : ''}" href="#/lesson/${ls.id}" ${ls.id === id ? 'style="background:var(--acc-soft)"' : ''}>
                <span class="ln">${Store.isComplete(ls.id) ? '✓' : ch.lessons.indexOf(ls) + 1}</span>
                <span class="lt" style="font-size:.84rem">${esc(ls.title)}</span>
              </a>`
              )
              .join('')}
          </div>
        </div>`
        )
        .join('')}
    </nav>

    <article class="lesson-content">
      <div class="lesson-crumb">${level.icon} ${esc(level.name)} › ${chapter.icon} ${esc(chapter.title)}</div>
      <h1>${esc(lesson.title)} <button class="btn btn-sm" id="btn-speak" aria-label="Listen aloud" title="Listen to this lesson" style="vertical-align:middle;margin-left:.5rem">🔊 <span id="speak-label">Listen</span></button></h1>
      <div class="topic-meta" style="margin-bottom:1rem">
        <span class="chip plain">${lesson.mins} min read</span>
        <span class="chip cyan">Lesson ${posInChapter} of ${chapter.lessons.length}</span>
        <span class="chip amber" id="ls-status"></span>
      </div>
      ${renderBlocks(lesson.content)}
      <div class="errata">Something off in this lesson — a sign, a number, a sentence? <a href="#/tutor">Tell the tutor</a> starting your message with <code>fix:</code> — corrections go live fast, and get credited on this page.</div>
      <div class="lesson-foot">
        ${prev ? '<a class="btn btn-sm" href="#/lesson/' + prev.lesson.id + '">‹ ' + esc(prev.lesson.title.slice(0, 30)) + (prev.lesson.title.length > 30 ? '…' : '') + '</a>' : '<span></span>'}
        <button class="btn btn-sm btn-primary" id="btn-done"></button>
        ${next ? '<a class="btn btn-sm" href="#/lesson/' + next.lesson.id + '">' + esc(next.lesson.title.slice(0, 30)) + (next.lesson.title.length > 30 ? '…' : '') + ' ›</a>' : '<span></span>'}
      </div>
    </article>

    <aside class="lesson-aside">
      <div class="side-card"><h4>Key formulas</h4>
        ${formulas.length ? formulas.map((f) => '<div class="kf">' + esc(f.name || '') + '</div>').join('') : '<p class="muted small mb0">This lesson focuses on concepts — no new formulas.</p>'}
      </div>
      <div class="side-card"><h4>Quick revision</h4>
        ${(lesson.content.filter((b) => b.revise).flatMap((b) => b.revise) || []).map((r) => '<div class="kf small">• ' + mdInline(r) + '</div>').join('') || '<p class="muted small">—</p>'}
      </div>
      <div class="side-card"><h4>My notes</h4>
        <textarea class="notes-area" id="ls-notes" placeholder="Write your own summary…">${esc(Store.data.notes[id] || '')}</textarea>
        <p class="small muted mt0" style="margin-bottom:0">Saved automatically ✓</p>
      </div>
    </aside>
  </div>`;

  const refreshDone = () => {
    const done = Store.isComplete(id);
    const st = $('#ls-status');
    st.textContent = done ? '✓ Completed' : '○ Not completed yet';
    st.className = 'chip ' + (done ? 'green' : 'amber');
    const bd = $('#btn-done');
    bd.textContent = done ? '↩ Mark as not done' : '✓ Mark lesson complete';
  };
  $('#btn-done').addEventListener('click', () => {
    if (Store.isComplete(id)) {
      delete Store.data.completed[id];
      Store.save();
      toast('Lesson marked incomplete.');
    } else {
      Store.completeLesson(id);
      toast('Lesson complete. ' + Store.streak() + '-day streak and counting.');
    }
    refreshDone();
  });
  const notesEl = $('#ls-notes');
  notesEl.addEventListener(
    'input',
    debounce(() => {
      Store.data.notes[id] = notesEl.value;
      Store.save();
    }, 400)
  );

  refreshDone();
  // Speaker button — Web Speech API
  const speakBtn = $('#btn-speak'),
    speakLabel = $('#speak-label');
  let utter = null;
  function lessonSpeakText() {
    const parts = [lesson.title, chapter.title, level.name];
    lesson.content.forEach((b) => {
      if (!b) return;
      const k = Object.keys(b)[0],
        v = b[k];
      if (k === 'p' && typeof v === 'string') parts.push(v.replace(/\*\*/g, ''));
      else if (k === 'why' && v) parts.push(v.q + ' ' + v.p);
      else if (k === 'intuition' && Array.isArray(v)) v.forEach((x) => parts.push(x.h + ' ' + x.p));
      else if (k === 'def' && Array.isArray(v))
        v.forEach((x) => parts.push(x.term + ': ' + x.text));
      else if (k === 'h' && typeof v === 'string') parts.push(v);
      else if (k === 'ul' && Array.isArray(v)) parts.push(v.join('. '));
      else if (k === 'revise' && Array.isArray(v)) parts.push(v.join('. '));
      /* Equations used to be skipped entirely, so a lesson on Newton's law
         was heard with no law in it. LaTeX is converted to spoken English
         rather than having only its $ delimiters stripped, which left
         "\frac{G m_1 m_2}{r^2}" being read as "backslash frac brace...". */
      else if (k === 'formula' && v) {
        if (v.name) parts.push(String(v.name).replace(/<[^>]+>/g, ''));
        if (v.tex)
          parts.push(
            typeof texToSpeech === 'function'
              ? texToSpeech(v.tex)
              : String(v.tex).replace(/\$/g, '')
          );
        if (v.note) parts.push(String(v.note).replace(/<[^>]+>/g, ''));
      }
    });
    const joined = parts.join('. ').replace(/<[^>]+>/g, ' ');
    const clean =
      typeof speechifyText === 'function' ? speechifyText(joined) : joined.replace(/\$/g, '');
    return clean.replace(/\s{2,}/g, ' ').slice(0, 4000);
  }
  speakBtn?.addEventListener('click', () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      speakLabel.textContent = 'Listen';
      speakBtn.firstChild.textContent = '🔊 ';
      return;
    }
    const text = lessonSpeakText();
    utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.lang = 'en-IN';
    utter.onstart = () => {
      speakLabel.textContent = 'Stop';
      speakBtn.firstChild.textContent = '⏹️ ';
    };
    utter.onend = () => {
      speakLabel.textContent = 'Listen';
      speakBtn.firstChild.textContent = '🔊 ';
    };
    utter.onerror = () => {
      speakLabel.textContent = 'Listen';
      speakBtn.firstChild.textContent = '🔊 ';
    };
    window.speechSynthesis.speak(utter);
  });
  // stop on navigate
  window.addEventListener(
    'hashchange',
    () => {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    },
    { once: true }
  );

  afterRender();
}

/* ---------------- Topics ---------------- */
function viewTopics() {
  const cards = CURRICULUM.flatMap((l) =>
    l.chapters.map((ch) => {
      const done = ch.lessons.filter((ls) => Store.isComplete(ls.id)).length;
      const pct = Math.round((100 * done) / ch.lessons.length);
      const target = ch.lessons.find((ls) => !Store.isComplete(ls.id)) || ch.lessons[0];
      return `
    <div class="card hover topic-card">
      <h3>${ch.icon} ${esc(ch.title)}</h3>
      <p class="muted">${esc(ch.tagline)}</p>
      <div class="topic-meta">
        <span class="chip plain" style="--lv:${l.color};color:${l.color};border-color:${l.color}55">${esc(l.tag)}</span>
        <span class="chip plain">${ch.lessons.length} lessons</span>
        <span class="chip ${done ? 'green' : 'plain'}">${pct}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="topic-meta"><a class="btn btn-sm ${done ? '' : 'btn-primary'}" href="#/lesson/${target.id}">${done ? '↻ Review' : '▶ Start'}</a></div>
    </div>`;
    })
  ).join('');
  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>Topics</h1>
    <p class="sub">All ${CURRICULUM.reduce((n, l) => n + l.chapters.length, 0)} chapters at a glance. Jump straight into whatever you need.</p></div>
    <div class="grid g3">${cards}</div>
  </div>`;
  afterRender();
}

/* ---------------- Support ---------------- */
const UPI_ID = '9489627927@fam';
const UPI_URI = 'upi://pay?pa=' + UPI_ID + '&pn=PhysiX%20Academy&cu=INR';

function viewSupport() {
  App.el.innerHTML = `
  <div class="wrap wrap-narrow">
    <div class="page-head"><h1>Support this project</h1>
      <p class="sub">Everything here is free, shows no ads, and works offline. It stays that way. If it helped you understand something you'd given up on, you can send a little thanks below — any amount, straight to my UPI, no middleman.</p></div>

    <div class="card upi-card center">
      <div id="upi-qr" class="upi-qr" aria-label="UPI QR code"></div>
      <p class="small muted" style="margin:.6rem 0 0">Scan with GPay · PhonePe · Paytm · FamPay</p>

      <div class="upi-id-row">
        <code class="upi-id">${UPI_ID}</code>
        <button class="btn btn-sm btn-primary" id="btn-copy-upi">Copy UPI ID</button>
      </div>

      <a class="btn upi-open" href="${UPI_URI}">Open in a UPI app<svg class="bi" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17L17 7M9 7h8v8"/></svg></a>
      <p class="small muted" style="margin:.8rem 0 0">The app button works on phones. On a computer, scan the code or copy the ID.</p>
    </div>

    <div class="card" style="margin-top:1.2rem">
      <h3>Where the money goes</h3>
      <ul class="muted" style="margin:.4rem 0 0;padding-left:1.2rem">
        <li>Keeping everything free and ad-free — forever</li>
        <li>More simulations and lessons (there's a list)</li>
        <li>Server-less means almost zero costs — so even small support goes a long way</li>
      </ul>
    </div>
  </div>`;

  /* offline QR via vendored qrcode-generator */
  try {
    const qr = window.qrcode ? window.qrcode(0, 'M') : null;
    if (qr) {
      qr.addData(UPI_URI);
      qr.make();
      $('#upi-qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
    }
  } catch (e) {
    console.warn('QR failed', e);
  }

  $('#btn-copy-upi').addEventListener('click', () => {
    const done = () => toast('UPI ID copied: ' + UPI_ID);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(UPI_ID)
        .then(done)
        .catch(() => fallbackCopy(done));
    } else fallbackCopy(done);
  });
}

function fallbackCopy(done) {
  const ta = document.createElement('textarea');
  ta.value = UPI_ID;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    done();
  } catch (e) {
    toast('Copy failed — the ID is ' + UPI_ID);
  }
  ta.remove();
}

/* ---------------- Path ---------------- */
function viewPath() {
  const path = loadPath();
  const summary = getPathSummary();
  const current = getCurrentStep();

  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>🗺️ Your Learning Path</h1>
      <p class="sub">A personalized roadmap based on what you've mastered, what needs review, and what unlocks next.</p></div>

    <div class="card path-summary">
      <div class="path-stats">
        <div class="path-stat"><b>${summary.mastered}</b><span>mastered</span></div>
        <div class="path-stat"><b>${summary.inProgress}</b><span>in progress</span></div>
        <div class="path-stat"><b>${summary.ready}</b><span>ready to learn</span></div>
        <div class="path-stat"><b>${summary.weak}</b><span>need review</span></div>
        ${summary.mistakes ? `<div class="path-stat"><b>${summary.mistakes}</b><span>mistakes to fix</span></div>` : ''}
        ${summary.blocked ? `<div class="path-stat"><b>${summary.blocked}</b><span>blocked</span></div>` : ''}
      </div>
    </div>

    ${
      current
        ? `
    <section class="sec path-next">
      <div class="sec-title"><h2>Recommended Next</h2></div>
      <div class="card path-next-card">
        <div class="path-next-icon" style="background:${current.levelColor || 'var(--acc)'}" aria-hidden="true">${current.chapterIcon || '◆'}</div>
        <div class="path-next-body">
          <div class="small muted">${current.levelName ? `${current.levelName} · ` : ''}${current.kind === 'mistake' ? 'Mistake' : current.kind === 'continue' ? 'Continue' : current.kind === 'review' ? 'Review' : 'Learn'}</div>
          <h3>${esc(current.chapterTitle)}</h3>
          <p class="muted">${esc(current.reason)}</p>
          ${current.minutes ? `<div class="small muted">≈ ${current.minutes} min</div>` : ''}
        </div>
        ${current.nextLessonId ? `<a class="btn btn-primary path-next-cta" href="#/lesson/${current.nextLessonId}">${current.kind === 'mistake' ? 'Open mistake notebook' : current.kind === 'continue' ? 'Continue lesson' : 'Start lesson'} →</a>` : ''}
      </div>
    </section>`
        : ''
    }

    <section class="sec">
      <div class="sec-title"><h2>Full Path</h2></div>
      <div class="path-levels">
        ${path.steps
          .filter((s) => s.levelId)
          .map((step, i) => {
            const ch = getChapter(step.chapterId);
            if (!ch) return '';
            const lessons = getLessons(step.chapterId);
            const doneCount = lessons.filter((ls) => Store.isComplete(ls.id)).length;
            const statusClass =
              step.status === 'mastered'
                ? 'mastered'
                : step.status === 'in-progress'
                  ? 'in-progress'
                  : step.status === 'ready'
                    ? 'ready'
                    : step.status === 'weak'
                      ? 'weak'
                      : step.status === 'blocked'
                        ? 'blocked'
                        : step.status === 'mistake'
                          ? 'mistake'
                          : 'todo';
            const statusIcon =
              step.status === 'mastered'
                ? '●'
                : step.status === 'in-progress'
                  ? '◐'
                  : step.status === 'ready'
                    ? '○'
                    : step.status === 'weak'
                      ? '⚠'
                      : step.status === 'blocked'
                        ? '🔒'
                        : step.status === 'mistake'
                          ? '🔧'
                          : '○';
            return `
          <details class="path-level" ${step.status !== 'blocked' && step.status !== 'todo' ? 'open' : ''}>
            <summary class="path-level-summary">
              <span class="path-level-icon">${ch.levelIcon || '◆'}</span>
              <span class="path-level-name">${esc(ch.levelName || ch.levelId)}</span>
              <span class="path-level-count">${doneCount}/${lessons.length} lessons</span>
              ${step.status === 'mastered' ? '<span class="chip green">Mastered</span>' : ''}
            </summary>
            <ol class="path-chapters">
              <li class="path-node is-${statusClass}" style="--lv:${ch.levelColor || 'var(--acc)'}">
                <span class="path-node-dot" aria-hidden="true">${statusIcon}</span>
                <div class="path-node-body">
                  <div class="path-node-title">${ch.icon || ''} ${esc(ch.title)}</div>
                  <div class="path-node-meta">
                    <span class="path-node-state">${step.reason}</span>
                    ${step.minutes ? `<span class="small muted">≈ ${step.minutes} min</span>` : ''}
                  </div>
                </div>
                <a class="path-node-go" href="${step.nextLessonId ? `#/lesson/${step.nextLessonId}` : step.status === 'mistake' ? '#/mistakes' : '#/learn'}"
                   aria-label="${step.status === 'mistake' ? 'Fix mistake' : step.nextLessonId ? `Open ${esc(ch.title)}` : 'View'}">${step.status === 'mastered' ? '✓' : step.status === 'mistake' ? '🔧' : '→'}</a>
              </li>
            </ol>
          </details>`;
          })
          .join('')}
      </div>
    </section>
  </div>`;

  afterRender();
}

/* ---------------- Achievements ---------------- */
function viewAchievements() {
  const categories = getAchievementsByCategory();
  const xpInfo = getXPInfo();
  const unlockedCount = getUnlockedCount();
  const totalCount = ACHIEVEMENTS.length;

  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>🏆 Achievements</h1>
      <p class="sub">Track your progress, earn XP, and unlock achievements as you learn.</p></div>

    <div class="card achievements-header">
      <div class="achievements-xp">
        <div class="xp-ring" style="--p:${xpInfo.percentToNext}">
          <span class="rv">${xpInfo.xp} XP</span>
        </div>
        <div class="xp-details">
          <div><b>Level ${xpInfo.level}</b><span class="small muted">of ${Math.floor(Math.sqrt(TOTAL_XP / 50)) + 1}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${xpInfo.percentToNext}%"></div></div>
          <div class="small muted">${xpInfo.xp} / ${TOTAL_XP} XP · ${xpInfo.needed} to next level</div>
        </div>
      </div>
      <div class="achievements-summary">
        <div class="achieve-stat"><b>${unlockedCount}</b><span>unlocked</span></div>
        <div class="achieve-stat"><b>${totalCount - unlockedCount}</b><span>remaining</span></div>
      </div>
    </div>

    ${Object.values(categories)
      .map((cat) => {
        const catAchievements = cat.achievements || [];
        if (!catAchievements.length) return '';
        const unlockedInCat = catAchievements.filter((a) => a.unlocked).length;
        return `
      <section class="sec">
        <details class="achievement-category" open>
          <summary class="achievement-cat-summary">
            <span class="achievement-cat-icon">${cat.icon}</span>
            <span class="achievement-cat-name">${cat.name}</span>
            <span class="achievement-cat-count">${unlockedInCat}/${catAchievements.length}</span>
            <span class="achievement-cat-pct">${catAchievements.length ? Math.round((100 * unlockedInCat) / catAchievements.length) : 0}%</span>
          </summary>
          <div class="achievement-grid">
            ${catAchievements
              .map(
                (a) => `
            <article class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
              <div class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</div>
              <div class="achievement-body">
                <h4>${esc(a.name)}</h4>
                <p class="achievement-desc">${esc(a.desc)}</p>
                <div class="achievement-meta">
                  <span class="chip ${a.unlocked ? 'green' : 'plain'}">${a.unlocked ? 'Unlocked' : 'Locked'}</span>
                  <span class="chip cyan">+${a.xp} XP</span>
                </div>
                ${a.unlocked ? `<div class="small muted">Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}</div>` : ''}
              </div>
            </article>`
              )
              .join('')}
          </div>
        </details>
      </section>`;
      })
      .join('')}
  </div>`;

  afterRender();
}

/* ---------------- Assessment ---------------- */
function viewAssessment(topicId, sessionId) {
  /* #/assessment/results/<id> — the router passes the session id as the
     second path part. Dispatch to the dedicated results view. */
  if (topicId === 'results' && sessionId) {
    viewAssessmentResults(sessionId);
    return;
  }

  const state = getAssessmentState();
  const session = state.currentSession;
  const allTopics = Object.keys(getAllMetadata())
    .map((m) => getAllMetadata()[m].topic)
    .filter(Boolean);

  /* If there's an active session, show the assessment interface */
  if (session && !session.completed) {
    const item = session.items[session.responses.length];
    if (item) {
      const question = QUIZ_BANK.find((q) => q.id === item.qid);
      if (question) {
        const metadata = getQuestionMeta(item.qid);
        const diffCal = DIFFICULTY_CALIBRATION[question.difficulty] || { theta: 0, weight: 0.5 };

        App.el.innerHTML = `
        <div class="wrap">
          <div class="page-head"><h1>📊 Assessment: ${metadata?.topic || question.topic}</h1>
            <p class="sub">Adaptive assessment — difficulty adjusts based on your performance.</p></div>

          <div class="card assessment-header">
            <div class="assess-progress">
              <div class="assess-progress-bar">
                <div class="assess-progress-fill" style="width:${(session.responses.length / session.items.length) * 100}%"></div>
              </div>
              <div class="small muted">${session.responses.length} / ${session.items.length} questions</div>
            </div>
            <div class="assess-ability">
              <div class="assess-theta">Estimated ability: <b>${session.abilityTheta.toFixed(2)}</b></div>
              <div class="small muted">Standard error: ${Math.sqrt(session.abilityVar).toFixed(2)}</div>
            </div>
          </div>

          <section class="sec">
            <div class="sec-title"><h2>Question ${session.responses.length + 1} of ${session.items.length}</h2></div>
            <div id="assess-q"></div>
          </section>

          <div class="assess-nav">
            <button class="btn btn-primary" id="assess-submit" ${item.given == null ? 'disabled' : ''}>Submit Answer</button>
            <button class="btn" id="assess-end">End Assessment</button>
          </div>
        </div>`;

        /* Render the question */
        const q = question;
        const diff = { dot: '🔘', label: q.difficulty };
        const optsBox = document.createElement('div');
        optsBox.className = 'opts';
        const letters = ['A', 'B', 'C', 'D'];
        const fb = document.createElement('div');
        fb.className = 'feedback';
        let answered = item.answered;

        const qEl = document.createElement('div');
        qEl.className = 'quiz-q';
        qEl.innerHTML =
          '<div class="q-head"><span class="chip plain">' +
          esc(q.topic) +
          '</span>' +
          '<span class="diff-dot">' +
          diff.dot +
          ' ' +
          diff.label +
          '</span></div>' +
          '<div class="q-text">' +
          mdInline(q.q) +
          '</div>';
        qEl.appendChild(optsBox);
        qEl.appendChild(fb);

        q.choices.forEach((choiceText, i) => {
          const b = document.createElement('button');
          b.className = 'opt';
          b.innerHTML =
            '<span class="k">' + letters[i] + '</span><span>' + mdInline(choiceText) + '</span>';
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
            fb.innerHTML =
              (correct ? '<b>✓ Correct!</b> ' : '<b>✗ Not quite.</b> ') +
              '<div class="q-explain"><b>Why:</b> ' +
              mdInline(q.why) +
              '</div>';
            $('#assess-submit').disabled = false;
            /* Record only the SELECTION (item.given). item.answered and
               item.correct belong to the engine: submitAnswer() sets them and
               guards on item.answered, so if the view pre-marked the item as
               answered here, the engine would reject the submit with
               "Already answered" and the session would stall on the same
               question forever. */
            item.given = i;
          });
          optsBox.appendChild(b);
        });

        qEl.appendChild(fb);
        $('#assess-q').appendChild(qEl);

        /* Submit handler */
        $('#assess-submit').addEventListener('click', async () => {
          if (item.given == null) return; /* no option selected yet */
          const qid = item.qid;
          const given = item.given;
          await submitAnswer(qid, given, 0); // timeMs not tracked in UI yet

          if (session.responses.length < session.items.length) {
            /* Next question - reload view */
            viewAssessment();
          } else {
            /* Assessment complete */
            const finished = finishAssessment();
            if (finished) {
              toast(
                'Assessment complete! ' +
                  Math.round(
                    (100 * finished.responses.filter((r) => r.correct).length) /
                      finished.responses.length
                  ) +
                  '%'
              );
              viewAssessmentResults(finished.id);
            }
          }
        });

        /* End assessment early */
        $('#assess-end').addEventListener('click', () => {
          if (confirm('End assessment early? Progress will be saved.')) {
            const finished = finishAssessment();
            if (finished) viewAssessmentResults(finished.id);
          }
        });

        return;
      }
    }
  }

  /* No active session - show topic selection or results */
  if (topicId) {
    /* Show assessment setup for specific topic */
    const metadata = getAllMetadata();
    const topicMeta = metadata[Object.keys(metadata).find((k) => metadata[k].topic === topicId)];
    const recentSessions = getAssessmentHistory(topicId).slice(-5);

    App.el.innerHTML = `
      <div class="wrap">
        <div class="page-head"><h1>📊 Assessment: ${topicId}</h1>
          <p class="sub">Take an adaptive assessment to measure your understanding and identify gaps.</p></div>

        <div class="card">
          <h3>Start New Assessment</h3>
          <p class="muted">Questions adapt to your performance. Takes ~5 minutes.</p>
          <div class="btn-row">
            <button class="btn btn-primary" id="start-assess-5">5 Questions (Quick)</button>
            <button class="btn btn-primary" id="start-assess-10">10 Questions (Standard)</button>
            <button class="btn btn-primary" id="start-assess-20">20 Questions (Comprehensive)</button>
          </div>
        </div>

        ${
          recentSessions.length
            ? `
        <section class="sec">
          <div class="sec-title"><h2>Recent Assessments</h2></div>
          <div class="assessment-history">
            ${recentSessions
              .map(
                (s) => `
            <a class="card assess-history-item" href="#/assessment/results/${s.id}">
              <div class="assess-hist-date">${new Date(s.endedAt || s.startedAt).toLocaleDateString()}</div>
              <div class="assess-hist-score">${Math.round((100 * s.responses.filter((r) => r.correct).length) / s.responses.length)}%</div>
              <div class="assess-hist-theta">θ ${s.abilityAfter?.toFixed(2) || '—'}</div>
              <div class="small muted">${s.responses.length} questions · ${Math.round((s.endedAt - s.startedAt) / 60000)} min</div>
            </a>`
              )
              .join('')}
          </div>
        </section>`
            : ''
        }

        <section class="sec">
          <div class="sec-title"><h2>All Topics</h2></div>
          <div class="grid g3">
            ${allTopics
              .map(
                (t) => `
            <a class="card hover topic-card" href="#/assessment/${t}">
              <h3>${t}</h3>
              <p class="small muted">Adaptive assessment available</p>
            </a>`
              )
              .join('')}
          </div>
        </section>
      </div>`;

    $('#start-assess-5')?.addEventListener('click', () => {
      startAssessment(topicId, 5);
      viewAssessment();
    });
    $('#start-assess-10')?.addEventListener('click', () => {
      startAssessment(topicId, 10);
      viewAssessment();
    });
    $('#start-assess-20')?.addEventListener('click', () => {
      startAssessment(topicId, 20);
      viewAssessment();
    });

    return;
  }

  /* Topic selection view */
  App.el.innerHTML = `
    <div class="wrap">
      <div class="page-head"><h1>📊 Adaptive Assessment</h1>
        <p class="sub">Choose a topic to start an adaptive assessment. Questions adapt to your ability in real time.</p></div>

      <div class="grid g3">
        ${allTopics
          .map(
            (t) => `
        <a class="card hover topic-card" href="#/assessment/${t}">
          <h3>${t}</h3>
          <p class="small muted">Adaptive assessment available</p>
        </a>`
          )
          .join('')}
      </div>

      <section class="sec">
        <div class="sec-title"><h2>Assessment History</h2></div>
        <div class="assessment-history">
          ${state.sessions
            .slice(-10)
            .reverse()
            .map(
              (s) => `
          <a class="card assess-history-item" href="#/assessment/${s.targetTopic}">
            <div class="assess-hist-topic">${s.targetTopic}</div>
            <div class="assess-hist-date">${new Date(s.endedAt || s.startedAt).toLocaleDateString()}</div>
            <div class="assess-hist-score">${Math.round((100 * s.responses.filter((r) => r.correct).length) / s.responses.length)}%</div>
            <div class="small muted">${s.responses.length} questions · θ ${s.abilityAfter?.toFixed(2) || '—'}</div>
          </a>`
            )
            .join('')}
        </div>
      </section>
    </div>`;
  afterRender();
}

/* Separate results view */
function viewAssessmentResults(sessionId) {
  const session = getSessionReport(sessionId);
  if (!session) {
    App.el.innerHTML =
      '<div class="wrap"><div class="empty-state"><h2>Assessment not found</h2></div></div>';
    return;
  }

  const correct = session.responses.filter((r) => r.correct).length;
  const total = session.responses.length;
  const pct = total ? Math.round((100 * correct) / total) : 0;

  App.el.innerHTML = `
  <div class="wrap">
    <div class="page-head"><h1>📊 Assessment Results</h1>
      <p class="sub">${session.targetTopic} · ${new Date(session.endedAt).toLocaleDateString()}</p></div>

    <div class="card assess-result-header">
      <div class="assess-score-ring" style="--p:${pct}">
        <span class="rv">${pct}%</span>
      </div>
      <div class="assess-score-details">
        <div><b>${correct}/${total}</b> correct</div>
        <div class="small muted">Ability: θ ${session.abilityAfter?.toFixed(2) || '—'} (was ${session.abilityBefore?.toFixed(2) || '—'})</div>
        <div class="small muted">${Math.round((session.endedAt - session.startedAt) / 60000)} minutes</div>
      </div>
    </div>

    ${
      session.diagnosis?.length
        ? `
    <section class="sec">
      <div class="sec-title"><h2>Diagnosis & Recommendations</h2></div>
      <div class="diagnosis-list">
        ${session.diagnosis
          .map(
            (d) => `
        <div class="card diagnosis-item ${d.type}">
          <div class="diag-type">${d.type.replace('_', ' ')}</div>
          <div class="diag-message">${d.message}</div>
          ${d.skill ? `<div class="small muted">Skill: ${ASSESSMENT_SKILLS[d.skill] || d.skill}</div>` : ''}
          ${d.difficulty ? `<div class="small muted">Difficulty: ${d.difficulty}</div>` : ''}
        </div>`
          )
          .join('')}
      </div>
    </section>`
        : ''
    }

    <section class="sec">
      <div class="sec-title"><h2>Recommendations</h2></div>
      <div class="recommendations">
        ${getRecommendations(session.targetTopic)
          .map(
            (r) => `
        <a class="card rec-item" href="${r.href || '#/practice'}">
          <div class="rec-icon">${r.type === 'review' ? '📚' : r.type === 'practice' ? '🎯' : '📝'}</div>
          <div class="rec-body">
            <h4>${r.topic || session.targetTopic}</h4>
            <p class="small muted">${r.reason}</p>
            <span class="chip ${r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'amber' : 'cyan'}">${r.priority}</span>
          </div>
        </a>`
          )
          .join('')}
      </div>
    </section>

    <div class="btn-row" style="margin-top:1.5rem">
      <a class="btn btn-primary" href="#/assessment/${session.targetTopic}">Retake Assessment</a>
      <a class="btn" href="#/path">View Learning Path</a>
      <a class="btn" href="#/practice">Practice Questions</a>
    </div>
  </div>`;

  afterRender();
}

/* ---------------- About ---------------- */
function viewAbout() {
  App.el.innerHTML = `
  <div class="wrap wrap-narrow">
    <div class="page-head"><h1>About PhysiX Academy</h1>
      <p class="sub">Built start to finish by one student — no template, no framework, no shortcuts.</p></div>

    <div class="card" style="line-height:1.8">
      <h3>The story</h3>
      <p>Most physics websites give you a wall of notes and call it teaching. I wanted something that actually works the way physics works — with things you can move, formulas you can see respond, and questions that explain themselves.</p>
      <p>So I built it. Every lesson, every simulation, every equation on this site was hand-written. The simulations run live in your browser. The AI tutor solves problems offline. Nothing here is a template or a copied block of notes.</p>
      <p>It started as a way for me to understand physics properly, and grew into this — a free, ad-free, offline-friendly platform for anyone preparing for board exams.</p>
    </div>

    <div class="card" style="line-height:1.8">
      <h3>By the numbers</h3>
      <div class="stat-grid" style="margin-top:1rem">
        <div class="card stat"><div class="sv">${CURRICULUM.length}</div><div class="sl">Levels</div></div>
        <div class="card stat"><div class="sv">${flatLessons().length}</div><div class="sl">Lessons</div></div>
        <div class="card stat"><div class="sv">${Object.keys(Sims.reg).length}</div><div class="sl">Simulations</div></div>
        <div class="card stat"><div class="sv">${QUIZ_BANK ? QUIZ_BANK.length : '87'}</div><div class="sl">Questions</div></div>
      </div>
    </div>

    <div class="card" style="line-height:1.8">
      <h3>Author</h3>
      <p><b>R.M. VISANTHAN</b> — the sole developer, designer and content writer behind every page of this site.</p>
      <p>Questions, corrections, or just to say the site helped? Email <a href="mailto:r.m.visanthan@gmail.com">r.m.visanthan@gmail.com</a>.</p>
    </div>

    <div class="card" style="line-height:1.8">
      <h3>Keeping it free</h3>
      <p>PhysiX Academy has no ads, no subscriptions, and no hidden paywalls. It runs as a static site, so running costs are near zero — which means it can stay free forever. If it helped you, you can <a href="#/support">support the project</a> with a small donation.</p>
    </div>
  </div>`;
}
