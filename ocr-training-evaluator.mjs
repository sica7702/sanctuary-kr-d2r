function sameText(actual, expected) {
  return String(actual ?? '').trim() === String(expected ?? '').trim();
}

export function evaluateOcrPredictions(samples = []) {
  let exactMatches = 0;
  let optionMatches = 0;
  let valueErrorTotal = 0;
  let valueCount = 0;

  for (const sample of samples) {
    const prediction = sample?.prediction ?? {};
    const label = sample?.label ?? {};

    if (sameText(prediction.text, label.text)) exactMatches += 1;
    if (prediction.optionId === label.optionId) optionMatches += 1;

    if (typeof prediction.value === 'number' && typeof label.value === 'number') {
      valueErrorTotal += Math.abs(prediction.value - label.value);
      valueCount += 1;
    }
  }

  const total = samples.length;

  return {
    sampleCount: total,
    exactMatchAccuracy: total === 0 ? 0 : exactMatches / total,
    optionAccuracy: total === 0 ? 0 : optionMatches / total,
    valueMae: valueCount === 0 ? null : valueErrorTotal / valueCount
  };
}

export function meetsOcrBaseline(metrics, baseline = {}) {
  const exact = metrics?.exactMatchAccuracy ?? 0;
  const option = metrics?.optionAccuracy ?? 0;
  const mae = metrics?.valueMae;

  if (exact < (baseline.exactMatchAccuracy ?? 0)) return false;
  if (option < (baseline.optionAccuracy ?? 0)) return false;
  if (mae !== null && mae > (baseline.maxValueMae ?? Infinity)) return false;

  return true;
}
