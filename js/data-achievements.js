/* PhysiX Academy — Achievement Catalogue (M2)
 *
 * Centralized definition of all achievements, their XP rewards, and unlock criteria.
 * Pure data — no logic, no side effects.
 *
 * Each achievement has:
 * - id: unique identifier
 * - name: display name
 * - desc: description
 * - icon: emoji/icon
 * - xp: XP awarded on unlock
 * - category: for grouping in UI
 * - criteria: human-readable unlock condition
 * - check: function(state) => boolean (pure predicate)
 *
 * Categories: 'lesson', 'quiz', 'mastery', 'simulation', 'streak', 'milestone', 'special'
 */

const MIN_ANSWERS = 3;
const MASTERY_THRESHOLD = 70;

/* ---------- Lesson-based achievements ---------- */
const LESSON_ACHIEVEMENTS = [
  {
    id: 'first_lesson',
    name: 'First Steps',
    desc: 'Complete your first lesson',
    icon: '👣',
    xp: 50,
    category: 'lesson',
    criteria: 'Complete 1 lesson',
    check: (state) => Object.keys(state.completed || {}).length >= 1
  },
  {
    id: 'five_lessons',
    name: 'Getting Started',
    desc: 'Complete 5 lessons',
    icon: '📚',
    xp: 100,
    category: 'lesson',
    criteria: 'Complete 5 lessons',
    check: (state) => Object.keys(state.completed || {}).length >= 5
  },
  {
    id: 'ten_lessons',
    name: 'Dedicated Student',
    desc: 'Complete 10 lessons',
    icon: '🎓',
    xp: 200,
    category: 'lesson',
    criteria: 'Complete 10 lessons',
    check: (state) => Object.keys(state.completed || {}).length >= 10
  },
  {
    id: 'twenty_five_lessons',
    name: 'Knowledge Seeker',
    desc: 'Complete 25 lessons',
    icon: '🏛️',
    xp: 400,
    category: 'lesson',
    criteria: 'Complete 25 lessons',
    check: (state) => Object.keys(state.completed || {}).length >= 25
  },
  {
    id: 'fifty_lessons',
    name: 'Scholar',
    desc: 'Complete 50 lessons',
    icon: '📖',
    xp: 800,
    category: 'lesson',
    criteria: 'Complete 50 lessons',
    check: (state) => Object.keys(state.completed || {}).length >= 50
  },
  {
    id: 'level1_complete',
    name: 'Foundation Laid',
    desc: 'Complete all Level 1 lessons',
    icon: '🌱',
    xp: 300,
    category: 'lesson',
    criteria: 'Complete all Level 1 lessons',
    check: (state) => {
      // This would need curriculum data - simplified check
      return Object.keys(state.completed || {}).filter((id) => id.startsWith('l1.')).length >= 8;
    }
  },
  {
    id: 'level2_complete',
    name: 'School Foundation Complete',
    desc: 'Complete all Level 2 lessons',
    icon: '🏗️',
    xp: 500,
    category: 'lesson',
    criteria: 'Complete all Level 2 lessons',
    check: (state) => {
      return Object.keys(state.completed || {}).filter((id) => id.startsWith('l2.')).length >= 20;
    }
  }
];

/* ---------- Quiz-based achievements ---------- */
const QUIZ_ACHIEVEMENTS = [
  {
    id: 'first_question',
    name: 'Curious Mind',
    desc: 'Answer your first quiz question',
    icon: '❓',
    xp: 25,
    category: 'quiz',
    criteria: 'Answer 1 question',
    check: (state) => (state.quiz?.history?.length || 0) >= 1
  },
  {
    id: 'ten_questions',
    name: 'Quiz Taker',
    desc: 'Answer 10 questions',
    icon: '📝',
    xp: 50,
    category: 'quiz',
    criteria: 'Answer 10 questions',
    check: (state) => (state.quiz?.history?.length || 0) >= 10
  },
  {
    id: 'fifty_questions',
    name: 'Practice Makes Perfect',
    desc: 'Answer 50 questions',
    icon: '📊',
    xp: 150,
    category: 'quiz',
    criteria: 'Answer 50 questions',
    check: (state) => (state.quiz?.history?.length || 0) >= 50
  },
  {
    id: 'hundred_questions',
    name: 'Quiz Master',
    desc: 'Answer 100 questions',
    icon: '🏆',
    xp: 300,
    category: 'quiz',
    criteria: 'Answer 100 questions',
    check: (state) => (state.quiz?.history?.length || 0) >= 100
  },
  {
    id: 'perfect_session',
    name: 'Flawless',
    desc: 'Score 100% on a practice session (min 5 questions)',
    icon: '✨',
    xp: 100,
    category: 'quiz',
    criteria: 'Score 100% on a practice session (min 5 questions)',
    check: (state) => state.sessions?.some((s) => s.correct === s.total && s.total >= 5) || false
  },
  {
    id: 'streak_correct',
    name: 'On Fire',
    desc: 'Answer 10 questions correctly in a row',
    icon: '🔥',
    xp: 200,
    category: 'quiz',
    criteria: 'Answer 10 questions correctly in a row',
    check: (state) => {
      const history = state.quiz?.history || [];
      let streak = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].correct) streak++;
        else break;
      }
      return streak >= 10;
    }
  },
  {
    id: 'all_difficulties',
    name: 'Well Rounded',
    desc: 'Answer questions at all 4 difficulty levels',
    icon: '🌈',
    xp: 150,
    category: 'quiz',
    criteria: 'Answer questions at beginner, intermediate, advanced, and expert',
    check: (state) => {
      const diffs = new Set((state.quiz?.history || []).map((h) => h.difficulty).filter(Boolean));
      return diffs.size >= 4;
    }
  }
];

/* ---------- Mastery-based achievements ---------- */
const MASTERY_ACHIEVEMENTS = [
  {
    id: 'first_mastery',
    name: 'First Mastery',
    desc: 'Reach 70% mastery in any topic',
    icon: '🎯',
    xp: 100,
    category: 'mastery',
    criteria: 'Reach 70% mastery in any topic',
    check: (state) =>
      Object.values(state.quiz?.perTopic || {}).some(
        (t) => t.total >= MIN_ANSWERS && t.correct / t.total >= 0.7
      )
  },
  {
    id: 'five_masteries',
    name: 'Specialist',
    desc: 'Reach 70% mastery in 5 topics',
    icon: '💎',
    xp: 300,
    category: 'mastery',
    criteria: 'Reach 70% mastery in 5 topics',
    check: (state) =>
      Object.values(state.quiz?.perTopic || {}).filter(
        (t) => t.total >= MIN_ANSWERS && t.correct / t.total >= 0.7
      ).length >= 5
  },
  {
    id: 'ten_masteries',
    name: 'Polymath',
    desc: 'Reach 70% mastery in 10 topics',
    icon: '🧠',
    xp: 600,
    category: 'mastery',
    criteria: 'Reach 70% mastery in 10 topics',
    check: (state) =>
      Object.values(state.quiz?.perTopic || {}).filter(
        (t) => t.total >= MIN_ANSWERS && t.correct / t.total >= 0.7
      ).length >= 10
  },
  {
    id: 'overall_80',
    name: 'Advanced Student',
    desc: 'Reach 80% overall mastery',
    icon: '📈',
    xp: 400,
    category: 'mastery',
    criteria: 'Reach 80% overall mastery',
    check: (state) => {
      const all = Object.values(state.quiz?.perTopic || {});
      if (!all.length) return false;
      let num = 0,
        den = 0;
      for (const p of all) {
        const w = Math.min(p.total, 20);
        num += w * (p.correct / p.total);
        den += w;
      }
      return den ? (100 * num) / den >= 80 : false;
    }
  }
];

/* ---------- Simulation achievements ---------- */
const SIMULATION_ACHIEVEMENTS = [
  {
    id: 'first_sim',
    name: 'Hands On',
    desc: 'Open your first simulation',
    icon: '🔬',
    xp: 50,
    category: 'simulation',
    criteria: 'Open 1 simulation',
    check: (state) => Object.keys(state.sims || {}).length >= 1
  },
  {
    id: 'five_sims',
    name: 'Explorer',
    desc: 'Open 5 different simulations',
    icon: '🧪',
    xp: 150,
    category: 'simulation',
    criteria: 'Open 5 different simulations',
    check: (state) => Object.keys(state.sims || {}).length >= 5
  },
  {
    id: 'ten_sims',
    name: 'Lab Regular',
    desc: 'Open 10 different simulations',
    icon: '⚗️',
    xp: 300,
    category: 'simulation',
    criteria: 'Open 10 different simulations',
    check: (state) => Object.keys(state.sims || {}).length >= 10
  },
  {
    id: 'sim_time',
    name: 'Time Invested',
    desc: 'Spend 30 minutes in simulations total',
    icon: '⏱️',
    xp: 200,
    category: 'simulation',
    criteria: 'Spend 30 minutes in simulations total',
    check: (state) => (state.simTotalMs || 0) >= 30 * 60 * 1000
  }
];

/* ---------- Streak achievements ---------- */
const STREAK_ACHIEVEMENTS = [
  {
    id: 'streak_3',
    name: 'Three-Day Streak',
    desc: 'Learn for 3 days in a row',
    icon: '📅',
    xp: 100,
    category: 'streak',
    criteria: '3-day learning streak',
    check: (state) => (state.streakDays?.length || 0) >= 3
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    desc: 'Learn for 7 days in a row',
    icon: '🗓️',
    xp: 250,
    category: 'streak',
    criteria: '7-day learning streak',
    check: (state) => (state.streakDays?.length || 0) >= 7
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    desc: 'Learn for 30 days in a row',
    icon: '🏅',
    xp: 1000,
    category: 'streak',
    criteria: '30-day learning streak',
    check: (state) => (state.streakDays?.length || 0) >= 30
  }
];

/* ---------- Milestone achievements ---------- */
const MILESTONE_ACHIEVEMENTS = [
  {
    id: 'first_mistake_fixed',
    name: 'Self Correcting',
    desc: 'Fix your first mistake (answer correctly after getting it wrong)',
    icon: '🔧',
    xp: 100,
    category: 'milestone',
    criteria: 'Fix your first mistake',
    check: (state) => (state.mistakesFixed || 0) >= 1
  },
  {
    id: 'five_mistakes_fixed',
    name: 'Persistent',
    desc: 'Fix 5 mistakes',
    icon: '🛠️',
    xp: 300,
    category: 'milestone',
    criteria: 'Fix 5 mistakes',
    check: (state) => (state.mistakesFixed || 0) >= 5
  },
  {
    id: 'path_complete',
    name: 'Pathfinder',
    desc: 'Complete your first learning path chapter',
    icon: '🗺️',
    xp: 200,
    category: 'milestone',
    criteria: 'Complete a learning path chapter with mastery',
    check: (state) => (state.pathChaptersMastered || 0) >= 1
  },
  {
    id: 'review_queue_cleared',
    name: 'Review Champion',
    desc: 'Clear your entire review queue',
    icon: '✅',
    xp: 300,
    category: 'milestone',
    criteria: 'Clear your entire review queue',
    check: (state) => state.reviewQueue?.length === 0 && (state.masteredTopics || 0) > 0
  }
];

/* ---------- Special achievements ---------- */
const SPECIAL_ACHIEVEMENTS = [
  {
    id: 'night_owl',
    name: 'Night Owl',
    desc: 'Complete a lesson after 10 PM',
    icon: '🦉',
    xp: 50,
    category: 'special',
    criteria: 'Complete a lesson after 10 PM',
    check: (state) => state.lastLessonTime && new Date(state.lastLessonTime).getHours() >= 22
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    desc: 'Complete a lesson before 7 AM',
    icon: '🐦',
    xp: 50,
    category: 'special',
    criteria: 'Complete a lesson before 7 AM',
    check: (state) => state.lastLessonTime && new Date(state.lastLessonTime).getHours() < 7
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    desc: 'Complete 5 lessons on a weekend',
    icon: '🌞',
    xp: 100,
    category: 'special',
    criteria: 'Complete 5 lessons on a weekend',
    check: (state) => (state.weekendLessons || 0) >= 5
  }
];

/* ---------- Export all achievements ---------- */
export const ACHIEVEMENTS = [
  ...LESSON_ACHIEVEMENTS,
  ...QUIZ_ACHIEVEMENTS,
  ...MASTERY_ACHIEVEMENTS,
  ...SIMULATION_ACHIEVEMENTS,
  ...STREAK_ACHIEVEMENTS,
  ...MILESTONE_ACHIEVEMENTS,
  ...SPECIAL_ACHIEVEMENTS
];

/* ---------- Category metadata ---------- */
export const ACHIEVEMENT_CATEGORIES = {
  lesson: { name: 'Lessons', icon: '📚', order: 1 },
  quiz: { name: 'Quizzes', icon: '📝', order: 2 },
  mastery: { name: 'Mastery', icon: '🎯', order: 3 },
  simulation: { name: 'Simulations', icon: '🔬', order: 4 },
  streak: { name: 'Streaks', icon: '📅', order: 5 },
  milestone: { name: 'Milestones', icon: '🏆', order: 6 },
  special: { name: 'Special', icon: '✨', order: 7 }
};

/* ---------- XP to level mapping ---------- */
export function xpToLevel(xp) {
  // Exponential curve: level = floor(sqrt(xp / 50)) + 1
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function xpForLevel(level) {
  // XP needed to reach a given level
  return 50 * (level - 1) * (level - 1);
}

export function xpToNextLevel(xp) {
  const currentLevel = xpToLevel(xp);
  const nextLevelXP = xpForLevel(currentLevel + 1);
  return { currentLevel, nextLevelXP, needed: nextLevelXP - xp };
}

/* ---------- Total XP possible ---------- */
export const TOTAL_XP = ACHIEVEMENTS.reduce((sum, a) => sum + a.xp, 0);
