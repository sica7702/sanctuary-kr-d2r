# Dataset contract v1

This is an isolated contract for the future medium-model pipeline. It does not import or rewrite the existing `training-data/` exports.

## Rules

- Human-reviewed records are the only production fine-tuning targets.
- Weak labels can be retained for smoke tests, hard-negative analysis, and candidate prioritization, but are not eligible by default.
- Every trainable record needs a retained source snapshot hash and parser version.
- Records are split by candidate/source snapshot group so the same listing cannot leak across train, validation, test, or holdout.
- The `holdout` split is never used for training or prompt construction.
- Price/asking-price fields remain context only; they are not a value target in this contract.
- Quarantined, duplicate, incomplete, or text/image-conflicting records cannot be promoted without a human review.
