import test from 'node:test';
import assert from 'node:assert/strict';
import { PARSER_VERSION } from '../traderie-integrity.mjs';
import { buildAutoReviewPolicyReport, decideAutoReview } from '../auto-review-policy.mjs';

const now = Date.parse('2026-09-22T12:00:00Z');
function candidate(id, action = 'approve', extra = {}) {
  // Different listings have different rolls and asking prices. A model that
  // merely memorizes an exact proposal can never handle a new rare item.
  const price = action === 'approve' ? 8 + id % 8 : 16 + id % 16;
  const life = 30 + id % 7, resist = 10 + id % 5;
  const reviewedAt = new Date(Date.parse('2026-09-20T00:00:00Z') + id * 60_000).toISOString();
  const fetchedAt = new Date(Date.parse(reviewedAt) - 3_600_000).toISOString();
  const evidence = {
    source: 'traderie', listing_id: String(id), item_type: '레어', slot: 'ring',
    base_name: 'Ring', observation_type: 'asking', affixes: { life, resist },
    integrity: { parser_version: PARSER_VERSION, complete: true, options_complete: true,
      price_complete: true, identity_complete: true, quantity_basis:'explicit_single', issues: [] },
    parser_quality: { complete: true, property_coverage: 1, critical_missing: [] },
    price_structure: { complete: true, amount: price, currency: 'Jah' },
    price_amount: price, price_currency: 'Jah', verified: false,
    source_snapshot_hash: 'a'.repeat(64),
    source_snapshot: { id, item:{name:'Rare Ring',rarity:'rare'}, quantity: 1, ladder: true, hardcore: false,
      platform: 'PC', game_version: 'rotw', region: 'Americas' },
    fetched_at: fetchedAt,
  };
  const proposal = { rule_key: `watch_${id}`, label: 'Market watch', item_type: '레어', slot: 'ring',
    conditions: { life: { gte: life }, resist: { gte: resist } },
    effects: { market_watch_only: true, score_delta: 0,
      observed_price: { amount: price, currency: 'Jah',
        structure: { complete: true, amount: price, currency: 'Jah' } } } };
  return {
    id, status: action === 'approve' ? 'approved' : 'rejected',
    review_reason_type: action === 'approve' ? 'approved_market_feedback' : 'explicit_market_reject_feedback',
    learning_eligible: 1, reviewed_at: reviewedAt,
    source_type: 'market_observation', item_type: '레어',
    source_url: `https://traderie.com/diablo2resurrected/listing/${id}`,
    evidence_json: JSON.stringify([evidence]), proposal_json: JSON.stringify(proposal),
    ...extra,
  };
}
function pending(row, id = 99999) {
  const e = JSON.parse(row.evidence_json)[0];
  e.listing_id = String(id);
  e.source_snapshot.id = id;
  e.fetched_at = new Date(now - 3_600_000).toISOString();
  const p = JSON.parse(row.proposal_json);
  p.rule_key = `watch_${id}`;
  return { ...row, id, status: 'pending', reviewed_at: null,
    source_url: `https://traderie.com/diablo2resurrected/listing/${id}`,
    evidence_json: JSON.stringify([e]), proposal_json: JSON.stringify(p) };
}
function validatedRows() {
  return Array.from({ length: 500 }, (_, index) =>
    candidate(index + 1, index % 2 ? 'reject' : 'approve'));
}
function withAffixes(row, affixes) {
  const evidence = JSON.parse(row.evidence_json);
  evidence[0].affixes = affixes;
  const proposal = JSON.parse(row.proposal_json);
  proposal.conditions = Object.fromEntries(
    Object.entries(affixes).map(([key, value]) => [key, { gte: value }]));
  return { ...row, evidence_json: JSON.stringify(evidence), proposal_json: JSON.stringify(proposal) };
}
function withPrice(row, price) {
  const evidence = JSON.parse(row.evidence_json);
  evidence[0].price_amount = price;
  evidence[0].price_structure.amount = price;
  const proposal = JSON.parse(row.proposal_json);
  proposal.effects.observed_price.amount = price;
  proposal.effects.observed_price.structure.amount = price;
  return { ...row, evidence_json: JSON.stringify(evidence), proposal_json: JSON.stringify(proposal) };
}

test('independent chronological validation approves and rejects new rolls in supported price bands', () => {
  const rows = validatedRows();
  const report = buildAutoReviewPolicyReport(rows, { now });
  assert.equal(report.status, 'validated_global_sample');
  assert.deepEqual(report.samples.trainLabels, { approve: 125, reject: 125 });
  assert.deepEqual(report.samples.holdoutLabels, { approve: 125, reject: 125 });
  assert(Date.parse(report.split.trainThrough) < Date.parse(report.split.holdoutFrom));
  assert.deepEqual(buildAutoReviewPolicyReport([...rows].reverse(), { now }).samples, report.samples);
  const approvalCandidate = pending(candidate(1003, 'approve'), 1003);
  const rejectionCandidate = pending(candidate(1002, 'reject'), 1002);
  const approve = decideAutoReview(approvalCandidate, report, { now });
  const reject = decideAutoReview(rejectionCandidate, report, { now });
  assert.equal(approve.action, 'approve');
  assert.equal(reject.action, 'reject');
  assert.ok(approve.metrics.wilson_lower_bound >= report.thresholds.minLowerBound);
  assert.ok(reject.metrics.wilson_lower_bound >= report.thresholds.minLowerBound);
  assert.notEqual(approve.cohort_signature, reject.cohort_signature);
  assert.equal(decideAutoReview(pending(rows[0], 1), report, { now }).reason,
    'already_reviewed_source');
});

test('sparse option-key groups cannot inherit a price-only action', () => {
  const secondOptions = ['resist', 'fcr', 'frw', 'fhr', 'ar', 'dex', 'str', 'mana', 'ias', 'mf'];
  const rows = validatedRows().map((row, index) =>
    withAffixes(row, { life: 30 + index % 7, [secondOptions[Math.floor(index / 2) % 10]]: 10 }));
  const report = buildAutoReviewPolicyReport(rows, { now });
  assert.equal(report.status, 'validated_global_sample');
  const unseen = pending(withAffixes(candidate(1101, 'approve'), { life: 36, allres: 12 }), 1101);
  const decision = decideAutoReview(unseen, report, { now });
  assert.equal(decision.action, 'abstain');
  assert.equal(decision.reason, 'cohort_not_validated');
});

test('different option kinds or a different price band never inherit a validated action', () => {
  const report = buildAutoReviewPolicyReport(validatedRows(), { now });
  assert.equal(decideAutoReview(pending(candidate(1003, 'approve'), 1003), report, { now }).action, 'approve');
  const otherOptions = pending(withAffixes(candidate(1101, 'approve'), { life: 36, allres: 12 }), 1101);
  assert.equal(decideAutoReview(otherOptions, report, { now }).reason, 'cohort_not_validated');
  const otherPrice = pending(withPrice(candidate(1103, 'approve'), 32), 1103);
  assert.equal(decideAutoReview(otherPrice, report, { now }).reason, 'cohort_not_validated');
});

test('all 88-like incomplete captures abstain despite a validated report', () => {
  const rows = validatedRows();
  const report = buildAutoReviewPolicyReport(rows, { now });
  for (let index = 0; index < 88; index++) {
    const row = pending(rows[0], 20000 + index);
    const evidence = JSON.parse(row.evidence_json);
    evidence[0].integrity.complete = false;
    evidence[0].integrity.identity_complete = false;
    row.evidence_json = JSON.stringify(evidence);
    assert.deepEqual(decideAutoReview(row, report, { now }).action, 'abstain');
  }
});

test('enough opposite held-out decisions prevent an automatic action for that cohort', () => {
  const rows = validatedRows();
  // Ten distinct held-out listings in the approval price band were rejected.
  // A single outlier must not be mistaken for a failing Wilson lower bound.
  for (let index = 399; index < 419; index += 2) {
    const opposite = candidate(index + 1, 'approve');
    opposite.status = 'rejected';
    opposite.review_reason_type = 'explicit_market_reject_feedback';
    rows[index] = opposite;
  }
  const report = buildAutoReviewPolicyReport(rows, { now });
  assert.equal(report.status, 'validated_global_sample');
  assert.equal(decideAutoReview(pending(candidate(1003, 'approve'), 1003), report, { now }).reason, 'cohort_not_validated');
});

test('duplicates cannot inflate independent samples and conflicting listing labels are removed', () => {
  const repeated = Array.from({ length: 500 }, (_, i) => {
    const row = candidate(i % 2 ? 2 : 1, i % 2 ? 'reject' : 'approve');
    row.id = i + 1;
    return row;
  });
  const report = buildAutoReviewPolicyReport(repeated, { now });
  assert.equal(report.samples.independent, 2);
  assert.equal(report.status, 'insufficient_data');
  const conflict = candidate(1, 'reject');
  assert.equal(buildAutoReviewPolicyReport([...repeated, conflict], { now }).samples.independent, 1);
});

test('small holdout, review-only, quality, malformed or stale snapshot, and forged report abstain', () => {
  const rows = validatedRows();
  assert.equal(buildAutoReviewPolicyReport(rows.slice(0, 30), { now }).status, 'insufficient_data');
  const cohortShort = buildAutoReviewPolicyReport(rows.slice(0, 80), { now });
  assert.equal(cohortShort.status, 'validated_global_sample');
  assert.equal(decideAutoReview(pending(candidate(1003, 'approve'), 1003), cohortShort, { now }).reason, 'cohort_not_validated');
  const dirty = rows.concat([
    candidate(600, 'approve', { review_reason_type: 'manual_review_only', learning_eligible: 0 }),
    candidate(601, 'reject', { review_reason_type: 'data_quality_feedback', learning_eligible: 0 }),
    candidate(602, 'approve', { reviewer_email: 'auto-review' }),
    candidate(603, 'reject', { auto_review_policy_version: 'auto-review-v2' }),
  ]);
  const report = buildAutoReviewPolicyReport(dirty, { now });
  assert.equal(report.samples.independent, 500);
  assert.equal(report.exclusions.automatic_decision, 2);
  // Traderie asking observations intentionally have verified=false. This is
  // settlement confidence, not a failure of source capture. The Worker
  // independently re-fetches and compares its snapshot before any write.
  assert.equal(decideAutoReview(pending(rows[0]), report, { now }).action, 'approve');
  const malformed = pending(rows[0]);
  const evidence = JSON.parse(malformed.evidence_json);
  evidence[0].source_snapshot_hash = '';
  malformed.evidence_json = JSON.stringify(evidence);
  assert.equal(decideAutoReview(malformed, report, { now }).reason, 'snapshot_incomplete');
  const stale = pending(rows[0]);
  const staleEvidence = JSON.parse(stale.evidence_json);
  staleEvidence[0].fetched_at = '2026-09-01T00:00:00Z';
  stale.evidence_json = JSON.stringify(staleEvidence);
  assert.equal(decideAutoReview(stale, report, { now }).reason, 'stale_capture');
  const forged = structuredClone(report);
  const signature = decideAutoReview(pending(rows[0]), report, { now }).cohort_signature;
  forged.cohorts[signature].holdout.reject = 1;
  assert.equal(decideAutoReview(pending(rows[0]), forged, { now }).reason, 'cohort_not_validated');
});

test('historical incomplete capture never becomes a clean label, even when manually approved', () => {
  const rows = validatedRows().map(row => {
    const evidence = JSON.parse(row.evidence_json);
    evidence[0].integrity.complete = false;
    evidence[0].integrity.identity_complete = false;
    evidence[0].source_snapshot.quantity = null;
    return { ...row, evidence_json: JSON.stringify(evidence) };
  });
  const report = buildAutoReviewPolicyReport(rows, { now });
  assert.equal(report.samples.independent, 0);
  assert.equal(report.exclusions.source_integrity_incomplete, 500);
  assert.equal(report.status, 'insufficient_data');
});

test('verified implicit rare singletons can form clean samples without mutating source quantity', () => {
  const rows = validatedRows().map(row => {
    const evidence = JSON.parse(row.evidence_json);
    delete evidence[0].source_snapshot.quantity;
    evidence[0].source_snapshot.item = { name:'Ring', type:'misc' };
    evidence[0].source_snapshot.properties = [{property:'Rarity',string:'rare'}];
    evidence[0].integrity.quantity_basis = 'implicit_single_nonstackable_rare';
    return { ...row, evidence_json: JSON.stringify(evidence) };
  });
  const report = buildAutoReviewPolicyReport(rows, { now });
  assert.equal(report.samples.independent, 500);
  assert.equal(decideAutoReview(pending(rows[0]), report, { now }).action, 'approve');
  const contaminated = pending(rows[0]);
  const evidence = JSON.parse(contaminated.evidence_json);
  evidence[0].source_snapshot.stock_listing = true;
  contaminated.evidence_json = JSON.stringify(evidence);
  assert.equal(decideAutoReview(contaminated, report, { now }).reason, 'snapshot_incomplete');
  const fabricated = pending(rows[0]);
  const fabricatedEvidence = JSON.parse(fabricated.evidence_json);
  fabricatedEvidence[0].integrity.quantity_basis = 'explicit_single';
  fabricated.evidence_json = JSON.stringify(fabricatedEvidence);
  assert.equal(decideAutoReview(fabricated, report, { now }).reason, 'snapshot_incomplete');
});

test('a changed option or proposed price structure cannot inherit cohort approval', () => {
  const rows = validatedRows();
  const report = buildAutoReviewPolicyReport(rows, { now });
  const optionChanged = pending(rows[0]);
  const optionEvidence = JSON.parse(optionChanged.evidence_json);
  optionEvidence[0].affixes.life += 1;
  optionChanged.evidence_json = JSON.stringify(optionEvidence);
  assert.equal(decideAutoReview(optionChanged, report, { now }).reason, 'option_mismatch');
  const priceChanged = pending(rows[0]);
  const proposal = JSON.parse(priceChanged.proposal_json);
  proposal.effects.observed_price.structure.amount = 999;
  priceChanged.proposal_json = JSON.stringify(proposal);
  assert.equal(decideAutoReview(priceChanged, report, { now }).reason, 'proposal_mismatch');
});
