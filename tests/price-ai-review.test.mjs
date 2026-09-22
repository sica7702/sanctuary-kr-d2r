import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewPriceCandidate } from '../price-ai-review.mjs';

test('신뢰도와 표본 수가 충분하면 자동 승격 후보가 된다', () => {
  const result = reviewPriceCandidate(
    {
      price: 150,
      confidence: 0.98,
      sampleCount: 50,
      authoritative: false
    },
    {
      minimumConfidence: 0.95,
      minimumSamples: 20
    }
  );

  assert.equal(result.status, 'eligible');
  assert.equal(result.action, 'auto_promote_candidate');
  assert.equal(result.candidate.authoritative, false);
});

test('신뢰도가 낮으면 사람 검수로 보낸다', () => {
  const result = reviewPriceCandidate({
    price: 150,
    confidence: 0.8,
    sampleCount: 50
  });

  assert.equal(result.status, 'review_required');
  assert.equal(result.action, 'human_review');
  assert.ok(result.errors.includes('CONFIDENCE_BELOW_THRESHOLD'));
});

test('표본 수가 부족하면 자동 승격하지 않는다', () => {
  const result = reviewPriceCandidate({
    price: 150,
    confidence: 0.99,
    sampleCount: 5
  });

  assert.equal(result.status, 'review_required');
  assert.ok(result.errors.includes('INSUFFICIENT_SAMPLES'));
});

test('가격이나 신뢰도가 없으면 검수로 보낸다', () => {
  const result = reviewPriceCandidate({
    sampleCount: 100
  });

  assert.equal(result.status, 'review_required');
  assert.ok(result.errors.includes('PRICE_MISSING'));
  assert.ok(result.errors.includes('CONFIDENCE_MISSING'));
});
