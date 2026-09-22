import test from 'node:test';
import assert from 'node:assert/strict';
import { createOcrRevalidationPipeline } from '../ocr-revalidation-pipeline.mjs';

const validOcr = {
  imagePresent: true,
  text: '화염 저항 +26%',
  confidence: 0.98,
  ocrResult: { text: '화염 저항 +26%' }
};

test('정상 OCR은 멀티모달을 호출하지 않는다', async () => {
  let called = false;
  const pipeline = createOcrRevalidationPipeline({
    verifyMultimodal: async () => { called = true; }
  });

  const result = await pipeline.process(validOcr);

  assert.equal(called, false);
  assert.equal(result.action, 'preserve_existing');
  assert.equal(result.multimodalStatus, 'not_run');
});

test('실패 OCR은 멀티모달 검증을 호출한다', async () => {
  let called = false;
  const pipeline = createOcrRevalidationPipeline({
    verifyMultimodal: async ({ failureCodes }) => {
      called = true;
      return {
        action: 'continue',
        status: 'verified',
        result: { corrected: true, failureCodes }
      };
    }
  });

  const result = await pipeline.process({
    ...validOcr,
    confidence: 0.4
  });

  assert.equal(called, true);
  assert.equal(result.action, 'continue');
  assert.equal(result.multimodalStatus, 'verified');
});

test('모델이 없으면 사람 검수로 보낸다', async () => {
  const pipeline = createOcrRevalidationPipeline();
  const result = await pipeline.process({
    ...validOcr,
    text: '',
    ocrResult: { text: '' }
  });

  assert.equal(result.action, 'human_review');
  assert.equal(result.multimodalStatus, 'unavailable');
});

test('모델 오류도 기존 결과를 보존하고 사람 검수로 보낸다', async () => {
  const existing = { text: '화염 저항 +26%' };
  const pipeline = createOcrRevalidationPipeline({
    verifyMultimodal: async () => {
      throw new Error('local model unavailable');
    }
  });

  const result = await pipeline.process({
    ...validOcr,
    confidence: 0.3,
    ocrResult: existing
  });

  assert.equal(result.action, 'human_review');
  assert.equal(result.multimodalStatus, 'error');
  assert.deepEqual(result.result, existing);
});
