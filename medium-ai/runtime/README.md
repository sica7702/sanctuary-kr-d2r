# Shadow runtime

The shadow runtime is the only integration boundary before production wiring. It composes the input contract, adapter routing, multimodal mismatch report, and uncertainty gate.

It is intentionally side-effect free:

- no D1 writes;
- no candidate status changes;
- no learning eligibility changes;
- no automatic approval or rejection;
- provider calls are injected, so local tests can use a fake provider.

Promotion to an active runtime requires the model registry, independent holdout evaluation, and rollback pointer to be integrated in a later step.
