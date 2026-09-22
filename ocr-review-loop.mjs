import { normalizeOptions } from './option-normalizer.mjs';
import { createOcrRevalidationPipeline } from './ocr-revalidation-pipeline.mjs';

export function createOcrReviewLoop({ verifyMultimodal } = {}) {
  const revalidation = createOcrRevalidationPipeline({
    verifyMultimodal
  });

  return {
    async process(input = {}) {
      const normalized = normalizeOptions(input.options ?? []);

      const pipelineResult = await revalidation.process({
        imagePresent: input.imagePresent === true,
        image: input.image ?? null,
        text: input.text ?? '',
        confidence: input.confidence,
        options: input.options ?? [],
        ocrResult: {
          text: input.text ?? '',
          options: normalized.normalized,
          unresolved: normalized.unresolved,
          conflicts: normalized.conflicts
        }
      });

      if (normalized.needsReview || pipelineResult.action === 'human_review') {
        return {
          status: 'human_review',
          reason: normalized.needsReview
            ? 'OPTION_NORMALIZATION_REVIEW'
            : pipelineResult.multimodalStatus,
          normalized,
          revalidation: pipelineResult
        };
      }

      return {
        status: 'accepted',
        normalized,
        revalidation: pipelineResult
      };
    }
  };
}
