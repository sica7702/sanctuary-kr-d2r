export function reviewPriceCandidate(candidate = {}, policy = {}) {
  const errors = [];

  if (typeof candidate.price !== 'number' || !Number.isFinite(candidate.price)) {
    errors.push('PRICE_MISSING');
  }

  if (typeof candidate.confidence !== 'number') {
    errors.push('CONFIDENCE_MISSING');
  }

  if (candidate.authoritative === true) {
    errors.push('CANDIDATE_ALREADY_AUTHORITATIVE');
  }

  const minimumConfidence = policy.minimumConfidence ?? 0.95;
  const minimumSamples = policy.minimumSamples ?? 20;

  if (
    typeof candidate.confidence === 'number' &&
    candidate.confidence < minimumConfidence
  ) {
    errors.push('CONFIDENCE_BELOW_THRESHOLD');
  }

  if ((candidate.sampleCount ?? 0) < minimumSamples) {
    errors.push('INSUFFICIENT_SAMPLES');
  }

  if (errors.length > 0) {
    return {
      status: 'review_required',
      action: 'human_review',
      errors,
      candidate
    };
  }

  return {
    status: 'eligible',
    action: 'auto_promote_candidate',
    errors: [],
    candidate: {
      ...candidate,
      authoritative: false
    }
  };
}
