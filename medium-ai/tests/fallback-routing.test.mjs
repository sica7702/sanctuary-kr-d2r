import assert from 'node:assert/strict';
import test from 'node:test';
import { needsMultimodalFallback, routeImageAppraisal } from '../multimodal/fallback-routing.mjs';

test('fallback is not used for a complete high-confidence primary result', async () => {
  let called = false;
  const result = await routeImageAppraisal({ bytes: new Uint8Array([1]), primary: { analyze: async () => ({ confidence: 0.95, optionsComplete: true }) }, fallback: { analyze: async () => { called = true; } } });
  assert.equal(result.route, 'primary');
  assert.equal(called, false);
});

test('fallback is used when options are incomplete', async () => {
  const result = await routeImageAppraisal({ bytes: new Uint8Array([1]), primary: { analyze: async () => ({ confidence: 0.95, optionsComplete: false }) }, fallback: { analyze: async () => ({ label: 'rechecked', confidence: 0.9 }) } });
  assert.equal(result.route, 'multimodal_fallback');
  assert.equal(result.primary_result.optionsComplete, false);
});

test('primary result is preserved when fallback is unavailable', async () => {
  const result = await routeImageAppraisal({ bytes: new Uint8Array([1]), primary: { analyze: async () => ({ confidence: 0.2 }) } });
  assert.equal(result.route, 'primary_uncertain');
  assert.equal(result.fallback_status, 'unavailable');
  assert.equal(needsMultimodalFallback(result), true);
});
