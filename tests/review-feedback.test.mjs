import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReviewFeedback } from '../review-feedback.mjs';

const baseRecord = {
  imageHash: 'sha256:ring-001',
  humanLabel: null
};

test('관리자 승인은 학습 후보로 승격한다', () => {
  const result = applyReviewFeedback(baseRecord, {
    decision: 'approve',
    approvedLabel: {
      optionId: 'FIRE_RESIST',
      value: 26
    },
    reviewedBy: 'admin'
  });

  assert.equal(result.status, 'human_verified');
  assert.equal(result.datasetStatus, 'train_candidate');
  assert.equal(result.record.humanLabel.value, 26);
});

test('관리자 수정은 수정된 라벨을 사용한다', () => {
  const result = applyReviewFeedback(baseRecord, {
    decision: 'correct',
    correctedLabel: {
      optionId: 'FIRE_RESIST',
      value: 31
    }
  });

  assert.equal(result.status, 'human_verified');
  assert.equal(result.record.humanLabel.value, 31);
  assert.equal(result.record.reviewDecision, 'correct');
});

test('관리자 폐기는 학습에서 제외한다', () => {
  const result = applyReviewFeedback(baseRecord, {
    decision: 'reject',
    reason: 'DUPLICATE_RECORD'
  });

  assert.equal(result.status, 'rejected');
  assert.equal(result.datasetStatus, 'rejected');
});

test('잘못된 검수 결정은 거부한다', () => {
  const result = applyReviewFeedback(baseRecord, {
    decision: 'unknown'
  });

  assert.equal(result.status, 'invalid_review');
  assert.equal(result.reason, 'UNKNOWN_REVIEW_DECISION');
});
