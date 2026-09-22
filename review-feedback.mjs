export function applyReviewFeedback(record = {}, review = {}) {
  const decision = review.decision;

  if (!['approve', 'correct', 'reject'].includes(decision)) {
    return {
      status: 'invalid_review',
      reason: 'UNKNOWN_REVIEW_DECISION'
    };
  }

  if (decision === 'reject') {
    return {
      status: 'rejected',
      datasetStatus: 'rejected',
      reason: review.reason ?? 'ADMIN_REJECTED'
    };
  }

  const humanLabel = decision === 'correct'
    ? review.correctedLabel ?? null
    : review.approvedLabel ?? record.humanLabel ?? null;

  if (!humanLabel) {
    return {
      status: 'invalid_review',
      reason: 'HUMAN_LABEL_MISSING'
    };
  }

  return {
    status: 'human_verified',
    datasetStatus: 'train_candidate',
    record: {
      ...record,
      humanLabel,
      labelSource: 'admin_review',
      reviewDecision: decision,
      reviewedBy: review.reviewedBy ?? 'admin',
      reviewedAt: review.reviewedAt ?? new Date().toISOString()
    }
  };
}
