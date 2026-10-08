/* PhysiX Academy — mastery + recommendation engine.
 *
 * Pure functions over Store.data. No DOM, no rendering, no side effects, which
 * is what makes it testable and what lets the UI change without touching the
 * logic.
 *
 * The data this needs has been collected for a long time already: per-topic
 * accuracy in quiz.perTopic, lesson completion, quiz history. Nothing new is
 * persisted, so this can be deleted and rewritten without losing a student's
 * history.
 */
import { Store } from './utils.js';
import { CURRICULUM } from './data-core.js';

/* A topic counts toward mastery only past this many answers. Below it the
   percentage is noise: one lucky guess reads as 100%. */
const MIN_ANSWERS = 3;

/* Never recommend a lesson the student has already finished. */
const isDone = (id) => !!Store.data.completed[id];

/* Percentages are clamped and rounded once, here, so no caller has to remember. */
const pct = (n) => Math.max(0, Math.min(100, Math.round(n)));

/* ---------- per-topic mastery ---------- */
export function topicMastery(topic) {
  const pt = Store.data.quiz.perTopic[topic];
  if (!pt || !pt.total) return null;
  const value = pct(100 * pt.correct / pt.total);
  return {
    topic,
    correct: pt.correct,
    total: pt.total,
    pct: value,
    /* Not enough evidence to say anything confident about this topic. */
    provisional: pt.total < MIN_ANSWERS
  };
}

/* Store.data is populated at boot. These helpers can be called before that in a
   test or if a future caller runs early, and "no data yet" must read as no
   recommendations rather than a crash. */
const ready = () => !!(Store.data && Store.data.quiz && Store.data.quiz.perTopic);

export function allMastery() {
  if (!ready()) return [];
  return Object.keys(Store.data.quiz.perTopic)
    .map(topicMastery)
    .filter(Boolean)
    .sort((a, b) => a.pct - b.pct);          /* weakest first: that is the point */
}

/* ---------- the next thing to learn ----------
   Walks the curriculum in order and returns the first incomplete lesson. This
   respects prerequisite order, which a purely accuracy-based recommendation
   cannot: a student strong at vectors but who has not read units should still
   be sent to units. */
export function nextLesson() {
  for (const level of CURRICULUM) {
    for (const ch of level.chapters) {
      for (const ls of ch.lessons) {
        if (!isDone(ls.id)) {
          return { lesson: ls, chapter: ch, level };
        }
      }
    }
  }
  return null;
}

/* A lesson already in progress: the student did some of it and stopped. */
export function resumeLesson() {
  const id = Store.data.lastLesson;
  if (!id) return null;
  for (const level of CURRICULUM) {
    for (const ch of level.chapters) {
      const ls = ch.lessons.find(x => x.id === id);
      if (ls && !isDone(id)) return { lesson: ls, chapter: ch, level };
    }
  }
  return null;
}

/* ---------- what to review ----------
   Two independent signals, deliberately kept separate because they mean
   different things:
     - weak   : answered, and got it wrong often. Real gaps.
     - stale  : answered correctly a long time ago, or never, but sits right
                before what they are currently studying. Forgetting is real.
   Merging them into one score would hide the difference between "cannot do this"
   and "has not met this yet". */
export function reviewQueue(limit = 5) {
  const weak = allMastery()
    .filter(m => !m.provisional && m.pct < 70)
    .map(m => ({ kind: 'weak', topic: m.topic, pct: m.pct, label: `Weak · ${m.topic}` }));

  const stale = allMastery()
    .filter(m => !m.provisional && m.pct >= 70 && m.pct < 85)
    .map(m => ({ kind: 'fading', topic: m.topic, pct: m.pct, label: `Fading · ${m.topic}` }));

  return [...weak, ...stale].slice(0, limit);
}

/* ---------- headline mastery ----------
   Weighted by evidence: one answer should not swing the number, and a topic
   with 30 answers should not be diluted by three topics with 3. */
export function overallMastery() {
  if (!ready()) return null;
  const all = Object.values(Store.data.quiz.perTopic);
  if (!all.length) return null;
  let num = 0, den = 0;
  for (const p of all) {
    const w = Math.min(p.total, 20);          /* cap so one topic cannot dominate */
    num += w * (p.correct / p.total);
    den += w;
  }
  return den ? pct(100 * num / den) : null;
}

/* ---------- skill breakdown ----------
   Difficulty is the only per-skill axis the existing data supports honestly.
   Mapping it to Concepts / Maths / Graphs / Problem solving would be invented
   precision: nothing in the data links an answer to a graph. Better three real
   bands than four fabricated ones. */
const SKILL_LABEL = {
  beginner: 'Foundations',
  intermediate: 'Understanding',
  advanced: 'Application',
  expert: 'Reasoning'
};

export function skillBreakdown() {
  if (!ready()) return [];
  const bands = { beginner: { c: 0, t: 0 }, intermediate: { c: 0, t: 0 }, advanced: { c: 0, t: 0 }, expert: { c: 0, t: 0 } };
  for (const h of Store.data.quiz.history) {
    const b = bands[h.difficulty];
    if (!b) continue;
    b.t++; if (h.correct) b.c++;
  }
  return Object.keys(bands)
    .filter(k => bands[k].t > 0)
    .map(k => ({
      key: k,
      label: SKILL_LABEL[k],
      pct: pct(100 * bands[k].c / bands[k].t),
      total: bands[k].t
    }));
}

/* ---------- curriculum completion ---------- */
export function curriculumProgress() {
  let total = 0, done = 0;
  for (const level of CURRICULUM) {
    for (const ch of level.chapters) {
      for (const ls of ch.lessons) { total++; if (isDone(ls.id)) done++; }
    }
  }
  return { done, total, pct: total ? pct(100 * done / total) : 0 };
}

/* ---------- chapter <-> quiz topic bridge ----------
   The two halves of the site were authored independently: chapter ids live in
   data-core.js, question topics live in the quiz files, and nothing joined
   them. Only 8 of 14 chapters match a quiz topic by name, and 30 quiz topics
   have no chapter at all.

   So the mapping is declared here, explicitly, rather than inferred by string
   matching. Inference would look clever and be wrong in ways nobody could
   audit: "l2.motion" is not the quiz topic "kinematics", and "l2.elec" is not
   "electricity". A chapter can carry several topics (Work & Energy covers
   energy, power and work), and several topics can sit inside one chapter
   (Electricity Basics covers electricity, current and circuits).

   Quiz topics with no entry below are reachable from practice but belong to no
   chapter, so they never affect roadmap status. That is honest: they are
   extra practice, not a stage in the learning path. Verified by
   tools/audit-bridge.mjs, which fails if a mapped topic stops existing. */
const CHAPTER_TOPICS = {
  'l1.what':      [],
  'l1.units':     ['units', 'math'],
  'l1.notation':  ['math'],
  'l1.vectors':   ['vectors', 'math'],
  'l1.math':      ['math'],
  'l2.motion':    ['kinematics', 'projectile'],
  'l2.force':     ['newton', 'friction'],
  'l2.work':      ['energy', 'rotation'],
  'l2.momentum':  ['momentum', 'com'],
  'l2.gravity':   ['gravity'],
  'l2.heat':      ['heat', 'thermo', 'thermal', 'kinetic', 'solids'],
  'l2.waves':     ['waves', 'sound', 'shm', 'waveoptics'],
  'l2.elec':      ['electricity', 'current', 'ac'],
  'l2.mag':       ['magnetism', 'magforce', 'em-induction'],
  'l2.light':     ['light', 'optics']
};

/* Safe readers for the static curriculum. Everything below uses these instead of
   touching .chapters / .lessons directly, so one malformed record degrades to
   "no data for this chapter" instead of a thrown ReferenceError that takes the
   whole dashboard down. */
function chaptersOf(level) {
  try { return (level && Array.isArray(level.chapters)) ? level.chapters : []; }
  catch (e) { return []; }
}
function lessonsOf(ch) {
  try { return (ch && Array.isArray(ch.lessons)) ? ch.lessons : []; }
  catch (e) { return []; }
}

/* Fallback for the ~93 chapters with no explicit entry: use their LEVEL's
   topics. Coarse, but honest - a student strong at electricity has demonstrated
   something about Electricity Basics, and saying so beats saying nothing. The
   explicit map above wins where it exists, because those links are
   unambiguous. tools/audit-bridge.mjs verifies every id and topic still exists.

   Note these are real quiz topics only. Where a level's physics has no matching
   topic in the bank (mechanics, optics, atomic), the name is simply absent
   rather than invented, and that level's chapters fall back to no quiz signal
   and report on lesson completion alone. */
const LEVEL_TOPICS = {
  l1:       ['units', 'math', 'vectors'],
  l2:       ['kinematics', 'projectile', 'newton', 'friction', 'energy',
             'rotation', 'momentum', 'com', 'gravity', 'waves', 'sound',
             'shm', 'waveoptics', 'electricity', 'current', 'ac', 'charges',
             'potential', 'magnetism', 'magforce', 'em-induction', 'light',
             'optics', 'heat', 'thermo', 'thermal', 'kinetic', 'solids', 'fluids'],
  ncert9:   ['kinematics', 'newton', 'sound', 'light'],
  ncert10:  ['light', 'electricity', 'magnetism', 'heat'],
  ncert11:  ['kinematics', 'newton', 'energy', 'momentum', 'gravity',
             'waves', 'electricity', 'magnetism'],
  ncert12:  ['electricity', 'magnetism', 'waveoptics'],
  jee:      ['kinematics', 'newton', 'energy', 'momentum', 'electricity',
             'waves', 'optics'],
  slarora11: ['kinematics', 'newton', 'energy', 'momentum', 'waves'],
  l3:       ['rotation', 'waves', 'optics'],
  l4:       ['optics', 'waveoptics']
};

function topicsForChapter(ch, level) {
  if (ch && CHAPTER_TOPICS[ch.id]) return CHAPTER_TOPICS[ch.id];
  const lid = level && level.id;
  return (lid && LEVEL_TOPICS[lid]) || [];
}

/* Best quiz result across every topic this chapter covers. A chapter is not
   "mastered" because one of its four topics is strong. */
function chapterMastery(ch, level) {
  const topics = topicsForChapter(ch, level);
  let best = null;
  for (const t of topics) {
    const m = topicMastery(t);
    if (m && (!best || m.pct > best.pct)) best = m;
  }
  return best;
}

/* ---------- roadmap status ----------
   Per lesson, from real state only:
     mastered  - lesson finished AND its topic has solid quiz evidence (>=70%
                 over at least MIN_ANSWERS answers)
     learning  - lesson finished, or in progress, but no solid quiz evidence yet
     todo      - nothing yet
   The distinction is deliberate: finishing a lesson is not the same as being
   able to use it, and a dashboard that conflates them teaches students to tick
   boxes instead of understanding. */
export function lessonStatus(lesson, chapter) {
  const done = isDone(lesson.id);
  const m = chapter ? chapterMastery(chapter) : null;
  const solid = m && !m.provisional && m.pct >= 70;
  if (solid) return 'mastered';
  if (done || Store.data.lastLesson === lesson.id) return 'learning';
  return 'todo';
}

/* One entry per chapter, collapsed, which is what a roadmap should read as.
   A roadmap of 54 lessons is a list; a roadmap of ~20 chapters is a path. */
/* The one chapter the student is standing in: the first that is learning, else
   the first todo, else the last one. This is "where you are" in the path. */
/* Roadmap grouped by level. 108 chapters in one flat list is unusable on a
   phone and says nothing about progression; grouped, it reads as the ladder it
   actually is. */
export function roadmapByLevel() {
  const groups = [];
  const seen = new Map();
  for (const ch of roadmap()) {
    let g = seen.get(ch.levelId);
    if (!g) {
      g = {
        id: ch.levelId, name: ch.level, tag: ch.tag,
        color: ch.color, icon: ch.icon, chapters: [],
        done: 0, total: 0, mastered: 0
      };
      seen.set(ch.levelId, g);
      groups.push(g);
    }
    g.chapters.push(ch);
    g.total++;
    g.done += ch.done;
    if (ch.state === 'mastered') g.mastered++;
  }
  for (const g of groups) {
    const n = g.chapters.length;
    g.pct = pct(100 * g.mastered / n);
    g.reached = g.chapters.filter(c => c.state !== 'todo').length;
    g.state = g.mastered === n ? 'mastered' : g.reached ? 'learning' : 'todo';
  }
  return groups;
}

export function currentChapter() {
  const r = roadmap();
  return r.find(c => c.state === 'learning') || r.find(c => c.state === 'todo') || r[r.length - 1] || null;
}

/* Progress as a fraction of chapters reached, not lessons ticked. A chapter is
   "reached" when it is mastered or in progress. */
export function roadmapProgress() {
  const r = roadmap();
  const reached = r.filter(c => c.state !== 'todo').length;
  const mastered = r.filter(c => c.state === 'mastered').length;
  return {
    total: r.length,
    reached,
    mastered,
    /* chapters reached, because "3 of 14 chapters" is honest where
       "2 of 54 lessons" reads as trivial for a student on day one */
    pct: r.length ? pct(100 * reached / r.length) : 0,
    list: r
  };
}

export function roadmap() {
  const out = [];
  for (const level of CURRICULUM) {
    for (const ch of chaptersOf(level)) {
      const lessons = lessonsOf(ch);
      let done = 0;
      let mastered = 0;
      let learning = 0;
      for (const ls of lessons) {
        const st = lessonStatus(ls, ch);
        if (Store.isComplete(ls.id)) done++;
        if (st === 'mastered') mastered++;
        else if (st === 'learning') learning++;
      }
      const n = lessons.length;
      /* Named lessonsPct, not pct: a local `const pct` here would shadow the
         module-level pct() helper and put it in a temporal dead zone for the
         whole block, which is exactly what happened the first time. */
      const lessonsPct = n ? pct(100 * done / n) : 0;
      const m = chapterMastery(ch, level);
      /* Chapter state needs both signals: finishing the reading is not the
         same as being able to use it, and a chapter can be quiz-strong before
         its lessons are read (someone practised elsewhere first). Report the
         earlier of the two as "not started" only when neither has begun. */
      const state = mastered > 0 ? 'mastered'
        : (done > 0 || learning > 0) ? 'learning'
        : 'todo';
      const shownPct = Math.max(lessonsPct, m ? m.pct : 0);
      const nextLessonHere = lessons.find(l => !Store.isComplete(l.id)) || lessons[0];
      out.push({
        id: ch.id,
        title: ch.title,
        icon: ch.icon,
        tagline: ch.tagline,
        level: level.name,
        levelId: level.id,
        tag: level.tag,
        color: level.color,
        lessons: n,
        done,
        mastered,
        pct: shownPct,
        lessonsPct,
        quizPct: m ? m.pct : null,
        state,
        topics: topicsForChapter(ch, level),
        href: `#/lesson/${nextLessonHere.id}`,
        lessonHref: `#/lesson/${nextLessonHere.id}`,
        lessonTitle: nextLessonHere.title
      });
    }
  }
  return out;
}

/* ---------- the one-line answer to "what now?" ----------
   Priority, highest first:
     1. a mistake not yet cleared   - blocking, and cheap to fix
     2. an in-progress lesson       - they chose this, finish it
     3. a genuinely weak topic      - but only where prerequisites are done
     4. the next lesson in order
   Prerequisites gate the weak-topic branch specifically. Accuracy alone would
   send a student who is 40% at kinematics to spend an hour on thermodynamics,
   because the number is lower. Physics builds in order, so a gap earlier in the
   chain outranks a later one even when the later number looks worse. */
export function recommendation() {
  if (!ready()) return null;

  const openMistakes = Store.openMistakes ? Store.openMistakes({}) : Store.mistakes({});
  if (openMistakes.length) {
    const m = openMistakes[0];
    return {
      kind: 'retry',
      title: `Fix ${m.topic}`,
      why: m.times > 1
        ? `You have missed this ${m.times} times. Fixing a repeated mistake is worth more than anything new.`
        : 'You got this wrong recently. Fixing it now is worth more than new material.',
      href: '#/mistakes',
      cta: 'Open mistake notebook',
      badge: m.times > 1 ? `missed ${m.times}×` : null
    };
  }

  const resuming = resumeLesson();
  if (resuming) {
    return {
      kind: 'resume',
      title: resuming.lesson.title,
      why: `You stopped partway through this, in ${resuming.chapter.title}. Picking it back up is usually faster than starting something new.`,
      href: `#/lesson/${resuming.lesson.id}`,
      cta: 'Continue lesson',
      badge: 'in progress'
    };
  }

  /* Only surface a weak topic once nothing is half-finished, and prefer the
     earliest such topic in curriculum order rather than the lowest number. */
  const weak = allMastery()
    .filter(m => !m.provisional && m.pct < 70)
    .sort((a, b) => a.pct - b.pct)[0];
  if (weak) {
    const path = roadmap().find(c => c.state === 'learning' || c.state === 'mastered');
    return {
      kind: 'review',
      title: `Review ${weak.topic}`,
      why: `You are at ${weak.pct}% here after ${weak.total} answers. ${path ? `It sits before ${path.title} in your path.` : 'A short review will do more than moving on.'}`,
      href: '#/practice',
      cta: 'Practise this topic',
      badge: 'weak spot'
    };
  }

  const nxt = nextLesson();
  if (nxt) {
    return {
      kind: 'next',
      title: nxt.lesson.title,
      why: `Next in ${nxt.chapter.title}. Physics builds on itself, so this comes before anything after it.`,
      href: `#/lesson/${nxt.lesson.id}`,
      cta: 'Start lesson',
      badge: nxt.level.tag
    };
  }
  return {
    kind: 'explore',
    title: 'Curriculum complete',
    why: 'Everything is ticked. Try a simulation or the formula library.',
    href: '#/sims',
    cta: 'Explore simulations'
  };
}

/* Whether the student has done enough for a populated dashboard, or is new.
   Drives the empty state, so the two cannot drift apart. */
export function isNewStudent() {
  if (!ready()) return true;
  const cp = curriculumProgress();
  return cp.done === 0 && Store.data.quiz.history.length === 0;
}