import test from 'node:test';
import assert from 'node:assert/strict';
import { createOcrReviewLoop } from '../ocr-review-loop.mjs';

test('정상 OCR은 accepted로 처리한다', async () => {
  const loop = createOcrReviewLoop();

  const result = await loop.process({
    imagePresent: true,
    text: '화염 저항 +26%',
    confidence: 0.98,
    options: [
      { name: '화염 저항', value: 26 }
    ]
  });

  assert.equal(result.status, 'accepted');
  assert.equal(result.revalidation.multimodalStatus, 'not_run');
});

test('옵션 값 충돌은 관리자 검수로 보낸다', async () => {
  const loop = createOcrReviewLoop();

  const result = await loop.process({
    imagePresent: true,
    text: '화염 저항',
    confidence: 0.95,
    options: [
      { name: '화염 저항', value: 26 },
      { name: 'fire resist', value: 31 }
    ]
  });

  assert.equal(result.status, 'human_review');
  assert.equal(result.reason, 'OPTION_NORMALIZATION_REVIEW');
});

test('OCR 불확실성은 멀티모달 검증으로 전달한다', async () => {
  let called = false;

  const loop = createOcrReviewLoop({
    verifyMultimodal: async ({ failureCodes }) => {
      called = true;
      return {
        status: 'verified',
        action: 'continue',
        result: { failureCodes }
      };
    }
  });

  const result = await loop.process({
    imagePresent: true,
    text: '화염 저항',
    confidence: 0.4,
    options: [
      { name: '화염 저항', value: 26 }
    ]
  });

  assert.equal(called, true);
  assert.equal(result.status, 'accepted');
  assert.equal(result.revalidation.multimodalStatus, 'verified');
});

test('멀티모달 충돌은 관리자 검수로 보낸다', async () => {
  const loop = createOcrReviewLoop({
    verifyMultimodal: async () => ({
      status: 'conflict',
      action: 'human_review'
    })
  });

  const result = await loop.process({
    imagePresent: true,
    text: '화염 저항',
    confidence: 0.4,
    options: [
      { name: '화염 저항', value: 26 }
    ]
  });

  assert.equal(result.status, 'human_review');
  assert.equal(result.reason, 'conflict');
});
