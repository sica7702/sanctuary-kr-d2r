import { analyzeTransient } from './transient-analysis.mjs';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function handleTransientImage(request, analyze) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), { status: 405, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  const mimeType = request.headers.get('content-type')?.split(';', 1)[0]?.trim() || '';
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_IMAGE_BYTES) return new Response(JSON.stringify({ ok: false, error: 'image_too_large' }), { status: 413, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) return new Response(JSON.stringify({ ok: false, error: 'image_too_large' }), { status: 413, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  try {
    const output = await analyzeTransient({ bytes, mimeType, analyze });
    return new Response(JSON.stringify(output), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (error) {
    const status = error?.message === 'unsupported_image_type' ? 415 : error?.message === 'invalid_image_bytes' ? 400 : 500;
    return new Response(JSON.stringify({ ok: false, error: error?.message || 'analysis_failed' }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
}
