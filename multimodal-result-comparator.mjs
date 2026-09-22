function sameValue(left, right) {
  return left === right;
}

export function compareOcrAndMultimodal(ocr = {}, multimodal = {}) {
  const differences = [];

  if (!sameValue(ocr.text, multimodal.text)) {
    differences.push('TEXT_MISMATCH');
  }

  if (!sameValue(ocr.optionId, multimodal.optionId)) {
    differences.push('OPTION_ID_MISMATCH');
  }

  if (!sameValue(ocr.value, multimodal.value)) {
    differences.push('OPTION_VALUE_MISMATCH');
  }

  if (differences.length === 0) {
    return {
      status: 'verified',
      action: 'continue',
      differences: []
    };
  }

  if (
    differences.length === 1 &&
    differences[0] === 'TEXT_MISMATCH' &&
    ocr.optionId === multimodal.optionId &&
    ocr.value === multimodal.value
  ) {
    return {
      status: 'normalized_match',
      action: 'continue',
      differences
    };
  }

  return {
    status: 'conflict',
    action: 'human_review',
    differences
  };
}
