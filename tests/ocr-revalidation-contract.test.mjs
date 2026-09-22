import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contract = fs.readFileSync('docs/OCR-REVALIDATION-CONTRACT.md', 'utf8');

test('OCR 재검증 계약의 핵심 단계가 정의되어 있다', () => {
  for (const keyword of [
    '기본 OCR',
    '실패·불확실성 감지',
    '로컬 멀티모달 재검증',
    '사람 확정',
    '학습 데이터 후보'
  ]) {
    assert.ok(contract.includes(keyword), keyword);
  }
});

test('OCR 실패 코드와 멀티모달 상태가 정의되어 있다', () => {
  for (const keyword of [
    'OCR_EMPTY',
    'OCR_LOW_CONFIDENCE',
    'OCR_VALUE_UNCERTAIN',
    'verified',
    'corrected',
    'conflict',
    'abstain',
    'error'
  ]) {
    assert.ok(contract.includes(keyword), keyword);
  }
});

test('학습 데이터 보호 원칙이 정의되어 있다', () => {
  assert.ok(contract.includes('검증되지 않은 레코드는 자동 학습에 사용하지 않는다.'));
  assert.ok(contract.includes('원본 이미지와 원본 OCR은 삭제하지 않는다.'));
});
