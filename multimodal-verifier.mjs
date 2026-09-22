/**
 * Provider-neutral multimodal verification adapter.
 * This file does not change the existing OCR engine.
 */

export const MULTIMODAL_STATUS = Object.freeze({
  VERIFIED: 'verified',
  CONFLICT: 'conflict',
  ABSTAIN: 'abstain'
});

function safeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function createMultimodalVerifier(provider = null) {
  return {
    async verify({ image, ocrText, recognizedOptions = [], existingResult = null }) {
      if (!image || !safeText(ocrText)) {
        return {
          status: MULTIMODAL_STATUS.ABSTAIN,
          action: 'preserve_existing',
          reason: 'IMAGE_OR_OCR_MISSING',
          existingResult
        };
      }

      if (!provider || typeof provider.verify !== 'function') {
        return {
          status: MULTIMODAL_STATUS.ABSTAIN,
          action: 'preserve_existing',
          reason: 'MULTIMODAL_PROVIDER_NOT_CONFIGURED',
          existingResult
        };
      }

      let result;
      try {
        result = await provider.verify({ image, ocrText, recognizedOptions });
      } catch (error) {
        return {
          status: MULTIMODAL_STATUS.ABSTAIN,
          action: 'preserve_existing',
          reason: 'MULTIMODAL_PROVIDER_ERROR',
          error: error instanceof Error ? error.message : String(error),
          existingResult
        };
      }

      if (!result || result.matches !== true) {
        return {
          status: MULTIMODAL_STATUS.CONFLICT,
          action: 'human_review',
          reason: 'IMAGE_OCR_CONFLICT',
          providerResult: result ?? null,
          existingResult
        };
      }

      return {
        status: MULTIMODAL_STATUS.VERIFIED,
        action: 'continue',
        reason: null,
        providerResult: result,
        existingResult
      };
    }
  };
}
