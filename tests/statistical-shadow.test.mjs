import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatisticalShadowReport, canonicalSourceIdentity, predictApprovalProbability } from '../statistical-shadow.mjs';

const row = (id, status, day, extra = {}) => ({
  id,
  status,
  source_type: 'traderie',
  item_type: 'rare',
  confidence: 0.9,
  source_url: `https://traderie.com/diablo2resurrected/listing/${id}`,
  reviewed_at: `2026-09-${String(day).padStart(2, '0')}T00:00:00Z`,
  ...extra,
});

test('tiny and one-sided datasets cannot pass the sample gate', () => {
  const report = buildStatisticalShadowReport([row(1, 'approved', 1), row(2, 'approved', 2)]);
  assert.equal(report.status, 'insufficient_data');
  assert.equal(report.metrics.sampleGatePassed, false);
  assert.equal(report.target, 'admin_approval_probability');
  assert.equal(report.model.mode, 'shadow_only');
  assert.equal(report.samples.train, 1);
  assert.equal(report.samples.holdout, 1);
});

test('canonical listing identity deduplicates query variants and drops conflicting labels', () => {
  const first = row(100, 'approved', 1);
  const repeated = row(101, 'approved', 2, { source_url: `${first.source_url}?sort=newest` });
  const conflict = row(100, 'rejected', 3, { source_url: `${first.source_url}?filter=rare` });
  assert.equal(canonicalSourceIdentity(first), canonicalSourceIdentity(repeated));
  const report = buildStatisticalShadowReport([first, repeated, conflict, row(200, 'rejected', 4)]);
  assert.equal(report.samples.independentGroups, 1);
  assert.equal(report.exclusions.conflictingGroups, 1);
  assert.equal(report.exclusions.duplicateRows, 0);

  const nonConflicting = buildStatisticalShadowReport([first, repeated, row(200, 'rejected', 4)]);
  assert.equal(nonConflicting.samples.independentGroups, 2);
  assert.equal(nonConflicting.exclusions.duplicateRows, 1);
});

test('reviewer and proposal fields do not leak into features or predictions', () => {
  const base = [row(1, 'approved', 1), row(2, 'rejected', 2), row(3, 'approved', 3), row(4, 'rejected', 4)];
  const injected = base.map((entry) => ({
    ...entry,
    score_delta: 10000,
    proposed_price: 999999,
    reviewer_id: 'admin',
    review_note: 'approved',
    proposal: { approved: true, appraisal_score: 100 },
  }));
  assert.deepEqual(buildStatisticalShadowReport(base), buildStatisticalShadowReport(injected));
  const report = buildStatisticalShadowReport(base);
  const target = { source_type: 'traderie', item_type: 'rare', confidence: 0.9 };
  assert.deepEqual(
    predictApprovalProbability(report, { ...target, status: 'approved', proposed_price: 999999 }),
    predictApprovalProbability(report, { ...target, status: 'rejected', proposed_price: -1 }),
  );
});

test('manual-review-only rows and unlabeled states are excluded', () => {
  const report = buildStatisticalShadowReport([
    row(1, 'approved', 1),
    row(2, 'approved', 2, { review_reason_type: 'manual_review_only' }),
    row(3, 'pending', 3),
  ]);
  assert.equal(report.exclusions.manualReviewOnly, 1);
  assert.equal(report.exclusions.unlabeled, 1);
  assert.equal(report.samples.independentGroups, 1);
});

test('a database candidate ID alone is not an independent listing identity', () => {
  const candidate = row(1, 'approved', 1, { source_url: '', dedupe_key: '' });
  assert.equal(canonicalSourceIdentity(candidate), null);
  const report = buildStatisticalShadowReport([candidate, row(2, 'rejected', 2)]);
  assert.equal(report.exclusions.missingIdentity, 1);
  assert.equal(report.samples.independentGroups, 1);
});

test('chronological group-level holdout uses the newest independent listings', () => {
  const rows = Array.from({ length: 10 }, (_, index) => row(index + 1, index % 2 ? 'rejected' : 'approved', index + 1));
  rows.push(row(99, 'approved', 11, { source_url: `${rows[0].source_url}?recently_seen=1` }));
  const report = buildStatisticalShadowReport(rows, { minTrain: 2, minHoldout: 2, minCohort: 2 });
  assert.equal(report.samples.independentGroups, 10);
  assert.equal(report.samples.train, 8);
  assert.equal(report.samples.holdout, 2);
  assert.equal(report.split.trainThrough, '2026-09-08T00:00:00.000Z');
  assert.equal(report.split.holdoutFrom, '2026-09-09T00:00:00.000Z');
  assert.equal(report.metrics.sampleGatePassed, true);
  assert.ok(Number.isFinite(report.metrics.brier));
  assert.ok(Number.isFinite(report.metrics.baselineBrier));
  assert.deepEqual(JSON.parse(JSON.stringify(report)).model, report.model);
});
