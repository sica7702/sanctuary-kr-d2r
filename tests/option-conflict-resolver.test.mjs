import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOptionConflict } from '../option-conflict-resolver.mjs';

test('신뢰도 차이가 충분하면 자동 해결 후보가 된다', () => {
  const result = resolveOptionConflict({
    candidates: [
      { option: { optionId: 'FIRE_RESIST', value: 26 }, confidence: 0.95 },
      { option: { optionId: 'FIRE_RESIST', value: 31 }, confidence: 0.6 }
    ]
  });

  assert.equal(result.status, 'auto_resolved');
  assert.equal(result.option.value, 26);
  assert.equal(result.authoritative, false);
});

test('신뢰도 차이가 작으면 사람 검수로 보낸다', () => {
  const result = resolveOptionConflict({
    candidates: [
      { option: { optionId: 'FIRE_RESIST', value: 26 }, confidence: 0.82 },
      { option: { optionId: 'FIRE_RESIST', value: 31 }, confidence: 0.75 }
    ]
  });

  assert.equal(result.status, 'human_review');
  assert.equal(result.reason, 'CONFIDENCE_MARGIN_TOO_SMALL');
});

test('신뢰도가 없으면 자동 해결하지 않는다', () => {
  const result = resolveOptionConflict({
    candidates: [
      { option: { optionId: 'FIRE_RESIST', value: 26 } },
      { option: { optionId: 'FIRE_RESIST', value: 31 } }
    ]
  });

  assert.equal(result.status, 'human_review');
  assert.equal(result.reason, 'CONFIDENCE_MISSING');
});

test('후보가 부족하면 충돌을 해결하지 않는다', () => {
  const result = resolveOptionConflict({
    candidates: [
      { option: { optionId: 'FIRE_RESIST', value: 26 }, confidence: 0.9 }
    ]
  });

  assert.equal(result.status, 'human_review');
  assert.equal(result.reason, 'INSUFFICIENT_CONFLICT_CANDIDATES');
});
