import test from 'node:test';
import assert from 'node:assert/strict';
import { compareOcrBaseline } from '../ocr-baseline.mjs';

test('후보 모델이 더 좋으면 승격한다', () => {
  const result = compareOcrBaseline(
    {
      exactMatchAccuracy: 0.80,
      optionAccuracy: 0.85,
      valueMae: 3
    },
    {
      exactMatchAccuracy: 0.90,
      optionAccuracy: 0.92,
      valueMae: 1.5
    }
  );

  assert.equal(result.improved, true);
  assert.equal(result.decision, 'promote_candidate');
});

test('후보 모델 정확도가 낮으면 기존 모델을 유지한다', () => {
  const result = compareOcrBaseline(
    {
      exactMatchAccuracy: 0.90,
      optionAccuracy: 0.92,
      valueMae: 1
    },
    {
      exactMatchAccuracy: 0.88,
      optionAccuracy: 0.95,
      valueMae: 1
    }
  );

  assert.equal(result.improved, false);
  assert.equal(result.decision, 'keep_previous');
});

test('숫자 오차가 증가하면 기존 모델을 유지한다', () => {
  const result = compareOcrBaseline(
    {
      exactMatchAccuracy: 0.90,
      optionAccuracy: 0.92,
      valueMae: 1
    },
    {
      exactMatchAccuracy: 0.90,
      optionAccuracy: 0.92,
      valueMae: 2
    }
  );

  assert.equal(result.improved, false);
  assert.equal(result.valueMaeDelta, 1);
});

test('MAE가 없는 경우에도 정확도 기준으로 비교한다', () => {
  const result = compareOcrBaseline(
    {
      exactMatchAccuracy: 0.80,
      optionAccuracy: 0.80,
      valueMae: null
    },
    {
      exactMatchAccuracy: 0.85,
      optionAccuracy: 0.85,
      valueMae: null
    }
  );

  assert.equal(result.improved, true);
});
