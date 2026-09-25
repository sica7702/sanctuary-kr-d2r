export const TRANSIENT_MULTIMODAL_VERSION = 'transient-multimodal-v1';

const IMAGE_MIME = /^image\/(png|jpeg|webp|gif)$/i;

export async function analyzeTransient({ bytes, mimeType, analyze }) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) throw new Error('invalid_image_bytes');
  if (!IMAGE_MIME.test(String(mimeType || ''))) throw new Error('unsupported_image_type');
  if (typeof analyze !== 'function') throw new Error('missing_analyzer');

  const result = await analyze(bytes, { mimeType });
  return { ok: true, result };
}
