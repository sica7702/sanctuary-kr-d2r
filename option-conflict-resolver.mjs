export function resolveOptionConflict(conflict = {}, policy = {}) {
  const candidates = Array.isArray(conflict.candidates)
    ? conflict.candidates
    : [];

  const minimumMargin = policy.minimumConfidenceMargin ?? 0.2;

  if (candidates.length < 2) {
    return {
      status: 'human_review',
      reason: 'INSUFFICIENT_CONFLICT_CANDIDATES'
    };
  }

  const ranked = candidates
    .filter((candidate) => typeof candidate.confidence === 'number')
    .sort((a, b) => b.confidence - a.confidence);

  if (ranked.length < 2) {
    return {
      status: 'human_review',
      reason: 'CONFIDENCE_MISSING'
    };
  }

  const margin = ranked[0].confidence - ranked[1].confidence;

  if (margin < minimumMargin) {
    return {
      status: 'human_review',
      reason: 'CONFIDENCE_MARGIN_TOO_SMALL',
      margin
    };
  }

  return {
    status: 'auto_resolved',
    option: ranked[0].option,
    confidence: ranked[0].confidence,
    margin,
    authoritative: false
  };
}
