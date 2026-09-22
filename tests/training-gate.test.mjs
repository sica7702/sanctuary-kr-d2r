import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTrainingGate } from '../training-gate.mjs';

test('충분한 표본과 정확도면 승격 후보가 된다', () => {
  const result = evaluateTrainingGate({
    sampleCount: 100,
    metrics: {
      exactMatchAccuracy: 0.95,
      optionAccuracy: 0.94
    },
    hasUnresolvedConflicts: false
  });

  assert.equal(result.status, 'eligible');
  assert.equal(result.action, 'promote_training_candidate');
  assert.deepEqual(result.errors, []);
});

test('표본이 부족하면 승격을 차단한다', () => {
  const result = evaluateTrainingGate({
    sampleCount: 5,
    metrics: {
      exactMatchAccuracy: 0.99,
      optionAccuracy: 0.99
    }
  });

  assert.equal(result.status, 'blocked');
  assert.ok(result.errors.includes('INSUFFICIENT_TRAINING_SAMPLES'));
});

test('정확도가 낮으면 기존 모델을 유지한다', () => {
  const result = evaluateTrainingGate({
    sampleCount: 100,
    metrics: {
      exactMatchAccuracy: 0.8,
      optionAccuracy: 0.95
    }
  });

  assert.equal(result.status, 'blocked');
  assert.ok(result.errors.includes('EXACT_ACCURACY_BELOW_THRESHOLD'));
});

test('미해결 충돌이 있으면 승격하지 않는다', () => {
  const result = evaluateTrainingGate({
    sampleCount: 100,
    metrics: {
      exactMatchAccuracy: 0.95,
      optionAccuracy: 0.95
    },
    hasUnresolvedConflicts: true
  });

  assert.equal(result.status, 'blocked');
  assert.ok(result.errors.includes('UNRESOLVED_CONFLICTS'));
});
