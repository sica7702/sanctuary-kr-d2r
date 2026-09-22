import test from 'node:test';
import assert from 'node:assert/strict';
import { promoteReviewToTraining } from '../training-promotion.mjs';

const record = {
  imageHash: 'sha256:ring-001',
  ocrResult: { text: '화염 저항 +26%' },
  humanLabel: { optionId: 'FIRE_RESIST', value: 26 }
};

test('자동 승인 결과는 학습 후보로 승격한다', () => {
  const result = promoteReviewToTraining(
    { decision: 'auto_accept' },
    record
  );

  assert.equal(result.status, 'promoted');
  assert.equal(result.datasetStatus, 'train_candidate');
  assert.equal(result.record.labelSource, 'verified_pipeline');
});

test('정규화 승인은 학습 후보로 승격한다', () => {
  const result = promoteReviewToTraining(
    { decision: 'accept_normalized' },
    record
  );

  assert.equal(result.status, 'promoted');
});

test('관리자 확정은 관리자 라벨로 기록한다', () => {
  const result = promoteReviewToTraining(
    { decision: 'human_verified' },
    record
  );

  assert.equal(result.status, 'promoted');
  assert.equal(result.record.labelSource, 'admin_review');
});

test('충돌 검수는 학습에서 제외한다', () => {
  const result = promoteReviewToTraining(
    { decision: 'human_review' },
    record
  );

  assert.equal(result.status, 'excluded');
  assert.equal(result.datasetStatus, 'rejected');
});

test('중복 레코드는 학습에서 제외한다', () => {
  const result = promoteReviewToTraining(
    { decision: 'auto_accept' },
    {
      ...record,
      isDuplicate: true
    }
  );

  assert.equal(result.status, 'excluded');
  assert.equal(result.reason, 'DUPLICATE_OR_CONFLICT');
});
