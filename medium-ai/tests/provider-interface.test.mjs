import test from 'node:test';
import assert from 'node:assert/strict';
import { providerRequest, providerCapabilities } from '../adapters/provider-interface.mjs';

test('provider interface returns normalized success', async () => {
  const adapter = { adapter_id: 'fake-1', provider: 'fake', model_version: '1', capabilities: ['text'], predict: async input => ({ decision: 'review', confidence: input.score || 0.8 }) };
  const result = await providerRequest({ score: 0.9 }, adapter);
  assert.equal(result.ok, true);
  assert.equal(result.output.decision, 'review');
  assert.equal(providerCapabilities(adapter).interface_version, 'provider-interface-v1');
});

test('provider timeout falls back to human review', async () => {
  const adapter = { adapter_id: 'slow-1', provider: 'fake', model_version: '1', predict: () => new Promise(() => {}) };
  const result = await providerRequest({}, adapter, { timeoutMs: 10 });
  assert.equal(result.ok, false);
  assert.equal(result.fallback, 'human_review');
  assert.equal(result.error, 'provider_timeout');
});
