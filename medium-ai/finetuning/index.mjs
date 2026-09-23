export const FINETUNING_VERSION = 'finetuning-v1';

export function isTrainableRecord(record) {
  return record?.label_status === 'human_verified'
    && record?.split === 'train'
    && Boolean(record?.source_snapshot_hash)
    && record?.quality?.source_complete === true
    && record?.quality?.media_complete !== false;
}

export function selectTrainingRecords(records = []) {
  const selected = []; const excluded = [];
  for (const record of Array.isArray(records) ? records : []) {
    (isTrainableRecord(record) ? selected : excluded).push(record);
  }
  return { selected, excluded, counts: { selected: selected.length, excluded: excluded.length } };
}

export function createTrainingJob({ method = 'lora', baseModel, datasetVersion, hyperparameters = null } = {}) {
  if (!['sft', 'lora', 'qlora', 'evaluation_only'].includes(method)) throw new Error('invalid_training_method');
  if (!baseModel || !datasetVersion) throw new Error('training_job_fields_required');
  return { job_id: `ft-${Date.now()}`, method, base_model: String(baseModel), dataset_version: String(datasetVersion), status: 'draft', hyperparameters, output_model_id: null, metrics_report_id: null, created_at: new Date().toISOString(), completed_at: null };
}

export function canPromoteAdapter(adapter, evaluation) {
  return Boolean(adapter?.status === 'candidate' && evaluation?.holdout_passed === true && evaluation?.metrics?.false_approval_rate <= 0.02 && evaluation?.metrics?.mismatch_rate <= 0.05);
}
