import assert from 'node:assert/strict';
import test from 'node:test';
import { handleTransientImage } from '../multimodal/transient-http-handler.mjs';

test('transient HTTP handler returns analysis and no-store headers', async () => {
  const request = new Request('https://example.test/api/transient-image', { method: 'POST', headers: { 'content-type': 'image/png' }, body: new Uint8Array([1, 2]) });
  const response = await handleTransientImage(request, async () => ({ label: 'ok' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { ok: true, result: { label: 'ok' } });
});

test('transient HTTP handler rejects non-POST and oversized images', async () => {
  const getResponse = await handleTransientImage(new Request('https://example.test', { method: 'GET' }), async () => ({}));
  assert.equal(getResponse.status, 405);
  const huge = new Uint8Array(5 * 1024 * 1024 + 1);
  const largeResponse = await handleTransientImage(new Request('https://example.test', { method: 'POST', headers: { 'content-type': 'image/png' }, body: huge }), async () => ({}));
  assert.equal(largeResponse.status, 413);
});
