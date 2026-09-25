import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeTransient } from '../multimodal/transient-analysis.mjs';

test('transient analysis returns result without persistence', async () => {
  let received;
  const bytes = new Uint8Array([1, 2, 3]);
  const output = await analyzeTransient({
    bytes,
    mimeType: 'image/png',
    analyze: async (input, meta) => {
      received = { input, meta };
      return { label: 'ok', confidence: 0.9 };
    },
  });
  assert.deepEqual(output, { ok: true, result: { label: 'ok', confidence: 0.9 } });
  assert.equal(received.input, bytes);
  assert.deepEqual(received.meta, { mimeType: 'image/png' });
  assert.equal('bytes' in output, false);
});

test('transient analysis rejects unsupported input without calling analyzer', async () => {
  let called = false;
  await assert.rejects(
    analyzeTransient({ bytes: new Uint8Array([1]), mimeType: 'application/pdf', analyze: async () => { called = true; } }),
    { message: 'unsupported_image_type' },
  );
  assert.equal(called, false);
});
