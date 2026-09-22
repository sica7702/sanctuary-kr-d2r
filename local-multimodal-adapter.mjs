export function createLocalMultimodalAdapter({
  endpoint = process.env.LOCAL_MULTIMODAL_URL ?? 'http://127.0.0.1:8000/verify',
  fetchImpl = globalThis.fetch,
  timeoutMs = 30000
} = {}) {
  return {
    async verify({ image, ocrResult, failureCodes = [] } = {}) {
      if (!image || !ocrResult) {
        return {
          status: 'abstain',
          action: 'human_review',
          reason: 'IMAGE_OR_OCR_MISSING'
        };
      }

      if (typeof fetchImpl !== 'function') {
        return {
          status: 'error',
          action: 'human_review',
          reason: 'FETCH_UNAVAILABLE'
        };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ image, ocrResult, failureCodes }),
          signal: controller.signal
        });

        if (!response.ok) {
          return {
            status: 'error',
            action: 'human_review',
            reason: `MODEL_HTTP_${response.status}`
          };
        }

        const payload = await response.json();

        if (typeof payload.matches !== 'boolean') {
          return {
            status: 'error',
            action: 'human_review',
            reason: 'INVALID_MODEL_RESPONSE'
          };
        }

        return {
          status: payload.matches ? 'verified' : 'conflict',
          action: payload.matches ? 'continue' : 'human_review',
          result: payload.result ?? null,
          reason: payload.matches
            ? 'IMAGE_OCR_MATCH'
            : 'IMAGE_OCR_CONFLICT'
        };
      } catch (error) {
        return {
          status: 'error',
          action: 'human_review',
          reason: error?.name === 'AbortError'
            ? 'MODEL_TIMEOUT'
            : 'MODEL_UNAVAILABLE'
        };
      } finally {
        clearTimeout(timer);
      }
    }
  };
}
