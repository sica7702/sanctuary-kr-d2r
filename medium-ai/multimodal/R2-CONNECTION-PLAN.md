# Medium AI R2 connection plan

This document defines the isolated connection point for multimodal media. It does
not change the production Worker or its existing D1/Assets bindings.

## Current state

- Production `wrangler.jsonc` has `DB` and `ASSETS` only.
- Crawl images must not be stored in the static Assets namespace.
- `media-store-interface.mjs` safely falls back to human review when no provider
  is configured.

## Target state

The medium-AI deployment will add an R2 binding named `MEDIUM_MEDIA` in its own
Wrangler configuration. The binding is consumed only by the provider adapter;
the production Worker remains unchanged until a later integration decision.

```jsonc
{
  "r2_buckets": [
    {
      "binding": "MEDIUM_MEDIA",
      "bucket_name": "sanctuary-medium-ai-media"
    }
  ]
}
```

## Safety gates before bucket creation

1. Confirm the bucket name and account/environment.
2. Create the bucket without changing the production Worker.
3. Bind it only in the medium-AI deployment configuration.
4. Run put/get/key-isolation tests with non-production fixtures.
5. Keep missing-storage fallback enabled until the end-to-end test passes.

No bucket is created by this change.
