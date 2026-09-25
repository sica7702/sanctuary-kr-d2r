import assert from 'node:assert/strict';
import test from 'node:test';
import { getMediaAsset, mediaObjectKey, putMediaAsset } from '../multimodal/media-store-interface.mjs';

test('media object key is content addressed and candidate scoped', () => {
  assert.equal(mediaObjectKey({ candidateId: 12, sha256: 'abc123', kind: 'image', mimeType: 'image/webp' }), 'medium-ai/candidates/12/image/abc123.webp');
});

test('missing store falls back to human review', async () => {
  assert.deepEqual(await putMediaAsset(null, { candidateId: 1, sha256: 'abc', kind: 'image', mimeType: 'image/png' }, new Uint8Array()), { ok: false, status: 'storage_unavailable', fallback: 'human_review' });
  assert.deepEqual(await getMediaAsset(null, 'x'), { ok: false, status: 'storage_unavailable', fallback: 'human_review' });
});
