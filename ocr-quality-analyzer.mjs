const DEFAULT_POLICY = Object.freeze({
  minimumConfidence: 0.8,
  minimumTextLength: 2,
  minimumOptionCount: 1,
  numericMinimum: -1000,
  numericMaximum: 1000
});

export function analyzeOcrQuality(input = {}, policy = {}) {
  const rules = { ...DEFAULT_POLICY, ...policy };
  const failures = [];
  const warnings = [];

  const text = typeof input.text === 'string'
    ? input.text.trim()
    : '';

  const confidence = typeof input.confidence === 'number'
    ? input.confidence
    : null;

  const options = Array.isArray(input.options)
    ? input.options
    : [];

  if (!input.imagePresent) {
    failures.push('IMAGE_MISSING');
  }

  if (text.length < rules.minimumTextLength) {
    failures.push('OCR_TEXT_TOO_SHORT');
  }

  if (confidence === null) {
    failures.push('OCR_CONFIDENCE_MISSING');
  } else if (confidence < rules.minimumConfidence) {
    failures.push('OCR_LOW_CONFIDENCE');
  }

  if (options.length < rules.minimumOptionCount) {
    failures.push('OCR_OPTIONS_INCOMPLETE');
  }

  for (const option of options) {
    if (typeof option?.value !== 'number') {
      warnings.push('OPTION_NUMERIC_VALUE_MISSING');
      continue;
    }

    if (
      option.value < rules.numericMinimum ||
      option.value > rules.numericMaximum
    ) {
      failures.push('OPTION_NUMERIC_VALUE_OUT_OF_RANGE');
    }
  }

  return {
    quality: failures.length === 0
      ? (warnings.length === 0 ? 'high' : 'medium')
      : 'low',
    needsMultimodal: failures.length > 0,
    failures: [...new Set(failures)],
    warnings: [...new Set(warnings)]
  };
}
