import test from 'node:test';
import assert from 'node:assert/strict';
import { runShadowReview } from '../runtime/shadow-runner.mjs';

const adapter = { adapter_id: 'medium-shadow-1', provider: 'fake', model_kind: 'medium', model_version: 'm1', contract_version: 'medium-body-v1', mode: 'shadow', capabilities: ['text', 'structured_output'] };
const candidate = { id: 12, item_type: 'rare', title: 'Test item', source_type: 'market_observation', source_url: 'https://example.invalid', evidence: [{ source_snapshot: { title: 'Test item' }, source_snapshot_hash: 'a'.repeat(64), affixes: [{ text: 'required level 5' }], slot: 'boots' }], proposal_json: '{}' };

test('shadow runtime is side-effect free when provider is absent', async () => {
  const result = await runShadowReview(candidate, { adapters: [adapter] });
  assert.equal(result.mode, 'shadow');
  assert.equal(result.applied, false);
  assert.equal(result.uncertainty.abstain, true);
});

test('shadow runtime normalizes provider result without applying it', async () => {
  const result = await runShadowReview(candidate, { adapters: [adapter], provider: async () => ({ decision: 'review', confidence: 0.8, tags: ['option_clear'], reasons: ['test'], requires_human_review: true, source_snapshot_hash: 'a'.repeat(64) }) });
  assert.equal(result.output.applied, false);
  assert.equal(result.output.output.decision, 'review');
  assert.equal(result.uncertainty.abstain, true);
});
