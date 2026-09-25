export const PROVIDER_INTERFACE_VERSION = 'provider-interface-v1';

export function providerRequest(input, adapter, { timeoutMs = 15_000 } = {}) {
  if (!input || !adapter?.adapter_id) return Promise.reject(new Error('provider_request_fields_required'));
  if (typeof adapter.predict !== 'function') return Promise.reject(new Error('provider_predict_not_configured'));
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('provider_timeout')), Math.max(100, Number(timeoutMs) || 15_000)));
  return Promise.race([Promise.resolve().then(() => adapter.predict(input)), timeout]).then(output => ({ ok: true, output, adapter_id: adapter.adapter_id, provider: adapter.provider, model_version: adapter.model_version })).catch(error => ({ ok: false, adapter_id: adapter.adapter_id, provider: adapter.provider || 'unknown', model_version: adapter.model_version || 'unknown', error: String(error?.message || error).slice(0, 300), fallback: 'human_review' }));
}

export function providerCapabilities(adapter) {
  return { adapter_id: adapter?.adapter_id || null, provider: adapter?.provider || null, model_version: adapter?.model_version || null, capabilities: Array.isArray(adapter?.capabilities) ? [...adapter.capabilities] : [], interface_version: PROVIDER_INTERFACE_VERSION };
}
