export function promoteReviewToTraining(review = {}, record = {}) {
  const allowed = new Set([
    'auto_accept',
    'accept_normalized',
    'human_verified'
  ]);

  if (!allowed.has(review.decision)) {
    return {
      status: 'excluded',
      datasetStatus: 'rejected',
      reason: 'REVIEW_NOT_ELIGIBLE'
    };
  }

  if (!record.imageHash || !record.ocrResult) {
    return {
      status: 'excluded',
      datasetStatus: 'rejected',
      reason: 'TRAINING_RECORD_INCOMPLETE'
    };
  }

  if (record.isDuplicate === true || record.hasConflict === true) {
    return {
      status: 'excluded',
      datasetStatus: 'rejected',
      reason: 'DUPLICATE_OR_CONFLICT'
    };
  }

  return {
    status: 'promoted',
    datasetStatus: 'train_candidate',
    record: {
      ...record,
      labelSource: review.decision === 'human_verified'
        ? 'admin_review'
        : 'verified_pipeline',
      promotedAt: new Date().toISOString()
    }
  };
}
