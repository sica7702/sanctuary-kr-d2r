# Multimodal pipeline v1

This is an isolated preparation layer. It does not download images, call an OCR provider, change `review_candidates`, or affect automatic approval.

Flow:

`candidate_id → media assets (image/OCR/source text) → normalized comparison → mismatch report → shadow evaluation → human review`

Rules:

- Raw source JSON remains authoritative and is never overwritten by OCR.
- Every asset is content-addressed with a SHA-256 value and linked to a candidate.
- OCR is evidence, not an automatic correction.
- Item type, slot, or source identity mismatch is high severity and requires human review.
- Option/price mismatch is a review signal; it does not become a value label.
- The mismatch report is suitable for the future medium-model input contract, but no production route imports it yet.
