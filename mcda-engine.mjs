import { scoreMcdaCandidate } from "./mcda-scorer.mjs";

export function createMcdaEngine() {
  return async (input) => {
    const maximum = Math.max(...input.features, 1);

    const criteria = input.features.map((value, index) => ({
      id: `feature_${index}`,
      weight: 1,
      minimum: 0,
      maximum,
      required: false,
    }));

    const candidate = Object.fromEntries(
      input.features.map((value, index) => [
        `feature_${index}`,
        value,
      ]),
    );

    const result = scoreMcdaCandidate(candidate, criteria);

    return {
      model: "mcda",
      score: result.status === "scored" ? result.score : 0,
      confidence: result.status === "scored" ? 1 : 0,
      status: "candidate",
      explanation: "실제 MCDA scorer 모듈 결과",
      metadata: result,
    };
  };
}
