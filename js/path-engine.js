/* PhysiX Academy — Personalized Learning Path Engine (M1)
 *
 * Pure functions over Store.data + curriculum + KG_EDGES.
 * No DOM, no rendering, no side effects.
 *
 * Design:
 * - Builds a DAG from KG_EDGES (chapter prerequisites)
 * - Computes topological order respecting prerequisites
 * - Evaluates student state (completed lessons, quiz mastery, mistakes)
 * - Generates a step-by-step learning plan with explanations
 * - All data stored in Store.data.path (versioned, local-only)
 */
import { Store } from './utils.js';
import { CURRICULUM } from './data-core.js';
import { KG_EDGES } from './graph.js';

/* ---------- Constants ---------- */
const MIN_ANSWERS = 3;
const MASTERY_THRESHOLD = 70; // >= 70% = mastered
const FADING_THRESHOLD = 85; // 70-85% = fading

const PATH_VERSION = 2;

/* ---------- Helpers ---------- */
const pct = (n) => Math.max(0, Math.min(100, Math.round(n)));

/* Check if a lesson is completed */
const isDone = (id) => !!Store.data?.completed?.[id];

/* Get all chapters in curriculum order (level order, then chapter order) */
function allChapters() {
  const out = [];
  for (const level of CURRICULUM) {
    for (const ch of level.chapters) {
      out.push({
        ...ch,
        levelId: level.id,
        levelName: level.name,
        levelIcon: level.icon,
        levelColor: level.color,
        levelTag: level.tag
      });
    }
  }
  return out;
}

/* Build adjacency list from KG_EDGES */
function buildPrereqGraph() {
  const adj = new Map(); // chapterId -> [dependentChapterIds]
  const reverseAdj = new Map(); // chapterId -> [prerequisiteChapterIds]
  const allIds = new Set();

  for (const ch of allChapters()) {
    allIds.add(ch.id);
    adj.set(ch.id, []);
    reverseAdj.set(ch.id, []);
  }

  for (const [from, to] of KG_EDGES) {
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    if (!reverseAdj.has(from)) reverseAdj.set(from, []);
    if (!reverseAdj.has(to)) reverseAdj.set(to, []);

    adj.get(from).push(to);
    reverseAdj.get(to).push(from);
  }

  return { adj, reverseAdj, allIds };
}

/* Topological sort of chapters respecting prerequisites */
function topologicalOrder() {
  const { adj, allIds } = buildPrereqGraph();
  const inDegree = new Map();
  for (const id of allIds) inDegree.set(id, 0);
  for (const [from, tos] of adj) {
    for (const to of tos) inDegree.set(to, (inDegree.get(to) || 0) + 1);
  }

  const queue = [...allIds].filter((id) => inDegree.get(id) === 0);
  const order = [];

  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of adj.get(id) || []) {
      const deg = inDegree.get(next) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  // If cycle detected (shouldn't happen), append remaining
  if (order.length < allIds.size) {
    for (const id of allIds) {
      if (!order.includes(id)) order.push(id);
    }
  }

  return order;
}

/* Get chapter object by ID */
function getChapter(chapterId) {
  for (const level of CURRICULUM) {
    const ch = level.chapters.find((c) => c.id === chapterId);
    if (ch)
      return {
        ...ch,
        levelId: level.id,
        levelName: level.name,
        levelIcon: level.icon,
        levelColor: level.color
      };
  }
  return null;
}

/* Get lessons for a chapter */
function getLessons(chapterId) {
  const ch = getChapter(chapterId);
  return ch?.lessons || [];
}

/* Check if a chapter's prerequisites are all satisfied */
function prereqsSatisfied(chapterId, completedLessons) {
  const { reverseAdj } = buildPrereqGraph();
  const prereqs = reverseAdj.get(chapterId) || [];
  for (const prereqId of prereqs) {
    const prereqLessons = getLessons(prereqId);
    const allDone = prereqLessons.every((ls) => completedLessons.has(ls.id));
    if (!allDone) return { satisfied: false, missing: prereqId };
  }
  return { satisfied: true };
}

/* Get topic mastery from existing mastery.js logic */
function getTopicMastery(topic) {
  const pt = Store.data?.quiz?.perTopic?.[topic];
  if (!pt || !pt.total) return null;
  const value = pct((100 * pt.correct) / pt.total);
  return {
    topic,
    correct: pt.correct,
    total: pt.total,
    pct: value,
    provisional: pt.total < MIN_ANSWERS
  };
}

/* Get chapter's associated quiz topics (from mastery.js) */
const CHAPTER_TOPICS = {
  'l1.what': [],
  'l1.units': ['units', 'math'],
  'l1.notation': ['math'],
  'l1.vectors': ['vectors', 'math'],
  'l1.math': ['math'],
  'l2.motion': ['kinematics', 'projectile'],
  'l2.force': ['newton', 'friction'],
  'l2.work': ['energy', 'rotation'],
  'l2.momentum': ['momentum', 'com'],
  'l2.gravity': ['gravity'],
  'l2.heat': ['heat', 'thermo', 'thermal', 'kinetic', 'solids'],
  'l2.waves': ['waves', 'sound', 'shm', 'waveoptics'],
  'l2.elec': ['electricity', 'current', 'ac'],
  'l2.mag': ['magnetism', 'magforce', 'em-induction'],
  'l2.light': ['light', 'optics']
};

const LEVEL_TOPICS = {
  l1: ['units', 'math', 'vectors'],
  l2: [
    'kinematics',
    'projectile',
    'newton',
    'friction',
    'energy',
    'rotation',
    'momentum',
    'com',
    'gravity',
    'waves',
    'sound',
    'shm',
    'waveoptics',
    'electricity',
    'current',
    'ac',
    'charges',
    'potential',
    'magnetism',
    'magforce',
    'em-induction',
    'light',
    'optics',
    'heat',
    'thermo',
    'thermal',
    'kinetic',
    'solids',
    'fluids'
  ],
  ncert9: ['kinematics', 'newton', 'sound', 'light'],
  ncert10: ['light', 'electricity', 'magnetism', 'heat'],
  ncert11: [
    'kinematics',
    'newton',
    'energy',
    'momentum',
    'gravity',
    'waves',
    'electricity',
    'magnetism'
  ],
  ncert12: ['electricity', 'magnetism', 'waveoptics'],
  jee: ['kinematics', 'newton', 'energy', 'momentum', 'electricity', 'waves', 'optics'],
  slarora11: ['kinematics', 'newton', 'energy', 'momentum', 'waves'],
  l3: ['rotation', 'waves', 'optics'],
  l4: ['optics', 'waveoptics']
};

function topicsForChapter(chapterId, levelId) {
  if (CHAPTER_TOPICS[chapterId]) return CHAPTER_TOPICS[chapterId];
  return LEVEL_TOPICS[levelId] || [];
}

/* Compute chapter mastery (best of its topics) */
function chapterQuizMastery(chapterId, levelId) {
  const topics = topicsForChapter(chapterId, levelId);
  let best = null;
  for (const t of topics) {
    const m = getTopicMastery(t);
    if (m && (!best || m.pct > best.pct)) best = m;
  }
  return best;
}

/* Check if a chapter is mastered (lessons done + quiz >= 70%) */
function isChapterMastered(chapter) {
  const lessons = getLessons(chapter.id);
  const allLessonsDone = lessons.every((ls) => isDone(ls.id));
  const quizM = chapterQuizMastery(chapter.id, chapter.levelId);
  const quizSolid = quizM && !quizM.provisional && quizM.pct >= MASTERY_THRESHOLD;
  return allLessonsDone && quizSolid;
}

/* Check if chapter is in progress */
function isChapterInProgress(chapter) {
  const lessons = getLessons(chapter.id);
  const anyDone = lessons.some((ls) => isDone(ls.id));
  const lastLesson = Store.data?.lastLesson;
  const inProgress = lessons.some((ls) => ls.id === lastLesson);
  return anyDone || inProgress;
}

/* ---------- Path Plan Generation ---------- */

export function generatePathPlan() {
  const completedLessons = new Set(Object.keys(Store.data?.completed || {}));
  const order = topologicalOrder();
  const chapters = allChapters().filter((ch) => order.includes(ch.id));

  const steps = [];
  let stepIndex = 0;

  for (const ch of chapters) {
    const lessons = getLessons(ch.id);
    const mastered = isChapterMastered(ch);
    const inProgress = isChapterInProgress(ch);
    const prereqs = prereqsSatisfied(ch.id, completedLessons);

    // Determine the status and next action for this chapter
    if (mastered) {
      // Already mastered - skip in path but record
      steps.push({
        stepIndex: stepIndex++,
        chapterId: ch.id,
        chapterTitle: ch.title,
        chapterIcon: ch.icon,
        levelId: ch.levelId,
        levelName: ch.levelName,
        kind: 'review',
        reason: 'Already mastered — available for review',
        priority: 0,
        status: 'mastered',
        minutes: lessons.reduce((sum, ls) => sum + (ls.mins || 0), 0),
        lessonIds: lessons.map((ls) => ls.id),
        nextLessonId: null
      });
      continue;
    }

    if (!prereqs.satisfied) {
      // Prerequisites not met - mark as blocked
      const missingCh = getChapter(prereqs.missing);
      steps.push({
        stepIndex: stepIndex++,
        chapterId: ch.id,
        chapterTitle: ch.title,
        chapterIcon: ch.icon,
        levelId: ch.levelId,
        levelName: ch.levelName,
        kind: 'blocked',
        reason: `Requires ${missingCh?.title || prereqs.missing} first`,
        priority: 100,
        status: 'blocked',
        minutes: lessons.reduce((sum, ls) => sum + (ls.mins || 0), 0),
        lessonIds: lessons.map((ls) => ls.id),
        nextLessonId: lessons[0]?.id || null
      });
      continue;
    }

    // Find the next incomplete lesson in this chapter
    const nextLesson = lessons.find((ls) => !isDone(ls.id)) || lessons[0];

    if (inProgress) {
      // Currently learning this chapter
      steps.push({
        stepIndex: stepIndex++,
        chapterId: ch.id,
        chapterTitle: ch.title,
        chapterIcon: ch.icon,
        levelId: ch.levelId,
        levelName: ch.levelName,
        kind: 'continue',
        reason: inProgress
          ? `You are partway through ${ch.title}. Finish it to unlock what comes next.`
          : `You have started ${ch.title}. Continue to build a solid foundation.`,
        priority: 1,
        status: 'in-progress',
        minutes: lessons
          .filter((ls) => !isDone(ls.id))
          .reduce((sum, ls) => sum + (ls.mins || 0), 0),
        lessonIds: lessons.map((ls) => ls.id),
        nextLessonId: nextLesson.id
      });
    } else {
      // Ready to learn - check for weak quiz topics
      const quizM = chapterQuizMastery(ch.id, ch.levelId);
      const weakTopics = quizM && !quizM.provisional && quizM.pct < MASTERY_THRESHOLD;

      if (weakTopics) {
        steps.push({
          stepIndex: stepIndex++,
          chapterId: ch.id,
          chapterTitle: ch.title,
          chapterIcon: ch.icon,
          levelId: ch.levelId,
          levelName: ch.levelName,
          kind: 'review',
          reason: `Quiz shows ${quizM.pct}% on ${quizM.topic}. Review before moving on.`,
          priority: 2,
          status: 'weak',
          minutes: lessons.reduce((sum, ls) => sum + (ls.mins || 0), 0),
          lessonIds: lessons.map((ls) => ls.id),
          nextLessonId: nextLesson.id
        });
      } else {
        steps.push({
          stepIndex: stepIndex++,
          chapterId: ch.id,
          chapterTitle: ch.title,
          chapterIcon: ch.icon,
          levelId: ch.levelId,
          levelName: ch.levelName,
          kind: 'learn',
          reason: `Prerequisites satisfied. ${ch.title} is next in your physics foundation.`,
          priority: 3,
          status: 'ready',
          minutes: lessons.reduce((sum, ls) => sum + (ls.mins || 0), 0),
          lessonIds: lessons.map((ls) => ls.id),
          nextLessonId: nextLesson.id
        });
      }
    }
  }

  // Also check for open mistakes that should be prioritized
  const openMistakes = Store.openMistakes ? Store.openMistakes({}) : Store.mistakes({});
  if (openMistakes.length) {
    const mistake = openMistakes[0];
    steps.unshift({
      stepIndex: -1,
      chapterId: null,
      chapterTitle: `Fix: ${mistake.topic}`,
      chapterIcon: '🔧',
      levelId: null,
      levelName: null,
      kind: 'mistake',
      reason:
        mistake.times > 1
          ? `You've missed this ${mistake.times}×. Fixing repeated mistakes unlocks progress.`
          : 'You got this wrong recently. Fixing it now is worth more than new material.',
      priority: 0,
      status: 'mistake',
      minutes: 10,
      lessonIds: [],
      nextLessonId: null,
      mistakeQid: mistake.qid
    });
  }

  // Renumber steps after potential mistake insertion
  steps.forEach((s, i) => {
    s.stepIndex = i;
  });

  return {
    version: PATH_VERSION,
    planId: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    inputsHash: hashInputs(completedLessons),
    steps
  };
}

function hashInputs(completedLessons) {
  const data =
    Array.from(completedLessons).sort().join(',') +
    '|' +
    JSON.stringify(Store.data?.quiz?.perTopic || {});
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

/* ---------- Path Storage ---------- */

export function loadPath() {
  if (!Store.data) Store.load();
  if (!Store.data.path) {
    Store.data.path = generatePathPlan();
    Store.save();
  }
  return Store.data.path;
}

export function savePath(path) {
  if (!Store.data) Store.load();
  path.updatedAt = Date.now();
  Store.data.path = path;
  Store.save();
}

export function invalidatePath() {
  if (Store.data) {
    delete Store.data.path;
    Store.save();
  }
}

/* Regenerate path when student state changes */
export function refreshPath() {
  const newPath = generatePathPlan();
  savePath(newPath);
  return newPath;
}

/* ---------- Public API ---------- */

export function getCurrentStep() {
  const path = loadPath();
  return path.steps.find((s) => s.status !== 'mastered' && s.status !== 'blocked') || null;
}

export function getNextLesson() {
  const step = getCurrentStep();
  if (!step || !step.nextLessonId) return null;
  return step.nextLessonId;
}

export function getPathSummary() {
  const path = loadPath();
  const total = path.steps.length;
  const mastered = path.steps.filter((s) => s.status === 'mastered').length;
  const inProgress = path.steps.filter((s) => s.status === 'in-progress').length;
  const ready = path.steps.filter((s) => s.status === 'ready').length;
  const weak = path.steps.filter((s) => s.status === 'weak').length;
  const blocked = path.steps.filter((s) => s.status === 'blocked').length;
  const mistakes = path.steps.filter((s) => s.status === 'mistake').length;

  return { total, mastered, inProgress, ready, weak, blocked, mistakes };
}

export function getChapterStatus(chapterId) {
  const path = loadPath();
  return path.steps.find((s) => s.chapterId === chapterId) || null;
}

export function markStepComplete(chapterId) {
  const path = loadPath();
  const step = path.steps.find((s) => s.chapterId === chapterId);
  if (step) {
    step.status = 'mastered';
    savePath(path);
    return true;
  }
  return false;
}

export function getPrerequisiteChain(chapterId) {
  const { reverseAdj } = buildPrereqGraph();
  const chain = [];
  let current = chapterId;
  const visited = new Set();

  while (reverseAdj.has(current)) {
    const prereqs = reverseAdj.get(current);
    if (!prereqs.length) break;
    // For simplicity, take the first prerequisite (could be multiple)
    const prereq = prereqs[0];
    if (visited.has(prereq)) break;
    visited.add(prereq);
    chain.unshift(prereq);
    current = prereq;
  }

  return chain.map((id) => getChapter(id)).filter(Boolean);
}

export function canAccessChapter(chapterId) {
  const completedLessons = new Set(Object.keys(Store.data?.completed || {}));
  return prereqsSatisfied(chapterId, completedLessons).satisfied;
}

/* ---------- Integration hooks ---------- */

/* Call when a lesson is completed */
export function onLessonComplete(lessonId) {
  invalidatePath();
  return refreshPath();
}

/* Call when quiz answer is recorded */
export function onQuizAnswer(question, correct) {
  invalidatePath();
  return refreshPath();
}

/* Call when mistake is added/cleared */
export function onMistakeChange() {
  invalidatePath();
  return refreshPath();
}

export { getChapter, getLessons };

/* ---------- Store event listeners ---------- */
/* Auto-refresh path when relevant events occur */
if (typeof window !== 'undefined') {
  Store.on('lesson_complete', ({ lessonId }) => {
    console.log('[PathEngine] lesson_complete:', lessonId);
    invalidatePath();
    refreshPath();
  });

  Store.on('quiz_answer', () => {
    console.log('[PathEngine] quiz_answer');
    invalidatePath();
    refreshPath();
  });

  Store.on('mistake_change', () => {
    console.log('[PathEngine] mistake_change');
    invalidatePath();
    refreshPath();
  });
}

/* ---------- Debug / Testing ---------- */

export function _internals() {
  return {
    topologicalOrder,
    buildPrereqGraph,
    allChapters,
    getChapter,
    getLessons,
    prereqsSatisfied,
    isChapterMastered,
    isChapterInProgress,
    chapterQuizMastery,
    generatePathPlan
  };
}
