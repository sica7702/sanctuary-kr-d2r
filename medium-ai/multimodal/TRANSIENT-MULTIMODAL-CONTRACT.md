# Transient multimodal contract v1

Multimodal appraisal is non-persistent by default. An uploaded image is held
only for the duration of the analysis request, sent to the configured analyzer,
and discarded after the result is returned.

- No R2, Assets, D1, dataset, or local-file write is performed.
- Logs and error records may contain request IDs and model metadata only; never
  image bytes, data URLs, or source image URLs.
- Supported input types are PNG, JPEG, WebP, and GIF. Invalid types are rejected.
- The transient adapter returns the analyzer result only and does not expose the
  input buffer to callers after completion.
- This path is separate from the crawled text dataset and cannot create training
  records by itself.
