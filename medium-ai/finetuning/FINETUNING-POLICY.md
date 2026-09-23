# Fine-tuning policy v1

- Only `human_verified` records in the `train` split may become production fine-tuning targets.
- `weak_label`, `unlabeled`, `quarantined`, rejected source snapshots, and text/image conflicts are excluded automatically.
- Validation and holdout records are never used to build prompts or training batches.
- SFT/LoRA/QLoRA jobs remain `draft` until the dataset manifest is frozen.
- A completed job becomes a model-registry `candidate` only after an independent holdout report passes.
- Fine-tuning teaches review language and option interpretation; it does not turn asking prices into ground-truth values.
