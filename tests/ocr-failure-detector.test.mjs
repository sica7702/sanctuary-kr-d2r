import test from 'node:test';
import assert from 'node:assert/strict';
import { detectOcrFailures, FAILURE_CODES } from '../ocr-failure-detector.mjs';

test('정상 OCR은 멀티모달 재검증이 필요하지 않다', () => {
  const result = detectOcrFailures({
    imagePresent: true,
    text: '화염 저항 +26%',
    confidence: 0.98,
    options: [{ status: 'known', valueUncertain: false }]
  });

  assert.equal(result.needsMultimodal, false);
  assert.deepEqual(result.failureCodes, []);
});

test('이미지 누락과 빈 OCR은 재검증 대상으로 분류된다', () => {
  const result = detectOcrFailures({
    imagePresent: false,
    text: ''
  });

  assert.equal(result.needsMultimodal, true);
  assert.ok(result.failureCodes.includes(FAILURE_CODES.IMAGE_MISSING));
  assert.ok(result.failureCodes.includes(FAILURE_CODES.OCR_EMPTY));
});

test('낮은 신뢰도와 불확실 옵션을 감지한다', () => {
  const result = detectOcrFailures({
    imagePresent: true,
    text: '화염 저항',
    confidence: 0.42,
    options: [
      { status: 'unknown', valueUncertain: true }
    ]
  });

  assert.equal(result.needsMultimodal, true);
  assert.ok(result.failureCodes.includes(FAILURE_CODES.OCR_LOW_CONFIDENCE));
  assert.ok(result.failureCodes.includes(FAILURE_CODES.OCR_OPTION_UNKNOWN));
  assert.ok(result.failureCodes.includes(FAILURE_CODES.OCR_VALUE_UNCERTAIN));
});
