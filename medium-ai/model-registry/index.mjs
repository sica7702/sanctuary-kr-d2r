export const MODEL_REGISTRY_VERSION = 'registry-v1';
export const MODEL_STATUSES = Object.freeze(['draft', 'shadow', 'candidate', 'active', 'retired', 'rolled_back']);

export function modelKey({ name, version }) { return `${String(name || 'unknown')}@${String(version || 'unknown')}`; }

export function canPromoteModel(record, evaluation = {}) {
  const errors = [];
  if (!record || !['shadow', 'candidate'].includes(record.status)) errors.push('model_not_promotable');
  if (!record.dataset_version) errors.push('dataset_version_required');
  if (!evaluation.holdout_passed) errors.push('holdout_not_passed');
  if (evaluation.mismatch_rate == null || Number(evaluation.mismatch_rate) > 0.05) errors.push('mismatch_rate_gate');
  if (evaluation.false_approval_rate == null || Number(evaluation.false_approval_rate) > 0.02) errors.push('false_approval_rate_gate');
  return { ok: errors.length === 0, errors };
}

export function promoteModel(record, evaluation, now = new Date().toISOString()) {
  const gate = canPromoteModel(record, evaluation);
  if (!gate.ok) return { ok: false, gate };
  return { ok: true, record: { ...record, status: 'active', promoted_at: now } };
}
