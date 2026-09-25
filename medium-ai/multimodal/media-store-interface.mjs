export const MEDIA_STORE_INTERFACE_VERSION = 'media-store-v1';

export function mediaObjectKey({ candidateId, sha256, kind, mimeType }) {
  if (!Number.isInteger(candidateId) || candidateId < 1) throw new Error('invalid_candidate_id');
  if (!sha256 || !kind || !mimeType) throw new Error('incomplete_media_identity');
  const extension = mimeType.split('/')[1]?.replace(/[^a-z0-9.+-]/gi, '') || 'bin';
  return `medium-ai/candidates/${candidateId}/${kind}/${sha256}.${extension}`;
}

export async function putMediaAsset(store, asset, bytes) {
  if (!store || typeof store.put !== 'function') return { ok: false, status: 'storage_unavailable', fallback: 'human_review' };
  const key = mediaObjectKey(asset);
  await store.put(key, bytes, { httpMetadata: { contentType: asset.mimeType } });
  return { ok: true, key, asset_id: asset.assetId || asset.asset_id, sha256: asset.sha256 };
}

export async function getMediaAsset(store, key) {
  if (!store || typeof store.get !== 'function') return { ok: false, status: 'storage_unavailable', fallback: 'human_review' };
  const object = await store.get(key);
  return object ? { ok: true, object } : { ok: false, status: 'not_found' };
}
