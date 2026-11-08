/* PhysiX Academy — Adaptive Assessment Engine (M3)
 *
 * Pure functions over Store.data + question metadata.
 * Implements IRT-inspired adaptive question selection with:
 * - Ability estimation (theta) per topic
 * - Adaptive difficulty selection based on demonstrated understanding
 * - Misconception identification
 * - Detailed assessment reports with recommendations
 * - Integration with mastery engine, learning path, and achievements
 */

import { Store } from './utils.js';
import { QUIZ_BANK } from './data-quiz-a.js';
import {
  getQuestionMeta,
  getAllMetadata,
  ASSESSMENT_SKILLS,
  DIFFICULTY_CALIBRATION
} from './data-quiz-meta.js';

const ASSESSMENT_VERSION = 1;

/* ---------- IRT-inspired ability estimation ---------- */

/* 2PL model: P(correct|theta) = c + (1-c) / (1 + exp(-a*(theta - b)))
 * Simplified: a=discriminability, b=difficulty, c=guessing (0.25 for 4-choice) */
const GUESSING = 0.25;

function itemResponse(theta, item) {
  const a = item.discriminability || 0.5;
  const b = item.difficulty || 0;
  const c = GUESSING;
  return c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
}

function itemInformation(theta, item) {
  const a = item.discriminability || 0.5;
  const p = itemResponse(theta, item);
  const q = 1 - p;
  const c = GUESSING;
  return (((a * a * (p - c) * (p - c)) / (1 - c) / (1 - c)) * q) / p;
}

/* Fisher information for next item selection */
function expectedInformation(theta, item) {
  return itemInformation(theta, item);
}

/* ---------- State management ---------- */

function defaultAssessmentState() {
  return {
    version: ASSESSMENT_VERSION,
    ability: {}, // topic -> { theta, answered, updatedAt }
    sessions: [], // completed assessment sessions
    currentSession: null, // in-progress session
    processedEvents: [] // for deduplication
  };
}

function migrateAssessment(state) {
  if (!state.ability) state.ability = {};
  if (!state.sessions) state.sessions = [];
  if (!state.processedEvents) state.processedEvents = [];
  state.version = ASSESSMENT_VERSION;
}

/* ---------- Ability estimation ---------- */

/* Bayesian update of theta given response */
function updateTheta(priorTheta, priorVar, item, correct) {
  /* Simplified Bayesian update using Fisher information */
  const a = item.discriminability || 0.5;
  const p = itemResponse(priorTheta, item);
  const info = itemInformation(priorTheta, item);

  /* Posterior precision = prior precision + item information */
  const priorPrec = 1 / priorVar;
  const postPrec = priorPrec + info;
  const postVar = 1 / postPrec;

  /* Score = 1 if correct, 0 if incorrect (adjusted for guessing) */
  const c = GUESSING;
  const score = correct ? 1 : 0;
  const adjustedScore = (score - c) / (1 - c);

  /* Posterior mean */
  const postMean = (priorTheta / priorVar + a * (adjustedScore - p) * info) / postPrec;

  return { theta: postMean, variance: postVar };
}

/* Estimate initial theta for a topic from existing data */
function estimateInitialTheta(topic) {
  const data = Store.data.quiz?.perTopic?.[topic];
  if (!data || data.total < 3) return 0; // neutral prior

  const pct = data.correct / data.total;
  /* Convert percentage to theta using inverse IRT */
  const adjusted = Math.max(0.01, Math.min(0.99, (pct - GUESSING) / (1 - GUESSING)));
  const theta = Math.log(adjusted / (1 - adjusted)); // logit
  return Math.max(-3, Math.min(3, theta));
}

/* ---------- Question selection ---------- */

/* Get candidate questions for a topic at a given difficulty */
function getCandidateQuestions(topic, targetTheta, excludeIds = []) {
  const meta = getAllMetadata();
  return Object.entries(meta)
    .filter(([qid, m]) => m.topic === topic && !excludeIds.includes(qid))
    .map(([qid, m]) => {
      const question = QUIZ_BANK.find((q) => q.id === qid);
      if (!question) return null;

      const diffCal = DIFFICULTY_CALIBRATION[question.difficulty] || { theta: 0, weight: 0.5 };
      return {
        ...question,
        metadata: m,
        difficultyTheta: diffCal.theta,
        discriminability: m.discriminability || 0.5
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      /* Prefer items with maximum information at current theta */
      const infoA = expectedInformation(targetTheta, a);
      const infoB = expectedInformation(targetTheta, b);
      return infoB - infoA;
    });
}

/* Select next adaptive question */
export function selectNextQuestion(session) {
  const targetTopic = session.targetTopic;
  const currentTheta = session.abilityTheta;
  const answeredIds = session.items.map((i) => i.qid);

  const candidates = getCandidateQuestions(targetTopic, currentTheta, answeredIds);
  if (!candidates.length) return null;

  /* Return the most informative question */
  return candidates[0];
}

/* Select multiple questions for a fixed-length assessment */
export function selectAssessmentQuestions(targetTopic, numQuestions = 10) {
  const items = [];
  let theta = estimateInitialTheta(targetTopic);
  const answeredIds = [];

  for (let i = 0; i < numQuestions; i++) {
    const candidates = getCandidateQuestions(targetTopic, theta, answeredIds);
    if (!candidates.length) break;

    const next = candidates[0];
    items.push({ qid: next.id, metadata: next.metadata, difficultyTheta: next.difficultyTheta });
    answeredIds.push(next.id);

    /* Simulate expected response to update theta for next selection
     * We assume 70% success rate for adaptive targeting */
    const pCorrect = itemResponse(theta, {
      discriminability: next.metadata.discriminability,
      difficulty: next.difficultyTheta
    });
    const simulatedCorrect = pCorrect > 0.5;
    const updated = updateTheta(
      theta,
      1.0,
      { discriminability: next.metadata.discriminability, difficulty: next.difficultyTheta },
      simulatedCorrect
    );
    theta = updated.theta;
  }

  return { items, initialTheta: estimateInitialTheta(targetTopic) };
}

/* ---------- Session management ---------- */

export function startAssessment(targetTopic, numQuestions = 10) {
  const assessment = getAssessmentState();
  const initialTheta = estimateInitialTheta(targetTopic);

  const { items } = selectAssessmentQuestions(targetTopic, numQuestions);

  const session = {
    id: `assess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
    targetTopic,
    items: items.map((item, i) => ({
      index: i,
      qid: item.qid,
      metadata: item.metadata,
      difficultyTheta: item.difficultyTheta,
      answered: false,
      correct: null,
      given: null,
      timeMs: 0,
      startedAt: 0
    })),
    responses: [],
    abilityTheta: initialTheta,
    abilityVar: 1.0,
    abilityBefore: initialTheta,
    abilityAfter: null,
    diagnosis: [],
    completed: false
  };

  assessment.currentSession = session;
  Store.save();
  return session;
}

export function getCurrentSession() {
  const assessment = getAssessmentState();
  return assessment.currentSession;
}

export function submitAnswer(qid, givenIndex, timeMs) {
  const assessment = getAssessmentState();
  const session = assessment.currentSession;
  if (!session || session.completed) return { error: 'No active session' };

  const item = session.items.find((i) => i.qid === qid);
  if (!item) return { error: 'Question not in session' };
  if (item.answered) return { error: 'Already answered' };

  const question = QUIZ_BANK.find((q) => q.id === qid);
  if (!question) return { error: 'Question not found' };

  const correct = givenIndex === question.answer;
  const metadata = getQuestionMeta(qid);

  item.answered = true;
  item.correct = correct;
  item.given = givenIndex;
  item.timeMs = timeMs;

  session.responses.push({
    qid,
    given: givenIndex,
    correct,
    timeMs,
    metadata,
    difficultyTheta: item.difficultyTheta
  });

  /* Update ability estimate */
  const itemMeta = {
    discriminability: metadata.discriminability,
    difficulty: item.difficultyTheta
  };
  const updated = updateTheta(session.abilityTheta, session.abilityVar, itemMeta, correct);
  session.abilityTheta = updated.theta;
  session.abilityVar = updated.variance;

  /* Track misconceptions */
  if (!correct && metadata.misconception) {
    session.diagnosis.push({
      topic: question.topic,
      misconception: metadata.misconception,
      question: qid,
      given: givenIndex
    });
  }

  Store.save();
  return { correct, question };
}

export function finishAssessment() {
  const assessment = getAssessmentState();
  const session = assessment.currentSession;
  if (!session || session.completed) return null;

  session.completed = true;
  session.endedAt = Date.now();
  session.abilityAfter = session.abilityTheta;

  /* Final diagnosis */
  const diagnosis = generateDiagnosis(session);
  session.diagnosis = diagnosis;

  /* Move to history */
  assessment.sessions.push({
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    targetTopic: session.targetTopic,
    items: session.items.map((i) => ({
      qid: i.qid,
      correct: i.correct,
      given: i.given,
      timeMs: i.timeMs
    })),
    responses: session.responses,
    abilityBefore: session.abilityBefore,
    abilityAfter: session.abilityAfter,
    diagnosis
  });

  assessment.currentSession = null;
  Store.save();

  /* Trigger achievement event */
  Store.emit('assessment_complete', { session, diagnosis });

  return session;
}

/* ---------- Diagnostic generation ---------- */

function generateDiagnosis(session) {
  const diagnosis = [];
  const topic = session.targetTopic;
  const items = session.responses;
  const correctCount = items.filter((r) => r.correct).length;
  const total = items.length;

  if (!total) return diagnosis;

  const pct = Math.round((100 * correctCount) / total);

  /* Overall performance */
  diagnosis.push({
    type: 'overall',
    topic,
    performance: pct,
    message:
      pct >= 80 ? 'Strong understanding' : pct >= 60 ? 'Developing understanding' : 'Needs review'
  });

  /* Skill breakdown */
  const skillStats = {};
  for (const r of items) {
    const skill = r.metadata?.skill || 'conceptual';
    if (!skillStats[skill]) skillStats[skill] = { correct: 0, total: 0 };
    skillStats[skill].total++;
    if (r.correct) skillStats[skill].correct++;
  }

  for (const [skill, stats] of Object.entries(skillStats)) {
    const skillPct = Math.round((100 * stats.correct) / stats.total);
    if (skillPct < 70) {
      diagnosis.push({
        type: 'skill_gap',
        topic,
        skill,
        performance: skillPct,
        message: `Weak ${ASSESSMENT_SKILLS[skill]} (${skillPct}%)`
      });
    }
  }

  /* Misconceptions */
  const misconceptions = [
    ...new Set(session.diagnosis.map((d) => d.misconception).filter(Boolean))
  ];
  for (const m of misconceptions) {
    diagnosis.push({
      type: 'misconception',
      topic,
      misconception: m,
      message: `Common misconception detected: ${m}`
    });
  }

  /* Difficulty analysis */
  const byDifficulty = {};
  for (const r of items) {
    const diff = r.metadata?.difficulty || 'beginner';
    if (!byDifficulty[diff]) byDifficulty[diff] = { correct: 0, total: 0 };
    byDifficulty[diff].total++;
    if (r.correct) byDifficulty[diff].correct++;
  }

  for (const [diff, stats] of Object.entries(byDifficulty)) {
    const diffPct = Math.round((100 * stats.correct) / stats.total);
    if (diffPct < 60) {
      diagnosis.push({
        type: 'difficulty_gap',
        topic,
        difficulty: diff,
        performance: diffPct,
        message: `Struggling with ${diff} questions (${diffPct}%)`
      });
    }
  }

  /* Time analysis */
  const avgTime = items.reduce((sum, r) => sum + (r.timeMs || 0), 0) / items.length;
  if (avgTime > 60000) {
    diagnosis.push({
      type: 'timing',
      topic,
      avgTimeMs: avgTime,
      message: 'Taking longer than typical on questions — consider reviewing fundamentals'
    });
  }

  return diagnosis;
}

/* ---------- Public API ---------- */

export function getAssessmentState() {
  if (!Store.data.assessment) {
    Store.data.assessment = defaultAssessmentState();
  }
  if (Store.data.assessment.version < ASSESSMENT_VERSION) {
    migrateAssessment(Store.data.assessment);
  }
  return Store.data.assessment;
}

export function getAbility(topic) {
  const state = getAssessmentState();
  return state.ability[topic] || { theta: estimateInitialTheta(topic), answered: 0 };
}

export function getAssessmentHistory(topic = null) {
  const state = getAssessmentState();
  if (topic) return state.sessions.filter((s) => s.targetTopic === topic);
  return state.sessions;
}

export function getSessionReport(sessionId) {
  const state = getAssessmentState();
  return state.sessions.find((s) => s.id === sessionId) || null;
}

export function getTopicDiagnosis(topic) {
  const state = getAssessmentState();
  const sessions = state.sessions.filter((s) => s.targetTopic === topic);
  if (!sessions.length) return { topic, sessions: 0, diagnosis: [] };

  const latest = sessions[sessions.length - 1];
  return {
    topic,
    sessions: sessions.length,
    latestSession: latest.id,
    ability: { theta: latest.abilityAfter, updatedAt: latest.endedAt },
    diagnosis: latest.diagnosis
  };
}

export function getRecommendations(topic) {
  const diag = getTopicDiagnosis(topic);
  if (!diag.sessions) return [];

  const recs = [];
  for (const d of diag.diagnosis) {
    if (d.type === 'misconception') {
      recs.push({ type: 'review', topic: d.topic, reason: d.message, priority: 'high' });
    } else if (d.type === 'skill_gap') {
      recs.push({
        type: 'practice',
        topic: d.topic,
        skill: d.skill,
        reason: `Improve ${ASSESSMENT_SKILLS[d.skill]}`,
        priority: 'high'
      });
    } else if (d.type === 'difficulty_gap') {
      recs.push({
        type: 'practice',
        topic: d.topic,
        difficulty: d.difficulty,
        reason: `Strengthen ${d.difficulty} questions`,
        priority: 'medium'
      });
    }
  }

  /* Check mastery engine for related weak topics */
  const mastery = topicMastery(topic);
  if (mastery && mastery.provisional) {
    recs.push({
      type: 'more_practice',
      topic,
      reason: 'Need more answers for reliable mastery estimate',
      priority: 'medium'
    });
  } else if (mastery && mastery.pct < 70) {
    recs.push({ type: 'review', topic, reason: `Mastery at ${mastery.pct}%`, priority: 'high' });
  }

  return recs;
}

/* ---------- Integration hooks ---------- */

export function onAssessmentComplete(session, diagnosis) {
  /* Award M2 achievements */
  // The achievements engine listens for 'assessment_complete' event
}

export function _internals() {
  return {
    itemResponse,
    itemInformation,
    expectedInformation,
    updateTheta,
    estimateInitialTheta,
    getCandidateQuestions,
    selectNextQuestion,
    selectAssessmentQuestions,
    generateDiagnosis,
    estimateInitialTheta,
    getAssessmentState
  };
}

/* Import for internal use */
import { topicMastery } from './mastery.js';
