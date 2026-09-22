export function normalizeScore(score, options = {}) {
  if (!Number.isFinite(score)) {
    return null;
  }

  if (score >= 0 && score <= 1) {
    return score;
  }

  const min = Number.isFinite(options.min) ? options.min : 0;
  const max = Number.isFinite(options.max) ? options.max : 100;

  if (max <= min) {
    throw new Error("정규화 범위가 올바르지 않습니다.");
  }

  return Math.min(1, Math.max(0, (score - min) / (max - min)));
}

export function normalizeModelResults(results, ranges = {}) {
  return Object.fromEntries(
    Object.entries(results).map(([modelName, result]) => {
      if (!result || !Number.isFinite(result.score)) {
        return [modelName, result];
      }

      return [
        modelName,
        {
          ...result,
          rawScore: result.score,
          score: normalizeScore(result.score, ranges[modelName]),
        },
      ];
    }),
  );
}
