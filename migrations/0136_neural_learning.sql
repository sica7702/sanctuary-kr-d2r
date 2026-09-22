-- Additive and idempotent: no existing item/review/valuation rows are modified.
CREATE TABLE IF NOT EXISTS ai_samples (
 candidate_id INTEGER PRIMARY KEY, listing_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
 sample_hash TEXT NOT NULL, sample_json TEXT NOT NULL, eligible INTEGER NOT NULL,
 reason TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ai_samples_listing ON ai_samples(listing_key);
CREATE TABLE IF NOT EXISTS ai_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO ai_settings(key,value) VALUES ('enabled','true'),('active_model',''),('sync_cursor','0');
INSERT OR IGNORE INTO ai_settings(key,value) VALUES ('review_revision','0'),('synced_revision','-1');
-- A frozen dataset may not be promoted after its source reviews are changed.
CREATE TRIGGER IF NOT EXISTS ai_review_insert AFTER INSERT ON review_candidates BEGIN
 UPDATE ai_settings SET value=CAST(value AS INTEGER)+1 WHERE key='review_revision';
END;
CREATE TRIGGER IF NOT EXISTS ai_review_update AFTER UPDATE OF status,evidence_json,proposal_json,reviewer_tags_json,reviewer_email,learning_eligible,reviewed_at ON review_candidates BEGIN
 UPDATE ai_settings SET value=CAST(value AS INTEGER)+1 WHERE key='review_revision';
 UPDATE ai_settings SET value='' WHERE key='active_model' AND OLD.status IN ('approved','rejected');
END;
CREATE TRIGGER IF NOT EXISTS ai_review_delete AFTER DELETE ON review_candidates BEGIN
 UPDATE ai_settings SET value=CAST(value AS INTEGER)+1 WHERE key='review_revision';
 UPDATE ai_settings SET value='' WHERE key='active_model' AND OLD.status IN ('approved','rejected');
END;
CREATE TABLE IF NOT EXISTS ai_jobs (
 id TEXT PRIMARY KEY, dataset_hash TEXT NOT NULL, status TEXT NOT NULL,
 lease_hash TEXT NOT NULL, lease_until INTEGER NOT NULL, dataset_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 result_json TEXT, error TEXT
);
CREATE INDEX IF NOT EXISTS ai_jobs_created ON ai_jobs(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ai_single_running_job ON ai_jobs(status) WHERE status='running';
CREATE TABLE IF NOT EXISTS ai_job_samples (job_id TEXT NOT NULL, position INTEGER NOT NULL, fold TEXT NOT NULL, sample_json TEXT NOT NULL, PRIMARY KEY(job_id,position));
CREATE TABLE IF NOT EXISTS ai_models (
 id TEXT PRIMARY KEY, job_id TEXT NOT NULL, artifact_json TEXT NOT NULL,
 metrics_json TEXT NOT NULL, passed INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ai_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, detail_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
