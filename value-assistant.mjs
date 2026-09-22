export function createValueAssistant({ scoreOption } = {}) {
  return {
    suggest(input = {}) {
      if (!input.audit?.valid) {
        return {
          status: 'unavailable',
          action: 'human_review',
          reason: 'INVALID_VALUATION_INPUT'
        };
      }

      if (typeof scoreOption !== 'function') {
        return {
          status: 'unavailable',
          action: 'human_review',
          reason: 'VALUE_SCORER_NOT_CONFIGURED'
        };
      }

      const scoredOptions = [];
      for (const option of input.options ?? []) {
        const score = scoreOption(option, input);
        if (typeof score !== 'number' || !Number.isFinite(score)) {
          return {
            status: 'error',
            action: 'human_review',
            reason: 'INVALID_OPTION_SCORE'
          };
        }

        scoredOptions.push({
          optionId: option.optionId,
          value: option.value,
          score
        });
      }

      const totalScore = scoredOptions.reduce(
        (sum, option) => sum + option.score,
        0
      );

      return {
        status: 'suggested',
        action: 'advisory_only',
        totalScore,
        options: scoredOptions,
        authoritative: false
      };
    }
  };
}
