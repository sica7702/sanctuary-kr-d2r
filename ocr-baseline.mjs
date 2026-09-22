export function compareOcrBaseline(previous = {}, candidate = {}) {
  const exactDelta =
    (candidate.exactMatchAccuracy ?? 0) -
    (previous.exactMatchAccuracy ?? 0);

  const optionDelta =
    (candidate.optionAccuracy ?? 0) -
    (previous.optionAccuracy ?? 0);

  const previousMae = previous.valueMae;
  const candidateMae = candidate.valueMae;

  const maeDelta =
    previousMae === null || previousMae === undefined ||
    candidateMae === null || candidateMae === undefined
      ? null
      : candidateMae - previousMae;

  const improved =
    exactDelta >= 0 &&
    optionDelta >= 0 &&
    (maeDelta === null || maeDelta <= 0);

  return {
    improved,
    exactMatchDelta: exactDelta,
    optionAccuracyDelta: optionDelta,
    valueMaeDelta: maeDelta,
    decision: improved ? 'promote_candidate' : 'keep_previous'
  };
}
