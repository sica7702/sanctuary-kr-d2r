import test from 'node:test';
import assert from 'node:assert/strict';

function validateImageInput(input) {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'INVALID_INPUT' };
  if (!input.image_present) return { ok: false, reason: 'IMAGE_MISSING' };
  if (!input.image_supported) return { ok: false, reason: 'IMAGE_UNSUPPORTED' };
  if (input.image_corrupt) return { ok: false, reason: 'IMAGE_CORRUPT' };
  if (!input.ocr_text || input.ocr_text.trim() === '') return { ok: false, reason: 'OCR_EMPTY' };
  return { ok: true, reason: null };
}

function classifyOcrEvidence(input) {
  const unresolved = Array.isArray(input.unresolved_options) ? input.unresolved_options : [];
  const duplicates = Array.isArray(input.duplicate_options) ? input.duplicate_options : [];
  const conflicts = Array.isArray(input.conflicts) ? input.conflicts : [];
  if (unresolved.length > 0) return { action: 'human_review', reason: 'OCR_UNRESOLVED' };
  if (duplicates.length > 0) return { action: 'human_review', reason: 'OPTION_DUPLICATE' };
  if (conflicts.length > 0) return { action: 'human_review', reason: 'IMAGE_OCR_CONFLICT' };
  return { action: 'continue', reason: null };
}

test('valid image and OCR input continues', () => {
  assert.deepEqual(validateImageInput({
    image_present: true,
    image_supported: true,
    image_corrupt: false,
    ocr_text: '화염 저항 +26%'
  }), { ok: true, reason: null });
});

test('missing or invalid image is rejected', () => {
  assert.equal(validateImageInput({ image_present: false }).reason, 'IMAGE_MISSING');
  assert.equal(validateImageInput({ image_present: true, image_supported: false }).reason, 'IMAGE_UNSUPPORTED');
  assert.equal(validateImageInput({ image_present: true, image_supported: true, image_corrupt: true }).reason, 'IMAGE_CORRUPT');
});

test('empty OCR is not automatically appraised', () => {
  const result = validateImageInput({
    image_present: true,
    image_supported: true,
    image_corrupt: false,
    ocr_text: ''
  });
  assert.deepEqual(result, { ok: false, reason: 'OCR_EMPTY' });
});

test('unresolved, duplicate, and conflicting options require human review', () => {
  assert.deepEqual(classifyOcrEvidence({ unresolved_options: ['UNKNOWN'] }), { action: 'human_review', reason: 'OCR_UNRESOLVED' });
  assert.deepEqual(classifyOcrEvidence({ duplicate_options: ['FIRE_RESIST'] }), { action: 'human_review', reason: 'OPTION_DUPLICATE' });
  assert.deepEqual(classifyOcrEvidence({ conflicts: ['IMAGE_VS_OCR'] }), { action: 'human_review', reason: 'IMAGE_OCR_CONFLICT' });
});

test('clear OCR evidence may continue to normalization', () => {
  assert.deepEqual(classifyOcrEvidence({ unresolved_options: [], duplicate_options: [], conflicts: [] }), { action: 'continue', reason: null });
});
