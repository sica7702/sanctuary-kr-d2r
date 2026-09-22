const MODEL_NAMES = [
  "xgboost",
  "regression",
  "mcda",
  "gpr",
  "dbscan",
  "genetic",
  "bayesian",
  "apriori",
  "collaborative",
];

export function createAlgorithmInput(input) {
  for (const field of ["itemId", "features", "ocrVerified", "marketContext"]) {
    if (!(field in input)) {
      throw new Error(`필수 입력 필드가 없습니다: ${field}`);
    }
  }

  if (!Array.isArray(input.features)) {
    throw new Error("features는 배열이어야 합니다.");
  }

  return {
    itemId: String(input.itemId),
    features: input.features.map(Number),
    ocrVerified: Boolean(input.ocrVerified),
    marketContext: input.marketContext ?? {},
  };
}

export function createAlgorithmOutput(input, results = {}) {
  const models = {};

  for (const modelName of MODEL_NAMES) {
    models[modelName] = results[modelName] ?? null;
  }

  return {
    itemId: input.itemId,
    models,
    finalScore: results.finalScore ?? null,
    confidence: results.confidence ?? null,
    needsHumanReview: Boolean(results.needsHumanReview),
  };
}
