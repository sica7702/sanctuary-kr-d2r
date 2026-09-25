import assert from 'node:assert/strict';
import test from 'node:test';
import { runMultimodalAnalyzer } from '../multimodal/analyzer-interface.mjs';

test('analyzer interface normalizes provider output and clamps confidence', async () => {
  const result = await runMultimodalAnalyzer({ analyze: async () => ({ label: 'match', confidence: 1.4, provider: 'fixture', model_version: 'fixture-1' }) }, new Uint8Array([1]));
  assert.deepEqual(result, { label: 'match', confidence: 1, abstain: false, provider: 'fixture', model_version: 'fixture-1' });
});

test('analyzer interface abstains when confidence is unavailable', async () => {
  const result = await runMultimodalAnalyzer({ analyze: async () => ({ label: 'uncertain', confidence: 'n/a' }) }, new Uint8Array([1]));
  assert.equal(result.abstain, true);
  assert.equal(result.confidence, null);
});
