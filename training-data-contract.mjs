const REQUIRED_FIELDS = [
  "itemId",
  "features",
  "label",
  "source",
  "reviewer",
];

export function createTrainingRecord(record) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in record)) {
      throw new Error(`학습 기록 필드가 없습니다: ${field}`);
    }
  }

  if (!Array.isArray(record.features) || record.features.length === 0) {
    throw new Error("학습 features가 비어 있습니다.");
  }

  if (record.label === null || record.label === undefined) {
    throw new Error("학습 label이 필요합니다.");
  }

  return {
    itemId: String(record.itemId),
    features: record.features.map(Number),
    label: Number(record.label),
    source: String(record.source),
    reviewer: String(record.reviewer),
    reviewedAt: record.reviewedAt ?? new Date().toISOString(),
  };
}

export function validateTrainingBatch(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("학습 배치가 비어 있습니다.");
  }

  return records.map(createTrainingRecord);
}
