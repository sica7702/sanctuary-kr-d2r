function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return null;

  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function summarizeReviewedSamples(samples = []) {
  const valid = samples.filter(
    (sample) =>
      sample?.approved === true &&
      typeof sample.value === 'number' &&
      Number.isFinite(sample.value)
  );

  const values = valid.map((sample) => sample.value);

  return {
    sampleCount: valid.length,
    mean: values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null,
    median: median(values),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null
  };
}

export function evolveCorrection(baseScore, summary, options = {}) {
  if (!summary || summary.sampleCount < (options.minSamples ?? 5)) {
    return {
      status: 'insufficient_data',
      score: baseScore,
      correction: 0
    };
  }

  const center = summary.median ?? summary.mean;
  const learningRate = options.learningRate ?? 0.1;
  const correction = (center - baseScore) * learningRate;

  return {
    status: 'candidate',
    score: baseScore + correction,
    correction,
    basedOn: summary.sampleCount,
    authoritative: false
  };
}
