# Medium AI extension (scaffold)

This tree is intentionally isolated from the existing Worker, admin UI, parser, and D1 write paths. Nothing here is imported by production code in step 1.

The extension will be integrated one boundary at a time, with shadow evaluation before any status or learning decision can change.

## Planned boundaries

- `contracts/` — stable model input/output contracts
- `multimodal/` — image, OCR, text-image consistency pipeline
- `datasets/` — versioned training/evaluation datasets and manifests
- `evaluation/` — independent holdout evaluation and regression gates
- `model-registry/` — model/adaptor versions and promotion metadata
- `uncertainty/` — confidence calibration and human-review abstention
- `rollback/` — reversible promotion and incident recovery records
- `adapters/` — provider/base-model adapters
- `finetuning/` — fine-tuning/LoRA preparation only
- `tests/` — extension-only contract and evaluation tests
