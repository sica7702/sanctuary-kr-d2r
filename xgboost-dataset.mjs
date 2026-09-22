export function buildXgboostDataset(records = [], validationRatio = 0.2) {
  const eligible = records.filter((record) => (
    record?.datasetStatus === 'train_candidate' &&
    record?.features &&
    typeof record.salePrice === 'number' &&
    Number.isFinite(record.salePrice)
  ));

  const validationCount = Math.floor(
    eligible.length * validationRatio
  );

  const validation = eligible
    .slice(0, validationCount)
    .map((record) => ({
      features: record.features,
      label: record.salePrice,
      split: 'validation'
    }));

  const train = eligible
    .slice(validationCount)
    .map((record) => ({
      features: record.features,
      label: record.salePrice,
      split: 'train'
    }));

  return {
    train,
    validation,
    excludedCount: records.length - eligible.length
  };
}

export function serializeXgboostJsonl(rows = []) {
  return rows
    .map((row) => JSON.stringify(row))
    .join('\n');
}
