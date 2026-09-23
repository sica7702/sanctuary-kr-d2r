export const ADAPTER_VERSION = 'adapter-v1';

export const ADAPTER_MODES = Object.freeze(['disabled', 'shadow', 'active']);

export function validateAdapter(adapter) {
  const errors = [];
  if (!adapter?.adapter_id) errors.push('adapter_id');
  if (!adapter?.provider) errors.push('provider');
  if (!['small', 'medium', 'multimodal', 'finetuned', 'adapter'].includes(adapter?.model_kind)) errors.push('model_kind');
  if (!adapter?.model_version) errors.push('model_version');
  if (adapter?.contract_version !== 'medium-body-v1') errors.push('contract_version');
  if (!ADAPTER_MODES.includes(adapter?.mode)) errors.push('mode');
  return { ok: errors.length === 0, errors };
}

export function chooseAdapter(input, adapters = []) {
  const list = (Array.isArray(adapters) ? adapters : []).filter(item => validateAdapter(item).ok && item.mode !== 'disabled');
  const needsImage = Array.isArray(input?.media) && input.media.some(item => ['image', 'ocr_text'].includes(item.kind));
  const complex = input?.task === 'mismatch_detection' || input?.task === 'dataset_label_review' || input?.complexity === 'high';
  const preferred = needsImage ? ['multimodal', 'finetuned', 'medium'] : complex ? ['finetuned', 'medium', 'multimodal'] : ['small', 'finetuned', 'medium'];
  for (const kind of preferred) {
    const hit = list.find(item => item.model_kind === kind && (!needsImage || item.capabilities?.includes('image')));
    if (hit) return { adapter: hit, route: kind, mode: hit.mode, reason: needsImage ? 'media_input' : complex ? 'complex_task' : 'baseline_task' };
  }
  return { adapter: null, route: 'human_review', mode: 'disabled', reason: 'no_compatible_adapter' };
}

// Provider calls are intentionally injected later. This adapter boundary only
// returns a safe shadow envelope and cannot change candidate status.
export function shadowRequest(input, adapter) {
  const selected = chooseAdapter(input, [adapter]);
  return { adapter_id: selected.adapter?.adapter_id || null, route: selected.route, mode: 'shadow', applied: false, input_contract_version: 'medium-body-v1' };
}
