# Adapter routing policy v1

- Routing is shadow-only until a model-registry candidate passes the independent holdout gate.
- Text-only baseline tasks may use the small adapter.
- Complex review tasks may use the medium/fine-tuned adapter.
- Image, OCR, or text-image mismatch tasks require a multimodal-capable adapter.
- If no compatible adapter exists, route to human review; never silently fall back to an unverified model.
- Adapter selection does not approve, reject, or change learning eligibility.
