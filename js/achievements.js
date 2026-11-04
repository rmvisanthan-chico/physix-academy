/* PhysiX Academy — Achievement Engine (M2)
 *
 * Pure functions over Store.data. No DOM, no rendering, no side effects.
 * Handles XP, achievement unlocking, duplicate prevention, and persistence.
 *
 * Design:
 * - All state in Store.data.achievements: { xp, level, unlocked: {}, counters: {}, processedEvents: [] }
 * - Idempotent event processing via processedEvents log
 * - Safe against repeated events, page reloads, and out-of-order delivery
 * - Integrates with existing Store persistence (localStorage + IndexedDB)
 */
import { Store } from './utils.js';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  xpToLevel,
  xpToNextLevel,
  TOTAL_XP
} from './data-achievements.js';

const ACHIEVEMENTS_VERSION = 2;

/* XP to level helpers (also exported from data-achievements) */
function xpForLevel(level) {
  return 50 * (level - 1) * (level - 1);
}

/* ---------- Default achievements state ---------- */
function defaultAchievements() {
  return {
    version: ACHIEVEMENTS_VERSION,
    xp: 0,
    level: 1,
    unlocked: {}, // achievementId -> { unlockedAt, xpAwarded }
    counters: {}, // for tracking things like mistakesFixed, weekendLessons, etc.
    processedEvents: [], // event hashes to prevent duplicate processing
    history: [] // { achievementId, unlockedAt, xpAwarded }
  };
}

/* ---------- Helpers ---------- */
const hashEvent = (type, payload) => {
  // Simple deterministic hash for event deduplication
  const str = JSON.stringify({ type, ...payload });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
};

/* Check if event was already processed */
function isProcessed(eventHash) {
  const ach = Store.data.achievements || defaultAchievements();
  return ach.processedEvents.includes(eventHash);
}

/* Mark event as processed (keeps last 1000) */
function markProcessed(eventHash) {
  const ach = Store.data.achievements || defaultAchievements();
  if (!ach.processedEvents) ach.processedEvents = [];
  if (!ach.processedEvents.includes(eventHash)) {
    ach.processedEvents.push(eventHash);
    if (ach.processedEvents.length > 1000) ach.processedEvents.shift();
  }
}

/* Ensure achievements state exists and is up to date */
function ensureAchievements() {
  if (!Store.data.achievements) {
    Store.data.achievements = defaultAchievements();
  }
  // Migration from v1
  if (Store.data.achievements.version < ACHIEVEMENTS_VERSION) {
    migrateAchievements(Store.data.achievements);
  }
  return Store.data.achievements;
}

function migrateAchievements(ach) {
  // Add any missing fields
  if (!ach.counters) ach.counters = {};
  if (!ach.processedEvents) ach.processedEvents = [];
  if (!ach.history) ach.history = [];
  ach.version = ACHIEVEMENTS_VERSION;
}

/* ---------- Core unlock logic ---------- */

function unlockAchievement(achievement, xpAwarded) {
  const ach = ensureAchievements();
  const achievementId = achievement.id;

  if (ach.unlocked[achievementId]) {
    return false; // Already unlocked
  }

  ach.unlocked[achievementId] = {
    unlockedAt: Date.now(),
    xpAwarded
  };
  ach.history.push({ achievementId, unlockedAt: Date.now(), xpAwarded });
  ach.xp += xpAwarded;
  ach.level = xpToLevel(ach.xp);
  Store.save();

  return true;
}

function checkAndUnlock(state) {
  const ach = ensureAchievements();
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    if (ach.unlocked[achievement.id]) continue;

    try {
      if (achievement.check(state)) {
        const success = unlockAchievement(achievement, achievement.xp);
        if (success) {
          newlyUnlocked.push({ ...achievement, xpAwarded: achievement.xp });
        }
      }
    } catch (e) {
      console.warn('[Achievements] Check failed for', achievement.id, e);
    }
  }

  return newlyUnlocked;
}

/* ---------- Public API ---------- */

/* Get current achievements state */
export function getAchievementsState() {
  return ensureAchievements();
}

/* Get all achievements with unlock status */
export function getAllAchievements() {
  const ach = ensureAchievements();
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: !!ach.unlocked[a.id],
    unlockedAt: ach.unlocked[a.id]?.unlockedAt || null,
    xpAwarded: ach.unlocked[a.id]?.xpAwarded || a.xp
  }));
}

/* Get achievements grouped by category */
export function getAchievementsByCategory() {
  const all = getAllAchievements();
  const groups = {};

  for (const catKey of Object.keys(ACHIEVEMENT_CATEGORIES).sort(
    (a, b) => ACHIEVEMENT_CATEGORIES[a].order - ACHIEVEMENT_CATEGORIES[b].order
  )) {
    const cat = ACHIEVEMENT_CATEGORIES[catKey];
    groups[catKey] = {
      ...cat,
      achievements: all.filter((a) => a.category === catKey)
    };
  }

  return groups;
}

/* Get recently unlocked achievements (for notifications) */
export function getRecentUnlocks(limit = 5) {
  const ach = ensureAchievements();
  return ach.history
    .slice(-limit)
    .reverse()
    .map((h) => ({ ...ACHIEVEMENTS.find((a) => a.id === h.achievementId), ...h }));
}

/* Get XP and level info */
export function getXPInfo() {
  const ach = ensureAchievements();
  const { currentLevel, nextLevelXP, needed } = xpToNextLevel(ach.xp);
  return {
    xp: ach.xp,
    level: ach.level,
    currentLevel,
    nextLevelXP,
    needed,
    totalXP: TOTAL_XP,
    percentToNext:
      nextLevelXP > 0
        ? Math.min(
            100,
            Math.round(
              (100 * (ach.xp - xpForLevel(currentLevel))) / (nextLevelXP - xpForLevel(currentLevel))
            )
          )
        : 100
  };
}

/* Get unlocked count */
export function getUnlockedCount() {
  const ach = ensureAchievements();
  return Object.keys(ach.unlocked).length;
}

/* ---------- Event processors ---------- */

/* Process a "lesson_complete" event */
export function onLessonComplete(lessonId) {
  const eventHash = hashEvent('lesson_complete', { lessonId });
  if (isProcessed(eventHash)) return [];
  markProcessed(eventHash);

  const ach = ensureAchievements();

  // Update counters
  ach.counters.lessonsCompleted = (ach.counters.lessonsCompleted || 0) + 1;
  ach.counters.lastLessonTime = Date.now();

  // Check for weekend lesson
  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    ach.counters.weekendLessons = (ach.counters.weekendLessons || 0) + 1;
  }

  // Check for early bird / night owl
  const hour = new Date().getHours();
  ach.counters.lastLessonTime = Date.now();

  Store.save();
  return checkAndUnlock(buildState());
}

/* Process a "quiz_answer" event */
export function onQuizAnswer(question, correct, given) {
  const eventHash = hashEvent('quiz_answer', { qid: question.id, correct });
  if (isProcessed(eventHash)) return [];
  markProcessed(eventHash);

  const ach = ensureAchievements();
  ach.counters.questionsAnswered = (ach.counters.questionsAnswered || 0) + 1;
  if (correct) ach.counters.correctAnswers = (ach.counters.correctAnswers || 0) + 1;
  else ach.counters.wrongAnswers = (ach.counters.wrongAnswers || 0) + 1;

  // Track difficulty
  ach.counters.difficulties = ach.counters.difficulties || {};
  ach.counters.difficulties[question.difficulty] =
    (ach.counters.difficulties[question.difficulty] || 0) + 1;

  Store.save();
  return checkAndUnlock(buildState());
}

/* Process a "quiz_session_complete" event */
export function onQuizSessionComplete(session) {
  const eventHash = hashEvent('quiz_session_complete', { sessionId: session.id || Date.now() });
  if (isProcessed(eventHash)) return [];
  markProcessed(eventHash);

  const ach = ensureAchievements();
  ach.counters.sessionsCompleted = (ach.counters.sessionsCompleted || 0) + 1;
  ach.counters.sessions = ach.counters.sessions || [];
  ach.counters.sessions.push({
    correct: session.correct,
    total: session.total,
    timestamp: Date.now()
  });
  if (ach.counters.sessions.length > 50) ach.counters.sessions.shift();

  Store.save();
  return checkAndUnlock(buildState());
}

/* Process a "simulation_open" event */
export function onSimulationOpen(simId) {
  const eventHash = hashEvent('simulation_open', { simId });
  if (isProcessed(eventHash)) return [];
  markProcessed(eventHash);

  const ach = ensureAchievements();
  ach.counters.simulationsOpened = (ach.counters.simulationsOpened || 0) + 1;
  ach.counters.simulations = ach.counters.simulations || {};
  ach.counters.simulations[simId] = (ach.counters.simulations[simId] || 0) + 1;

  Store.save();
  return checkAndUnlock(buildState());
}

/* Process a "mistake_fixed" event */
export function onMistakeFixed(qid) {
  const eventHash = hashEvent('mistake_fixed', { qid });
  if (isProcessed(eventHash)) return [];
  markProcessed(eventHash);

  const ach = ensureAchievements();
  ach.counters.mistakesFixed = (ach.counters.mistakesFixed || 0) + 1;

  Store.save();
  return checkAndUnlock(buildState());
}

/* Process a "streak_updated" event */
export function onStreakUpdated(streakDays) {
  const eventHash = hashEvent('streak_updated', { streakDays });
  if (isProcessed(eventHash)) return [];
  markProcessed(eventHash);

  const ach = ensureAchievements();
  ach.counters.maxStreak = Math.max(ach.counters.maxStreak || 0, streakDays);

  Store.save();
  return checkAndUnlock(buildState());
}

/* Process a "path_chapter_mastered" event */
export function onPathChapterMastered(chapterId) {
  const eventHash = hashEvent('path_chapter_mastered', { chapterId });
  if (isProcessed(eventHash)) return [];
  markProcessed(eventHash);

  const ach = ensureAchievements();
  ach.counters.pathChaptersMastered = (ach.counters.pathChaptersMastered || 0) + 1;

  Store.save();
  return checkAndUnlock(buildState());
}

/* Process a "review_queue_cleared" event */
export function onReviewQueueCleared() {
  const eventHash = hashEvent('review_queue_cleared', {});
  if (isProcessed(eventHash)) return [];
  markProcessed(eventHash);

  const ach = ensureAchievements();
  ach.counters.reviewQueueCleared = (ach.counters.reviewQueueCleared || 0) + 1;

  Store.save();
  return checkAndUnlock(buildState());
}

/* ---------- State builder for checks ---------- */

function buildState() {
  const data = Store.data || {};
  return {
    completed: data.completed || {},
    quiz: data.quiz || {},
    sims: data.sims || {},
    streakDays: data.streakDays || [],
    lastLesson: data.lastLesson,
    path: data.path || {},
    mistakesFixed: data.achievements?.counters?.mistakesFixed || 0,
    pathChaptersMastered: data.achievements?.counters?.pathChaptersMastered || 0,
    reviewQueue: data.path
      ? data.path.steps?.filter((s) => s.status === 'weak' || s.status === 'review').length || 0
      : 0,
    masteredTopics: Object.values(data.quiz?.perTopic || {}).filter(
      (t) => t.total >= 3 && t.correct / t.total >= 0.7
    ).length,
    lastLessonTime: data.achievements?.counters?.lastLessonTime,
    weekendLessons: data.achievements?.counters?.weekendLessons,
    sessions: data.achievements?.counters?.sessions
  };
}

/* ---------- Full recomputation (for migration/recovery) ---------- */

export function recomputeAll() {
  const ach = ensureAchievements();
  // Clear unlocks but keep processed events and counters
  ach.unlocked = {};
  ach.history = [];
  ach.xp = 0;
  ach.level = 1;

  const state = buildState();
  const newlyUnlocked = checkAndUnlock(state);
  Store.save();
  return newlyUnlocked;
}

/* ---------- Debug / Testing ---------- */

export function _internals() {
  return {
    hashEvent,
    isProcessed,
    markProcessed,
    ensureAchievements,
    unlockAchievement,
    checkAndUnlock,
    buildState,
    defaultAchievements,
    ACHIEVEMENTS,
    ACHIEVEMENT_CATEGORIES,
    xpToLevel,
    xpForLevel: (l) => 50 * (l - 1) * (l - 1),
    xpToNextLevel
  };
}
