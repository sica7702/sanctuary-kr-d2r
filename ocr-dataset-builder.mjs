export function buildTrainingRecord(input = {}) {
  const rejectionReasons = [];

  if (!input.imageHash) rejectionReasons.push('IMAGE_HASH_MISSING');
  if (!input.ocrResult) rejectionReasons.push('OCR_RESULT_MISSING');
  if (!input.multimodalResult) rejectionReasons.push('MULTIMODAL_RESULT_MISSING');
  if (!input.humanLabel) rejectionReasons.push('HUMAN_LABEL_MISSING');
  if (input.datasetStatus === 'rejected') rejectionReasons.push('ALREADY_REJECTED');
  if (input.isDuplicate === true) rejectionReasons.push('DUPLICATE_RECORD');
  if (input.hasConflict === true) rejectionReasons.push('UNRESOLVED_CONFLICT');

  if (rejectionReasons.length > 0) {
    return {
      status: 'rejected',
      rejectionReasons
    };
  }

  return {
    status: 'train_candidate',
    record: {
      recordVersion: '1.0',
      imageHash: input.imageHash,
      ocrResult: input.ocrResult,
      multimodalResult: input.multimodalResult,
      humanLabel: input.humanLabel,
      labelSource: input.labelSource ?? 'admin_review',
      split: input.split ?? 'train'
    }
  };
}

export function splitDataset(records = [], validationRatio = 0.2) {
  const candidates = records.filter((item) => item?.status === 'train_candidate');
  const validationCount = Math.floor(candidates.length * validationRatio);

  return {
    train: candidates.slice(validationCount),
    validation: candidates.slice(0, validationCount)
  };
}
