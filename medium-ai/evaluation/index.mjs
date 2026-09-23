export const EVALUATION_VERSION = 'evaluation-v1';

function ratio(value, total) { return total ? value / total : 0; }

export function evaluateHoldout(rows = []) {
  const items = Array.isArray(rows) ? rows : [];
  let correct = 0, falseApproval = 0, missedGood = 0, mismatch = 0, abstained = 0;
  for (const row of items) {
    const expected = String(row.expected || ''); const actual = String(row.actual || '');
    if (expected === actual) correct++;
    if (expected === 'needs_repair' && actual === 'review') falseApproval++;
    if (expected === 'review' && actual === 'needs_repair') missedGood++;
    if (row.mismatch_detected) mismatch++;
    if (row.abstained) abstained++;
  }
  const sampleCount = items.length;
  return { evaluation_version: EVALUATION_VERSION, sample_count: sampleCount, metrics: { accuracy: ratio(correct, sampleCount), false_approval_rate: ratio(falseApproval, sampleCount), missed_good_rate: ratio(missedGood, sampleCount), mismatch_rate: ratio(mismatch, sampleCount), abstention_rate: ratio(abstained, sampleCount), calibration_error: null } };
}

export function passHoldoutGate(metrics, thresholds = { false_approval_rate: 0.02, mismatch_rate: 0.05, min_samples: 100 }) {
  const errors = [];
  if (Number(metrics?.sample_count || 0) < thresholds.min_samples) errors.push('holdout_sample_count');
  if (Number(metrics?.metrics?.false_approval_rate) > thresholds.false_approval_rate) errors.push('false_approval_rate');
  if (Number(metrics?.metrics?.mismatch_rate) > thresholds.mismatch_rate) errors.push('mismatch_rate');
  return { passed: errors.length === 0, errors };
}
