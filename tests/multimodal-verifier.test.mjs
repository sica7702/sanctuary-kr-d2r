import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultimodalVerifier } from '../multimodal-verifier.mjs';

test('provider가 없으면 기존 결과를 보존한다', async () => {
  const verifier = createMultimodalVerifier();
  const result = await verifier.verify({
    image: { name: 'item.png' },
    ocrText: '화염 저항 +26%',
    existingResult: { value_grade: 'trade' }
  });
  assert.equal(result.action, 'preserve_existing');
  assert.equal(result.reason, 'MULTIMODAL_PROVIDER_NOT_CONFIGURED');
});

test('모델이 일치한다고 판정하면 계속 진행한다', async () => {
  const verifier = createMultimodalVerifier({
    verify: async () => ({ matches: true, confidence: 0.99 })
  });
  const result = await verifier.verify({
    image: { name: 'item.png' },
    ocrText: '화염 저항 +26%'
  });
  assert.equal(result.action, 'continue');
  assert.equal(result.status, 'verified');
});

test('모델과 OCR이 충돌하면 사람 검수로 보낸다', async () => {
  const verifier = createMultimodalVerifier({
    verify: async () => ({ matches: false, confidence: 0.91 })
  });
  const result = await verifier.verify({
    image: { name: 'item.png' },
    ocrText: '화염 저항 +26%'
  });
  assert.equal(result.action, 'human_review');
  assert.equal(result.reason, 'IMAGE_OCR_CONFLICT');
});

test('모델 오류가 발생하면 자동 확정하지 않는다', async () => {
  const verifier = createMultimodalVerifier({
    verify: async () => { throw new Error('provider unavailable'); }
  });
  const result = await verifier.verify({
    image: { name: 'item.png' },
    ocrText: '화염 저항 +26%'
  });
  assert.equal(result.action, 'preserve_existing');
  assert.equal(result.reason, 'MULTIMODAL_PROVIDER_ERROR');
});
