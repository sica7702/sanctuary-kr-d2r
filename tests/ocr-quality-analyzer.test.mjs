import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeOcrQuality } from '../ocr-quality-analyzer.mjs';

test('정상 OCR은 높은 품질로 분류한다', () => {
  const result = analyzeOcrQuality({
    imagePresent: true,
    text: '화염 저항 +26%',
    confidence: 0.98,
    options: [
      { optionId: 'FIRE_RESIST', value: 26 }
    ]
  });

  assert.equal(result.quality, 'high');
  assert.equal(result.needsMultimodal, false);
  assert.deepEqual(result.failures, []);
});

test('낮은 신뢰도는 멀티모달 대상으로 분류한다', () => {
  const result = analyzeOcrQuality({
    imagePresent: true,
    text: '화염 저항',
    confidence: 0.4,
    options: [
      { optionId: 'FIRE_RESIST', value: 26 }
    ]
  });

  assert.equal(result.quality, 'low');
  assert.equal(result.needsMultimodal, true);
  assert.ok(result.failures.includes('OCR_LOW_CONFIDENCE'));
});

test('옵션 수치가 범위를 벗어나면 실패 처리한다', () => {
  const result = analyzeOcrQuality({
    imagePresent: true,
    text: '화염 저항 +5000%',
    confidence: 0.95,
    options: [
      { optionId: 'FIRE_RESIST', value: 5000 }
    ]
  });

  assert.equal(result.quality, 'low');
  assert.ok(result.failures.includes('OPTION_NUMERIC_VALUE_OUT_OF_RANGE'));
});

test('옵션 수치가 없으면 경고로 분류한다', () => {
  const result = analyzeOcrQuality({
    imagePresent: true,
    text: '화염 저항',
    confidence: 0.95,
    options: [
      { optionId: 'FIRE_RESIST' }
    ]
  });

  assert.equal(result.quality, 'medium');
  assert.equal(result.needsMultimodal, false);
  assert.ok(result.warnings.includes('OPTION_NUMERIC_VALUE_MISSING'));
});

test('이미지와 OCR 결과가 없으면 낮은 품질로 분류한다', () => {
  const result = analyzeOcrQuality({
    imagePresent: false,
    text: '',
    confidence: null,
    options: []
  });

  assert.equal(result.quality, 'low');
  assert.equal(result.needsMultimodal, true);
  assert.ok(result.failures.includes('IMAGE_MISSING'));
});
