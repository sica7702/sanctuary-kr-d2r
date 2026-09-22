import { detectOcrFailures } from './ocr-failure-detector.mjs';

export function createOcrRevalidationPipeline({ verifyMultimodal } = {}) {
  return {
    async process(input = {}) {
      const detection = detectOcrFailures(input);

      if (!detection.needsMultimodal) {
        return {
          action: 'preserve_existing',
          multimodalStatus: 'not_run',
          failureCodes: [],
          result: input.ocrResult ?? null
        };
      }

      if (typeof verifyMultimodal !== 'function') {
        return {
          action: 'human_review',
          multimodalStatus: 'unavailable',
          failureCodes: detection.failureCodes,
          result: input.ocrResult ?? null
        };
      }

      try {
        const verification = await verifyMultimodal({
          image: input.image ?? null,
          ocrResult: input.ocrResult ?? null,
          failureCodes: detection.failureCodes
        });

        return {
          action: verification?.action ?? 'human_review',
          multimodalStatus: verification?.status ?? 'abstain',
          failureCodes: detection.failureCodes,
          result: verification?.result ?? input.ocrResult ?? null
        };
      } catch (error) {
        return {
          action: 'human_review',
          multimodalStatus: 'error',
          failureCodes: detection.failureCodes,
          error: error instanceof Error ? error.message : String(error),
          result: input.ocrResult ?? null
        };
      }
    }
  };
}
