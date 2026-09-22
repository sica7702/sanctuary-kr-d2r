export function evaluateTrainingGate(input = {}, policy = {}) {
  const errors = [];
  const minimumSamples = policy.minimumSamples ?? 20;
  const minimumExactAccuracy = policy.minimumExactAccuracy ?? 0.9;
  const minimumOptionAccuracy = policy.minimumOptionAccuracy ?? 0.9;

  const sampleCount = input.sampleCount ?? 0;
  const metrics = input.metrics ?? {};

  if (sampleCount < minimumSamples) {
    errors.push('INSUFFICIENT_TRAINING_SAMPLES');
  }

  if ((metrics.exactMatchAccuracy ?? 0) < minimumExactAccuracy) {
    errors.push('EXACT_ACCURACY_BELOW_THRESHOLD');
  }

  if ((metrics.optionAccuracy ?? 0) < minimumOptionAccuracy) {
    errors.push('OPTION_ACCURACY_BELOW_THRESHOLD');
  }

  if (input.hasUnresolvedConflicts === true) {
    errors.push('UNRESOLVED_CONFLICTS');
  }

  if (errors.length > 0) {
    return {
      status: 'blocked',
      action: 'keep_previous_model',
      errors
    };
  }

  return {
    status: 'eligible',
    action: 'promote_training_candidate',
    errors: []
  };
}
