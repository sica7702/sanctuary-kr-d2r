import test from 'node:test';
import assert from 'node:assert/strict';
import { compareOcrAndMultimodal } from '../multimodal-result-comparator.mjs';

test('OCR과 멀티모달 결과가 완전히 일치하면 verified다', () => {
  const result = compareOcrAndMultimodal(
    {
      text: '화염 저항 +26%',
      optionId: 'FIRE_RESIST',
      value: 26
    },
    {
      text: '화염 저항 +26%',
      optionId: 'FIRE_RESIST',
      value: 26
    }
  );

  assert.equal(result.status, 'verified');
  assert.equal(result.action, 'continue');
});

test('텍스트만 다르고 의미가 같으면 normalized_match다', () => {
  const result = compareOcrAndMultimodal(
    {
      text: '화염저항 +26%',
      optionId: 'FIRE_RESIST',
      value: 26
    },
    {
      text: '화염 저항 +26%',
      optionId: 'FIRE_RESIST',
      value: 26
    }
  );

  assert.equal(result.status, 'normalized_match');
  assert.equal(result.action, 'continue');
});

test('옵션 ID가 다르면 충돌이다', () => {
  const result = compareOcrAndMultimodal(
    {
      text: '화염 저항 +26%',
      optionId: 'FIRE_RESIST',
      value: 26
    },
    {
      text: '냉기 저항 +26%',
      optionId: 'COLD_RESIST',
      value: 26
    }
  );

  assert.equal(result.status, 'conflict');
  assert.equal(result.action, 'human_review');
  assert.ok(result.differences.includes('OPTION_ID_MISMATCH'));
});

test('옵션 수치가 다르면 충돌이다', () => {
  const result = compareOcrAndMultimodal(
    {
      text: '화염 저항 +26%',
      optionId: 'FIRE_RESIST',
      value: 26
    },
    {
      text: '화염 저항 +31%',
      optionId: 'FIRE_RESIST',
      value: 31
    }
  );

  assert.equal(result.status, 'conflict');
  assert.ok(result.differences.includes('OPTION_VALUE_MISMATCH'));
});
