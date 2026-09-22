import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeReviewedSamples,
  evolveCorrection
} from '../statistical-evolution.mjs';

test('검수 표본의 통계값을 계산한다', () => {
  const summary = summarizeReviewedSamples([
    { approved: true, value: 20 },
    { approved: true, value: 30 },
    { approved: true, value: 40 },
    { approved: false, value: 100 },
    { approved: true, value: 50 },
    { approved: true, value: 60 }
  ]);

  assert.equal(summary.sampleCount, 5);
  assert.equal(summary.mean, 40);
  assert.equal(summary.median, 40);
  assert.equal(summary.min, 20);
  assert.equal(summary.max, 60);
});

test('표본이 부족하면 보정하지 않는다', () => {
  const result = evolveCorrection(
    30,
    { sampleCount: 4, median: 40, mean: 40 },
    { minSamples: 5 }
  );

  assert.equal(result.status, 'insufficient_data');
  assert.equal(result.score, 30);
  assert.equal(result.correction, 0);
});

test('충분한 표본이 있으면 보정 후보를 생성한다', () => {
  const result = evolveCorrection(
    30,
    { sampleCount: 10, median: 40, mean: 42 },
    { minSamples: 5, learningRate: 0.1 }
  );

  assert.equal(result.status, 'candidate');
  assert.equal(result.score, 31);
  assert.equal(result.correction, 1);
  assert.equal(result.authoritative, false);
});

test('승인되지 않은 표본은 통계에 포함하지 않는다', () => {
  const summary = summarizeReviewedSamples([
    { approved: false, value: 100 },
    { approved: false, value: 200 }
  ]);

  assert.equal(summary.sampleCount, 0);
  assert.equal(summary.mean, null);
  assert.equal(summary.median, null);
});
