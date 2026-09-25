# Provider interface v1

Every future external or Python model adapter must expose:

- `adapter_id`, `provider`, `model_version`
- `capabilities`
- an async `predict(input)` function returning the shared model-output shape

The wrapper normalizes timeout/provider errors into `fallback: human_review`. It does not retry blindly, change candidate status, or write D1. Credentials and network clients belong outside this contract.
