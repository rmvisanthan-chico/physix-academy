/* Quiz bank schema tests — validates QUIZ_BANK structure and content.
 * Uses a regex-based extraction approach because data-quiz-a.js imports
 * browser-dependent modules. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* Extract all `{id: '...', topic: '...', difficulty: '...', ...}` blocks from the
 * three quiz data files by parsing the QUIZ_BANK push calls. */
function extractQuizQuestions() {
  const questions = [];
  for (const f of ['js/data-quiz-a.js', 'js/data-quiz-b.js', 'js/data-quiz-c.js']) {
    const src = readFileSync(resolve(ROOT, f), 'utf8');
    /* Match id, topic, difficulty for each question entry */
    const idRegex = /\bid:\s*'([^']+)'/g;
    const entries = src.split(/(?=\{[^{]*\bid:)/);
    for (const entry of entries) {
      const idMatch = entry.match(/\bid:\s*'([^']+)'/);
      const topicMatch = entry.match(/\btopic:\s*'([^']+)'/);
      const diffMatch = entry.match(/\bdifficulty:\s*'([^']+)'/);
      const choicesMatch = entry.match(/\bchoices:\s*\[/);
      const answerMatch = entry.match(/\banswer:\s*(\d+)/);
      if (idMatch && topicMatch && diffMatch) {
        questions.push({
          id: idMatch[1],
          topic: topicMatch[1],
          difficulty: diffMatch[1],
          hasChoices: !!choicesMatch,
          hasAnswer: !!answerMatch,
          answer: answerMatch ? parseInt(answerMatch[1], 10) : null
        });
      }
    }
  }
  return questions;
}

describe('QUIZ_BANK schema', () => {
  const questions = extractQuizQuestions();

  test('has a substantial number of questions', () => {
    assert.ok(questions.length >= 50, `expected 50+ questions, got ${questions.length}`);
  });

  test('all question ids are unique', () => {
    const ids = questions.map((q) => q.id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, 'duplicate question ids found');
  });

  test('all difficulties are valid', () => {
    const valid = ['beginner', 'intermediate', 'advanced', 'expert'];
    for (const q of questions) {
      assert.ok(
        valid.includes(q.difficulty),
        `question ${q.id} has invalid difficulty "${q.difficulty}"`
      );
    }
  });

  test('all answers are valid indices', () => {
    for (const q of questions) {
      if (q.hasAnswer) {
        assert.ok(
          q.answer >= 0 && q.answer <= 3,
          `question ${q.id} has invalid answer index ${q.answer}`
        );
      }
    }
  });

  test('all questions have a non-empty topic', () => {
    for (const q of questions) {
      assert.ok(q.topic.length > 0, `question ${q.id} has empty topic`);
    }
  });
});
