function normalize(value, criterion) {
  const min = criterion.min ?? 0;
  const max = criterion.max ?? 1;

  if (max === min) return 1;

  const ratio = (value - min) / (max - min);
  const bounded = Math.max(0, Math.min(1, ratio));

  return criterion.direction === 'cost'
    ? 1 - bounded
    : bounded;
}

export function scoreMcdaCandidate(candidate = {}, criteria = []) {
  const totalWeight = criteria.reduce(
    (sum, criterion) => sum + Number(criterion.weight ?? 0),
    0
  );

  if (totalWeight <= 0) {
    return {
      status: 'invalid',
      reason: 'MCDA_WEIGHTS_INVALID'
    };
  }

  const failedRequired = criteria
    .filter((criterion) => criterion.required === true)
    .filter((criterion) => {
      const value = Number(candidate[criterion.id] ?? 0);
      return value < Number(criterion.minimum ?? 0);
    })
    .map((criterion) => criterion.id);

  if (failedRequired.length > 0) {
    return {
      status: 'rejected',
      score: 0,
      failedRequired
    };
  }

  const contributions = criteria.map((criterion) => {
    const value = Number(candidate[criterion.id] ?? 0);
    const normalized = normalize(value, criterion);
    const weighted = normalized * (criterion.weight / totalWeight);

    return {
      id: criterion.id,
      value,
      normalized,
      weighted
    };
  });

  const score = contributions.reduce(
    (sum, contribution) => sum + contribution.weighted,
    0
  );

  return {
    status: 'scored',
    score,
    contributions,
    failedRequired: []
  };
}
