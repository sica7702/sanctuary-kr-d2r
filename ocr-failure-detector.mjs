const FAILURE_CODES = Object.freeze({
  IMAGE_MISSING: 'IMAGE_MISSING',
  OCR_EMPTY: 'OCR_EMPTY',
  OCR_LOW_CONFIDENCE: 'OCR_LOW_CONFIDENCE',
  OCR_OPTION_UNKNOWN: 'OCR_OPTION_UNKNOWN',
  OCR_VALUE_UNCERTAIN: 'OCR_VALUE_UNCERTAIN'
});

export function detectOcrFailures(input = {}) {
  const failures = [];
  const imagePresent = input.imagePresent === true;
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  const confidence = typeof input.confidence === 'number' ? input.confidence : null;
  const options = Array.isArray(input.options) ? input.options : [];

  if (!imagePresent) failures.push(FAILURE_CODES.IMAGE_MISSING);
  if (!text) failures.push(FAILURE_CODES.OCR_EMPTY);
  if (confidence !== null && confidence < 0.8) {
    failures.push(FAILURE_CODES.OCR_LOW_CONFIDENCE);
  }
  if (options.some((option) => option?.status === 'unknown')) {
    failures.push(FAILURE_CODES.OCR_OPTION_UNKNOWN);
  }
  if (options.some((option) => option?.valueUncertain === true)) {
    failures.push(FAILURE_CODES.OCR_VALUE_UNCERTAIN);
  }

  return {
    needsMultimodal: failures.length > 0,
    failureCodes: [...new Set(failures)]
  };
}

export { FAILURE_CODES };
