import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOcrPredictions, meetsOcrBaseline } from '../ocr-training-evaluator.mjs';

test('OCR 평가 지표를 계산한다', () => {
  const metrics = evaluateOcrPredictions([
    {
      prediction: { text: '화염 저항 +26%', optionId: 'FIRE_RESIST', value: 26 },
      label: { text: '화염 저항 +26%', optionId: 'FIRE_RESIST', value: 26 }
    },
    {
      prediction: { text: '냉기 저항 +20%', optionId: 'COLD_RESIST', value: 19 },
      label: { text: '냉기 저항 +20%', optionId: 'COLD_RESIST', value: 20 }
    },
    {
      prediction: { text: '알 수 없음', optionId: 'UNKNOWN', value: 1 },
      label: { text: '번개 저항 +30%', optionId: 'LIGHTNING_RESIST', value: 30 }
    }
  ]);

  assert.equal(metrics.sampleCount, 3);
  assert.equal(metrics.exactMatchAccuracy, 2 / 3);
  assert.equal(metrics.optionAccuracy, 2 / 3);
  assert.equal(metrics.valueMae, 10 / 3);
});

test('기준을 만족하면 통과한다', () => {
  const metrics = {
    exactMatchAccuracy: 0.95,
    optionAccuracy: 0.98,
    valueMae: 0.5
  };

  assert.equal(meetsOcrBaseline(metrics, {
    exactMatchAccuracy: 0.9,
    optionAccuracy: 0.95,
    maxValueMae: 1
  }), true);
});

test('기준에 미달하면 통과하지 못한다', () => {
  const metrics = {
    exactMatchAccuracy: 0.7,
    optionAccuracy: 0.8,
    valueMae: 3
  };

  assert.equal(meetsOcrBaseline(metrics, {
    exactMatchAccuracy: 0.9,
    optionAccuracy: 0.95,
    maxValueMae: 1
  }), false);
});

