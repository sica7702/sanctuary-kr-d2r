export const DATASET_CONTRACT_VERSION = 'dataset-v1';

export const LABEL_STATUS = Object.freeze(['human_verified', 'human_rejected', 'weak_label', 'unlabeled', 'quarantined']);

export function datasetRecordKey(candidateId, snapshotHash) {
  return `candidate-${Number(candidateId)}:${String(snapshotHash || 'no-snapshot')}`;
}

export function datasetEligibility(record, { requireHuman = true, split = null } = {}) {
  if (!record || !LABEL_STATUS.includes(record.label_status)) return { eligible: false, reason: 'invalid_label_status' };
  if (record.label_status === 'quarantined' || record.split === 'quarantine') return { eligible: false, reason: 'quarantined' };
  if (requireHuman && !['human_verified', 'human_rejected'].includes(record.label_status)) return { eligible: false, reason: 'human_label_required' };
  if (!record.source_snapshot_hash) return { eligible: false, reason: 'source_snapshot_required' };
  if (split && record.split !== split) return { eligible: false, reason: 'split_mismatch' };
  return { eligible: true };
}

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') return { ok: false, errors: ['manifest'] };
  if (!manifest.dataset_version) errors.push('dataset_version');
  if (!Number.isInteger(manifest.record_count) || manifest.record_count < 0) errors.push('record_count');
  if (!manifest.records_file) errors.push('records_file');
  if (!['human_only', 'human_plus_weak', 'weak_only'].includes(manifest.label_policy)) errors.push('label_policy');
  for (const key of ['train', 'validation', 'test', 'holdout']) if (!Number.isInteger(manifest.splits?.[key]) || manifest.splits[key] < 0) errors.push(`splits.${key}`);
  const total = Object.values(manifest.splits || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  if (total !== manifest.record_count) errors.push('split_total');
  return { ok: errors.length === 0, errors };
}
