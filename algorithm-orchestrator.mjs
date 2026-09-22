import {
  createAlgorithmInput,
  createAlgorithmOutput,
} from "./algorithm-contract.mjs";

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

export async function runAlgorithmPipeline(rawInput, runners = {}) {
  const input = createAlgorithmInput(rawInput);
  const results = {};

  for (const modelName of MODEL_NAMES) {
    const runner = runners[modelName];

    if (typeof runner === "function") {
      results[modelName] = await runner(input);
    }
  }

  const numericScores = Object.values(results)
    .map((result) => result?.score)
    .filter((score) => Number.isFinite(score));

  const finalScore = numericScores.length
    ? numericScores.reduce((sum, score) => sum + score, 0) /
      numericScores.length
    : null;

  const confidence = numericScores.length / MODEL_NAMES.length;

  return createAlgorithmOutput(input, {
    ...results,
    finalScore,
    confidence,
    needsHumanReview:
      input.ocrVerified === false ||
      (confidence > 0 && confidence < 0.5),
  });
}
