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

export function createModelRunnerRegistry(adapters = {}) {
  return {
    async run(input) {
      const results = {};

      for (const modelName of MODEL_NAMES) {
        const adapter = adapters[modelName];

        if (typeof adapter !== "function") {
          results[modelName] = {
            status: "not_connected",
            score: null,
          };
          continue;
        }

        try {
          results[modelName] = {
            status: "ok",
            ...(await adapter(input)),
          };
        } catch (error) {
          results[modelName] = {
            status: "error",
            score: null,
            error: error.message,
          };
        }
      }

      return results;
    },
  };
}
