import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditValuationInput,
  preserveValuationResult
} from '../valuation-audit.mjs';

test('가격 판정에 필요한 입력이 모두 있으면 계속 진행한다', () => {
  const audit = auditValuationInput({
    itemType: 'rare',
    source: 'ocr',
    options: [
      { optionId: 'FIRE_RESIST', value: 26 }
    ],
    marketSnapshot: {
      capturedAt: '2026-09-22T12:00:00Z'
    }
  });

  assert.equal(audit.valid, true);
  assert.equal(audit.canEvaluate, true);
  assert.deepEqual(audit.errors, []);
});

test('필수 입력이 없으면 사람 검수로 보낸다', () => {
  const audit = auditValuationInput({
    itemType: 'rare',
    options: []
  });

  const result = preserveValuationResult(audit, { price: 100 });

  assert.equal(audit.valid, false);
  assert.equal(result.action, 'human_review');
  assert.deepEqual(result.result, { price: 100 });
});

test('시세 스냅샷이 없으면 경고 상태로 유지한다', () => {
  const audit = auditValuationInput({
    itemType: 'rare',
    source: 'manual',
    options: [
      { optionId: 'FIRE_RESIST', value: 26 }
    ]
  });

  const result = preserveValuationResult(audit, { price: 100 });

  assert.equal(audit.valid, true);
  assert.equal(audit.canEvaluate, false);
  assert.equal(result.action, 'review_warning');
});

test('알 수 없는 옵션 값은 경고로 기록한다', () => {
  const audit = auditValuationInput({
    itemType: 'rare',
    source: 'ocr',
    options: [
      { optionId: 'FIRE_RESIST', value: null }
    ],
    marketSnapshot: {
      capturedAt: '2026-09-22T12:00:00Z'
    }
  });

  assert.equal(audit.valid, true);
  assert.equal(audit.canEvaluate, false);
  assert.ok(audit.warnings.includes('OPTION_VALUE_UNKNOWN'));
});
