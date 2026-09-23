# Batch shadow policy v1

The batch runner accepts the existing JSON export format and emits a report only. It is allowed to read review candidates, but it never writes D1, changes a candidate status, or marks a record eligible for learning.

Use it to compare model providers and prompts on the same frozen candidate snapshot before creating a dataset manifest or model-registry candidate.
