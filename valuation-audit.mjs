export function auditValuationInput(input = {}) {
  const errors = [];
  const warnings = [];

  if (!input.itemType) errors.push('ITEM_TYPE_MISSING');
  if (!input.options || !Array.isArray(input.options)) {
    errors.push('OPTIONS_MISSING');
  }

  if (!input.source) warnings.push('SOURCE_MISSING');
  if (!input.marketSnapshot) warnings.push('MARKET_SNAPSHOT_MISSING');
  if (input.marketSnapshot && !input.marketSnapshot.capturedAt) {
    errors.push('MARKET_TIMESTAMP_MISSING');
  }

  if (input.options?.some((option) => option?.value === null)) {
    warnings.push('OPTION_VALUE_UNKNOWN');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    canEvaluate: errors.length === 0 && warnings.length === 0
  };
}

export function preserveValuationResult(audit, existingResult) {
  if (!audit?.valid) {
    return {
      action: 'human_review',
      result: existingResult ?? null,
      audit
    };
  }

  return {
    action: audit.canEvaluate ? 'continue' : 'review_warning',
    result: existingResult ?? null,
    audit
  };
}

