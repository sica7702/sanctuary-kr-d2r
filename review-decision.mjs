export function decideReviewAction(comparison = {}, policy = {}) {
  const minimumConfidence = policy.minimumConfidence ?? 0.9;
  const confidence = comparison.confidence ?? null;

  if (comparison.status === 'verified') {
    if (confidence === null || confidence >= minimumConfidence) {
      return {
        decision: 'auto_accept',
        requiresHuman: false
      };
    }

    return {
      decision: 'human_review',
      requiresHuman: true,
      reason: 'CONFIDENCE_BELOW_THRESHOLD'
    };
  }

  if (comparison.status === 'normalized_match') {
    return {
      decision: 'accept_normalized',
      requiresHuman: false
    };
  }

  if (comparison.status === 'conflict') {
    return {
      decision: 'human_review',
      requiresHuman: true,
      reason: 'OCR_MULTIMODAL_CONFLICT'
    };
  }

  return {
    decision: 'human_review',
    requiresHuman: true,
    reason: 'UNRESOLVED_VERIFICATION_STATE'
  };
}
