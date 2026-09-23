export const MULTIMODAL_VERSION = 'multimodal-v1';

const FIELDS = Object.freeze(['item_type', 'slot', 'base_name', 'option', 'quantity', 'price', 'source_identity']);

export function assetKey(candidateId, sha256) {
  return `candidate-${Number(candidateId)}:asset-${String(sha256 || 'unknown')}`;
}

export function buildMediaInput({ candidateId, sourceText = null, ocrText = null, image = null } = {}) {
  const media = [];
  if (sourceText) media.push({ kind: 'source_text', mime_type: 'text/plain', uri: `candidate://${candidateId}/source-text`, sha256: sourceText.sha256 || null, text: sourceText.text || '' });
  if (ocrText) media.push({ kind: 'ocr_text', mime_type: 'text/plain', uri: `candidate://${candidateId}/ocr-text`, sha256: ocrText.sha256 || null, text: ocrText.text || '' });
  if (image) media.push({ kind: 'image', mime_type: image.mime_type || 'image/*', uri: image.uri || `candidate://${candidateId}/image`, sha256: image.sha256 || null });
  return { version: MULTIMODAL_VERSION, candidate_id: Number(candidateId), media };
}

export function makeMismatchReport(candidateId, comparisons = []) {
  const normalized = Array.isArray(comparisons) ? comparisons.filter(item => FIELDS.includes(item?.field)).map(item => ({
    field: item.field, text_value: item.text_value ?? null, image_value: item.image_value ?? null,
    confidence: Number.isFinite(Number(item.confidence)) ? Math.max(0, Math.min(1, Number(item.confidence))) : null,
  })) : [];
  const fields = [...new Set(normalized.filter(item => JSON.stringify(item.text_value) !== JSON.stringify(item.image_value)).map(item => item.field))];
  const severity = fields.includes('item_type') || fields.includes('slot') || fields.includes('source_identity') ? 'high' : fields.length ? 'medium' : 'none';
  return { report_version: 'mismatch-v1', candidate_id: Number(candidateId), detected: fields.length > 0, fields, severity, comparisons: normalized, requires_human_review: fields.length > 0, created_at: new Date().toISOString() };
}
