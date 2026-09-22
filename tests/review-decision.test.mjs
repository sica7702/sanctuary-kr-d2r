import test from 'node:test';
import assert from 'node:assert/strict';
import { decideReviewAction } from '../review-decision.mjs';

test('높은 신뢰도의 verified 결과는 자동 승인한다', () => {
  const result = decideReviewAction({
    status: 'verified',
    confidence: 0.98
  });

  assert.equal(result.decision, 'auto_accept');
  assert.equal(result.requiresHuman, false);
});

test('낮은 신뢰도의 verified 결과는 사람 검수로 보낸다', () => {
  const result = decideReviewAction({
    status: 'verified',
    confidence: 0.7
  });

  assert.equal(result.decision, 'human_review');
  assert.equal(result.requiresHuman, true);
  assert.equal(result.reason, 'CONFIDENCE_BELOW_THRESHOLD');
});

test('정규화 일치는 자동 승인한다', () => {
  const result = decideReviewAction({
    status: 'normalized_match'
  });

  assert.equal(result.decision, 'accept_normalized');
  assert.equal(result.requiresHuman, false);
});

test('충돌은 사람 검수로 보낸다', () => {
  const result = decideReviewAction({
    status: 'conflict'
  });

  assert.equal(result.decision, 'human_review');
  assert.equal(result.requiresHuman, true);
  assert.equal(result.reason, 'OCR_MULTIMODAL_CONFLICT');
});

test('알 수 없는 상태는 사람 검수로 보낸다', () => {
  const result = decideReviewAction({
    status: 'abstain'
  });

  assert.equal(result.decision, 'human_review');
  assert.equal(result.requiresHuman, true);
  assert.equal(result.reason, 'UNRESOLVED_VERIFICATION_STATE');
});
