export function ingestCrawlRecord(record = {}, existingHashes = new Set()) {
  const errors = [];

  if (!record.sourceUrl) errors.push('SOURCE_URL_MISSING');
  if (!record.capturedAt) errors.push('CAPTURE_TIME_MISSING');
  if (!record.imageHash) errors.push('IMAGE_HASH_MISSING');
  if (!record.itemType) errors.push('ITEM_TYPE_MISSING');
  if (!record.options || !Array.isArray(record.options)) {
    errors.push('OPTIONS_MISSING');
  }

  if (record.imageHash && existingHashes.has(record.imageHash)) {
    errors.push('DUPLICATE_IMAGE');
  }

  if (errors.length > 0) {
    return {
      status: 'excluded',
      datasetStatus: 'rejected',
      errors
    };
  }

  return {
    status: 'queued',
    datasetStatus: 'pending',
    record: {
      ...record,
      sourceType: 'crawler',
      requiresHumanReview: true,
      learningEligible: false
    }
  };
}
