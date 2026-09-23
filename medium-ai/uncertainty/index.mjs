export const UNCERTAINTY_VERSION = 'uncertainty-v1';
export const DEFAULT_POLICY = Object.freeze({ policy_version: UNCERTAINTY_VERSION, shadow_threshold: 0.65, active_threshold: 0.9, abstain_on_mismatch: true, abstain_on_missing_source: true, max_auto_review_rate: 0.1 });

export function assessUncertainty(output, context = {}, policy = DEFAULT_POLICY) {
  const confidence = Number(output?.confidence);
  const reasons = [];
  if (!Number.isFinite(confidence)) reasons.push('confidence_missing');
  else if (confidence < Number(policy.active_threshold)) reasons.push('below_active_threshold');
  if (policy.abstain_on_mismatch && context.mismatch_detected) reasons.push('source_media_mismatch');
  if (policy.abstain_on_missing_source && !context.source_snapshot_hash) reasons.push('source_snapshot_missing');
  if (context.novel_option) reasons.push('novel_option');
  if (context.parser_incomplete) reasons.push('parser_incomplete');
  return { abstain: reasons.length > 0, confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0, reasons, route: reasons.length ? 'human_review' : 'model_shadow_candidate' };
}
