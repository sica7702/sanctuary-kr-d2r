import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelLifecycle } from '../ocr-model-lifecycle.mjs';

test('후보 모델을 활성 모델로 승격한다', () => {
  const lifecycle = createModelLifecycle();

  const result = lifecycle.promote(
    { modelId: 'ocr-v2', version: '2.0.0' },
    { exactMatchAccuracy: 0.95 }
  );

  assert.equal(result.status, 'promoted');
  assert.equal(result.active.modelId, 'ocr-v2');
  assert.equal(lifecycle.getState().active.metrics.exactMatchAccuracy, 0.95);
});

test('승격 시 기존 활성 모델을 이전 모델로 보존한다', () => {
  const lifecycle = createModelLifecycle({
    active: { modelId: 'ocr-v1', version: '1.0.0' }
  });

  lifecycle.promote({ modelId: 'ocr-v2', version: '2.0.0' });

  assert.equal(lifecycle.getState().previous.modelId, 'ocr-v1');
  assert.equal(lifecycle.getState().active.modelId, 'ocr-v2');
});

test('이전 모델로 롤백한다', () => {
  const lifecycle = createModelLifecycle({
    active: { modelId: 'ocr-v1', version: '1.0.0' }
  });

  lifecycle.promote({ modelId: 'ocr-v2', version: '2.0.0' });
  const result = lifecycle.rollback('METRIC_REGRESSION');

  assert.equal(result.status, 'rolled_back');
  assert.equal(result.active.modelId, 'ocr-v1');
});

test('이전 모델이 없으면 롤백하지 않는다', () => {
  const lifecycle = createModelLifecycle();

  const result = lifecycle.rollback();

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'PREVIOUS_MODEL_MISSING');
});
