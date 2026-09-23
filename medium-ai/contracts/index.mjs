export const CONTRACT_VERSION = 'medium-body-v1';
export const DECISIONS = Object.freeze(['review', 'needs_repair', 'no_decision']);

export function validateModelOutput(value) {
  const result = value && typeof value === 'object' ? value : {};
  const errors = [];
  if (result.contract_version !== CONTRACT_VERSION) errors.push('contract_version');
  if (!DECISIONS.includes(result.decision)) errors.push('decision');
  if (!Number.isFinite(Number(result.confidence)) || Number(result.confidence) < 0 || Number(result.confidence) > 1) errors.push('confidence');
  if (typeof result.requires_human_review !== 'boolean') errors.push('requires_human_review');
  if (!Array.isArray(result.reasons) || !Array.isArray(result.tags)) errors.push('reasons_or_tags');
  if (!result.model || typeof result.model !== 'object') errors.push('model');
  return { ok: errors.length === 0, errors };
}

export function canApplyModelOutput(value, { expectedSnapshotHash = null, mode = 'shadow' } = {}) {
  const validation = validateModelOutput(value);
  if (!validation.ok || mode !== 'active') return { ok: false, reason: 'contract_or_mode_gate', errors: validation.errors };
  if (value.requires_human_review || value.decision !== 'review') return { ok: false, reason: 'human_review_gate' };
  if (expectedSnapshotHash && value.source_snapshot_hash !== expectedSnapshotHash) return { ok: false, reason: 'source_snapshot_mismatch' };
  return { ok: true };
}
