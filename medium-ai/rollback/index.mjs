export const ROLLBACK_VERSION = 'rollback-v1';

export function makeRollbackRecord({ fromModelId, toModelId, reason, incidentRef = null, actor = 'system' } = {}) {
  if (!fromModelId || !toModelId || !reason) throw new Error('rollback_fields_required');
  return { rollback_id: `rollback-${Date.now()}`, from_model_id: String(fromModelId), to_model_id: String(toModelId), reason: String(reason), incident_ref: incidentRef ? String(incidentRef) : null, created_at: new Date().toISOString(), actor: String(actor) };
}

export function rollbackPointer({ activeModelId, previousModelId, reason, actor } = {}) {
  const record = makeRollbackRecord({ fromModelId: activeModelId, toModelId: previousModelId, reason, actor });
  return { ok: true, active_model_id: String(previousModelId), record };
}
