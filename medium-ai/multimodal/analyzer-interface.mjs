export const MULTIMODAL_ANALYZER_INTERFACE_VERSION = 'multimodal-analyzer-v1';

export async function runMultimodalAnalyzer(analyzer, bytes, context = {}) {
  if (!analyzer || typeof analyzer.analyze !== 'function') throw new Error('missing_multimodal_analyzer');
  const raw = await analyzer.analyze(bytes, context);
  if (!raw || typeof raw !== 'object') throw new Error('invalid_multimodal_result');
  const confidence = Number(raw.confidence);
  return {
    label: typeof raw.label === 'string' ? raw.label : null,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : null,
    abstain: raw.abstain === true || !Number.isFinite(confidence),
    provider: typeof raw.provider === 'string' ? raw.provider : 'unknown',
    model_version: typeof raw.model_version === 'string' ? raw.model_version : 'unknown',
  };
}
