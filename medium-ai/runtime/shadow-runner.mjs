import { buildMediumModelInput, normalizeMediumModelOutput, makeShadowResult } from '../../medium-model-body-contract.mjs';
import { chooseAdapter } from '../adapters/index.mjs';
import { assessUncertainty } from '../uncertainty/index.mjs';
import { makeMismatchReport } from '../multimodal/index.mjs';

export const SHADOW_RUNTIME_VERSION = 'shadow-runtime-v1';

/**
 * Run a provider-neutral shadow evaluation. `provider` is injected by a future
 * adapter; this function never writes D1 or changes a review candidate.
 */
export async function runShadowReview(candidate, { adapters = [], provider = null, image = null, mismatchComparisons = [] } = {}) {
  const input = buildMediumModelInput(candidate, { image, task: image ? 'mismatch_detection' : 'review_assist' });
  const mismatch = makeMismatchReport(input.candidate_id, mismatchComparisons);
  const route = chooseAdapter({ ...input, media: image ? [{ kind: 'image' }] : [] }, adapters);
  if (!route.adapter || typeof provider !== 'function') {
    return { runtime_version: SHADOW_RUNTIME_VERSION, mode: 'shadow', applied: false, route, mismatch, output: null, uncertainty: { abstain: true, route: 'human_review', reasons: ['provider_not_configured'] } };
  }
  const raw = await provider(input, route.adapter);
  const output = normalizeMediumModelOutput(raw, { provider: route.adapter.provider, model: route.adapter.model_version });
  const uncertainty = assessUncertainty(output, { mismatch_detected: mismatch.detected, source_snapshot_hash: input.source.snapshot_hash, parser_incomplete: false });
  return { runtime_version: SHADOW_RUNTIME_VERSION, mode: 'shadow', applied: false, route, mismatch, uncertainty, output: makeShadowResult(input, output, { provider: route.adapter.provider, model: route.adapter.model_version }) };
}
