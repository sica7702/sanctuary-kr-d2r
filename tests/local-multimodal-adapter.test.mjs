import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalMultimodalAdapter } from '../local-multimodal-adapter.mjs';

const input = {
  image: 'data:image/png;base64,test',
  ocrResult: { text: '화염 저항 +26%' },
  failureCodes: ['OCR_LOW_CONFIDENCE']
};

function response(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    async json() {
      return payload;
    }
  };
}

test('일치 응답은 verified로 반환한다', async () => {
  const adapter = createLocalMultimodalAdapter({
    fetchImpl: async () => response({
      matches: true,
      result: { text: '화염 저항 +26%' }
    })
  });

  const result = await adapter.verify(input);

  assert.equal(result.status, 'verified');
  assert.equal(result.action, 'continue');
});

test('불일치 응답은 사람 검수로 보낸다', async () => {
  const adapter = createLocalMultimodalAdapter({
    fetchImpl: async () => response({
      matches: false,
      result: { text: '화염 저항 +31%' }
    })
  });

  const result = await adapter.verify(input);

  assert.equal(result.status, 'conflict');
  assert.equal(result.action, 'human_review');
});

test('잘못된 모델 응답은 오류로 처리한다', async () => {
  const adapter = createLocalMultimodalAdapter({
    fetchImpl: async () => response({ result: {} })
  });

  const result = await adapter.verify(input);

  assert.equal(result.status, 'error');
  assert.equal(result.reason, 'INVALID_MODEL_RESPONSE');
});

test('모델 HTTP 오류는 사람 검수로 보낸다', async () => {
  const adapter = createLocalMultimodalAdapter({
    fetchImpl: async () => response({}, false, 503)
  });

  const result = await adapter.verify(input);

  assert.equal(result.status, 'error');
  assert.equal(result.reason, 'MODEL_HTTP_503');
});

test('이미지나 OCR이 없으면 모델을 호출하지 않는다', async () => {
  let called = false;
  const adapter = createLocalMultimodalAdapter({
    fetchImpl: async () => {
      called = true;
      return response({ matches: true });
    }
  });

  const result = await adapter.verify({
    image: null,
    ocrResult: null
  });

  assert.equal(called, false);
  assert.equal(result.status, 'abstain');
  assert.equal(result.reason, 'IMAGE_OR_OCR_MISSING');
});
