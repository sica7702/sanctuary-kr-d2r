import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOptions } from '../option-normalizer.mjs';

test('동일 옵션의 한글·영문 표기를 하나의 옵션으로 통합한다', () => {
  const result = normalizeOptions([
    { name: '화염 저항', value: 26 },
    { name: 'fire resist', value: 26 }
  ]);

  assert.equal(result.needsReview, false);
  assert.equal(result.normalized.length, 1);
  assert.equal(result.normalized[0].optionId, 'FIRE_RESIST');
  assert.equal(result.normalized[0].value, 26);
});

test('같은 옵션의 값이 다르면 충돌로 분류한다', () => {
  const result = normalizeOptions([
    { name: '화염저항', value: 26 },
    { name: 'Fire Resist', value: 31 }
  ]);

  assert.equal(result.needsReview, true);
  assert.equal(result.normalized.length, 0);
  assert.equal(result.conflicts.length, 1);
  assert.deepEqual(result.conflicts[0].values, [26, 31]);
});

test('알 수 없는 옵션은 자동 통합하지 않는다', () => {
  const result = normalizeOptions([
    { name: '알 수 없는 옵션', value: 5 }
  ]);

  assert.equal(result.needsReview, true);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolved[0].reason, 'OPTION_UNKNOWN');
});

test('중복 옵션의 동일 값은 하나로 정리한다', () => {
  const result = normalizeOptions([
    { name: '번개 저항', value: 20 },
    { name: '번개저항', value: 20 },
    { name: 'lightning resist', value: 20 }
  ]);

  assert.equal(result.conflicts.length, 0);
  assert.equal(result.normalized.length, 1);
  assert.equal(result.normalized[0].value, 20);
});
