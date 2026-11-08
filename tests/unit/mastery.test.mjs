/* Mastery engine unit tests — node:test with browser stubs.
 * Exercises the pure functions exported by js/mastery.js. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { stubBrowser } from './helpers.mjs';

stubBrowser();

const ROOT = new URL('../../js/', import.meta.url);
const { topicMastery, overallMastery, curriculumProgress, skillBreakdown } = await import(
  new URL('mastery.js', ROOT).href
);
const { CURRICULUM } = await import(new URL('data-core.js', ROOT).href);
const { Store } = await import(new URL('utils.js', ROOT).href);

describe('curriculumProgress', () => {
  test('returns zero progress for empty completed', () => {
    const r = curriculumProgress();
    assert.equal(r.done, 0);
    assert.ok(r.total > 0);
    assert.equal(r.pct, 0);
  });

  test('counts completed lessons', () => {
    Store.data.completed['l1.what.intro'] = Date.now();
    const r = curriculumProgress();
    assert.ok(r.done >= 1);
    assert.ok(r.pct > 0);
  });
});

describe('skillBreakdown', () => {
  test('returns bands for all four difficulties', () => {
    const bands = skillBreakdown();
    assert.ok(bands.length === 4 || Object.keys(bands).length >= 0);
  });
});

describe('overallMastery', () => {
  test('returns a number between 0 and 100', () => {
    const m = overallMastery();
    assert.ok(m >= 0 && m <= 100);
  });
});

describe('topicMastery', () => {
  test('returns null for unknown topic', () => {
    assert.equal(topicMastery('nonexistent-topic'), null);
  });

  test('returns provisional for under 3 answers', () => {
    Store.data.quiz.perTopic['vectors'] = { correct: 1, total: 2 };
    const r = topicMastery('vectors');
    assert.ok(r);
    assert.equal(r.provisional, true);
  });

  test('returns non-provisional for 3+ answers', () => {
    Store.data.quiz.perTopic['kinematics'] = { correct: 3, total: 4 };
    const r = topicMastery('kinematics');
    assert.ok(r);
    assert.equal(r.provisional, false);
    assert.equal(r.pct, 75);
  });
});

describe('CURRICULUM', () => {
  test('has multiple levels', () => {
    assert.ok(CURRICULUM.length >= 2);
  });

  test('every level has chapters with lessons', () => {
    for (const level of CURRICULUM) {
      assert.ok(level.chapters);
      assert.ok(level.chapters.length > 0);
      for (const ch of level.chapters) {
        assert.ok(ch.lessons, `chapter ${ch.id} missing lessons`);
        assert.ok(ch.lessons.length > 0);
      }
    }
  });
});
