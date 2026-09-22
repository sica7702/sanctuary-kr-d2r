export function createJavaScriptModelAdapters() {
  return {
    mcda: async (input) => {
      const values = input.features.map(Number);
      const score = values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;

      return {
        score,
        method: "mcda-weighted-average",
      };
    },

    apriori: async (input) => {
      const transactions = input.marketContext?.transactions ?? [];

      return {
        score: transactions.length ? 1 : 0,
        transactionCount: transactions.length,
        method: "apriori-association-rules",
      };
    },

    collaborative: async (input) => {
      const recommendations =
        input.marketContext?.recommendations ?? [];

      return {
        score: recommendations.length ? 1 : 0,
        recommendationCount: recommendations.length,
        method: "collaborative-filtering",
      };
    },
  };
}
