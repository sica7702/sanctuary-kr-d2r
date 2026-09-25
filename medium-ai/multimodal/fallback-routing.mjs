export const IMAGE_FALLBACK_ROUTING_VERSION = 'image-fallback-routing-v1';

export function needsMultimodalFallback(result, { minConfidence = 0.78 } = {}) {
  if (!result || result.abstain === true) return true;
  if (result.optionsComplete === false || result.parseQuality === 'partial' || result.parseQuality === 'failed') return true;
  return !Number.isFinite(Number(result.confidence)) || Number(result.confidence) < minConfidence;
}

export async function routeImageAppraisal({ bytes, primary, fallback, policy } = {}) {
  if (!primary || typeof primary.analyze !== 'function') throw new Error('missing_primary_image_analyzer');
  const primaryResult = await primary.analyze(bytes);
  if (!needsMultimodalFallback(primaryResult, policy)) return { ...primaryResult, route: 'primary' };
  if (!fallback || typeof fallback.analyze !== 'function') return { ...primaryResult, route: 'primary_uncertain', fallback_status: 'unavailable' };
  try {
    const fallbackResult = await fallback.analyze(bytes);
    return { ...fallbackResult, route: 'multimodal_fallback', primary_result: primaryResult };
  } catch {
    return { ...primaryResult, route: 'primary_uncertain', fallback_status: 'failed' };
  }
}
