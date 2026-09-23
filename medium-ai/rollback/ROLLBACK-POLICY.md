# Rollback policy v1

- Keep the previous active model pointer until the new model passes the holdout gate.
- Roll back on a material rise in false approvals, source/option mismatch, or human-review disagreement.
- A rollback changes the model pointer, not the retained source data or human labels.
- Every rollback records the previous model, replacement model, reason, incident reference, and actor.
- Rollback is reversible; no model or dataset is deleted.
