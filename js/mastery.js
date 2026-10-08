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

/* ---------- the one-line answer to "what now?" ----------
   Ordered by how much a student is blocked, not by how easy it is to compute.
   A mistake they just made outranks a topic that is merely weak. */
export function recommendation() {
  if (!ready()) return null;
  const recentMiss = Store.mistakes({})[0];
  if (recentMiss) {
    return {
      kind: 'retry',
      title: `Retry: ${recentMiss.topic}`,
      why: 'You got this wrong recently. Fixing it now is worth more than new material.',
      href: '#/mistakes',
      cta: 'Open mistake notebook'
    };
  }
  const weak = reviewQueue(1)[0];
  if (weak) {
    return {
      kind: 'review',
      title: `Review ${weak.topic}`,
      why: `You are at ${weak.pct}% here. A short review will do more than moving on.`,
      href: '#/practice',
      cta: 'Practise this topic'
    };
  }
  const nxt = nextLesson();
  if (nxt) {
    return {
      kind: 'next',
      title: `Next: ${nxt.lesson.title}`,
      why: 'This is the next lesson in your path, in the order physics builds on itself.',
      href: `#/lesson/${nxt.lesson.id}`,
      cta: 'Start lesson'
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