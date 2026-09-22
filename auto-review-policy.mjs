import { PARSER_VERSION } from './traderie-integrity.mjs';
import { rareEquipmentSingleQuantity } from './rare-singleton.mjs';
import { canonicalSourceIdentity } from './statistical-shadow.mjs';

// Only verified human decisions on complete source captures may authorize an
// automatic decision. The feature model groups *different* listings; exact
// option values and asking prices are checked for integrity but never used as
// a lookup key.
export const AUTO_REVIEW_POLICY_VERSION = 'auto-review-v2';
const POLICY = Object.freeze({
  holdoutFraction: 0.5,
  minGlobalTrain: 20,
  minGlobalHoldout: 20,
  minEachLabel: 3,
  minCohortTrain: 25,
  minCohortHoldout: 25,
  // One-sided 95% Wilson bound: at least 90% conditional accuracy.
  minLowerBound: 0.90,
  maxCaptureToReviewMs: 72 * 60 * 60 * 1000,
  maxCandidateAgeMs: 48 * 60 * 60 * 1000,
  maxTrainingAgeMs: 180 * 24 * 60 * 60 * 1000,
});

function parsed(value, fallback) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function capture(row) {
  const evidence = parsed(row?.evidence_json ?? row?.evidence, []);
  return Array.isArray(evidence) ? evidence[0] : null;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function sameNumber(a, b) {
  return Number.isFinite(Number(a)) && Number(a) === Number(b);
}

function parseUtc(value) {
  if (typeof value !== 'string') return NaN;
  // D1 datetime('now') returns a timezone-less UTC string.
  const text = value.trim().replace(' ', 'T');
  return Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(text) ? text : `${text}Z`);
}

// A cohort may share numeric option rolls and a price *range*, but must retain
// the option types and market context. Broader summaries must never authorize
// a write: a valuable rare and a worthless rare can occupy the same slot.
function cohortKeys(e) {
  const context = [String(e.slot).toLowerCase(), String(e.price_currency).toLowerCase(),
    String(e.source_snapshot.platform).toLowerCase(), String(e.source_snapshot.game_version).toLowerCase(),
    e.source_snapshot.ladder, e.source_snapshot.hardcore,
    String(e.source_snapshot.region ?? 'unknown').toLowerCase()];
  const band = Math.floor(Math.log2(Number(e.price_amount)));
  const affixKeys = Object.keys(e.affixes).map(key => key.toLowerCase()).sort();
  return [JSON.stringify(['slot_currency_context_price_affixes', ...context, band, affixKeys])];
}

function validMarketCapture(row, now, maxAgeMs) {
  if (!row || row.source_type !== 'market_observation') return { reason: 'wrong_source' };
  const e = capture(row);
  if (!e || e.source !== 'traderie') return { reason: 'missing_source_evidence' };
  const i = e.integrity;
  if (!i || i.parser_version !== PARSER_VERSION || i.complete !== true ||
      i.options_complete !== true || i.price_complete !== true || i.identity_complete !== true ||
      !Array.isArray(i.issues) || i.issues.length !== 0) return { reason: 'source_integrity_incomplete' };
  if (e.parser_quality?.complete !== true || Number(e.parser_quality.property_coverage) < 0.95 ||
      !Array.isArray(e.parser_quality.critical_missing) || e.parser_quality.critical_missing.length !== 0)
    return { reason: 'parser_incomplete' };
  if (e.price_structure?.complete !== true || !sameNumber(e.price_structure?.amount, e.price_amount) ||
      Number(e.price_amount) <= 0 || !e.price_currency || e.price_structure.currency !== e.price_currency)
    return { reason: 'price_incomplete' };
  // Market sale verification is not source-snapshot verification. The Worker
  // independently re-fetches and hashes the source before any auto write.
  const singleton = rareEquipmentSingleQuantity(e.source_snapshot, e.slot);
  if (!e.source_snapshot || !e.source_snapshot_hash ||
      String(e.source_snapshot.id ?? '') !== String(e.listing_id ?? '') ||
      !singleton.single || i.quantity_basis !== singleton.basis ||
      typeof e.source_snapshot.ladder !== 'boolean' || typeof e.source_snapshot.hardcore !== 'boolean' ||
      !e.source_snapshot.platform || !e.source_snapshot.game_version)
    return { reason: 'snapshot_incomplete' };
  if (e.item_type !== '레어' || !e.slot || e.slot === 'other' || !e.base_name)
    return { reason: 'item_identity_incomplete' };
  const sourceIdentity = canonicalSourceIdentity(row);
  if (!sourceIdentity || !/^url:(?:www\.)?traderie\.com\/diablo2resurrected\/listing\/\d+$/i.test(sourceIdentity) ||
      !sourceIdentity.endsWith(`/listing/${e.listing_id}`))
    return { reason: 'source_identity_mismatch' };
  const fetched = parseUtc(e.fetched_at);
  if (!Number.isFinite(fetched) || fetched > now || now - fetched > maxAgeMs)
    return { reason: 'stale_capture' };
  const p = parsed(row.proposal_json ?? row.proposal, null);
  if (!p || p.item_type !== e.item_type || p.slot !== e.slot ||
      p.effects?.market_watch_only !== true || p.effects?.score_delta !== 0 ||
      !sameNumber(p.effects?.observed_price?.amount, e.price_amount) ||
      p.effects?.observed_price?.currency !== e.price_currency ||
      JSON.stringify(stable(p.effects?.observed_price?.structure)) !== JSON.stringify(stable(e.price_structure)) ||
      !p.rule_key || !p.label)
    return { reason: 'proposal_mismatch' };
  const affixes = e.affixes, conditions = p.conditions;
  if (!affixes || !conditions || typeof affixes !== 'object' || typeof conditions !== 'object' ||
      !Object.keys(affixes).length ||
      JSON.stringify(Object.keys(affixes).sort()) !== JSON.stringify(Object.keys(conditions).sort()) ||
      Object.keys(affixes).some(key => !sameNumber(affixes[key], conditions[key]?.gte) ||
        Object.keys(conditions[key] || {}).length !== 1))
    return { reason: 'option_mismatch' };
  const signature = JSON.stringify(stable({
    source: e.source,
    observation_type: e.observation_type,
    item_type: e.item_type,
    slot: e.slot,
    base_name: e.base_name,
    conditions,
    price: { amount: e.price_amount, currency: e.price_currency, structure: e.price_structure },
    context: {
      platform: e.source_snapshot.platform,
      game_version: e.source_snapshot.game_version,
      ladder: e.source_snapshot.ladder,
      hardcore: e.source_snapshot.hardcore,
      region: e.source_snapshot.region ?? null,
    },
  }));
  return { reason: null, identity: `traderie:${e.listing_id}`, signature,
    cohortKeys: cohortKeys(e), capturedAt: fetched };
}

function wilsonLower(successes, total) {
  if (!total) return 0;
  const z = 1.645, p = successes / total, z2 = z * z;
  return (p + z2 / (2 * total) - z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / (1 + z2 / total);
}

function count(records) {
  return records.reduce((result, record) => {
    result[record.label] += 1;
    return result;
  }, { approve: 0, reject: 0 });
}

/**
 * Build a frozen-in-time, independent-listing, chronological validation report.
 * The caller may show this report; it does not mutate data or approve a row.
 */
export function buildAutoReviewPolicyReport(rows, { now = Date.now() } = {}) {
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
  if (!Number.isFinite(now)) throw new TypeError('now must be a timestamp');
  const exclusions = {};
  const exclude = reason => { exclusions[reason] = (exclusions[reason] || 0) + 1; };
  const grouped = new Map();
  for (const row of rows) {
    // An automatic decision must never become its own future training label.
    if (/^(?:auto|system)(?:[-_:]|$)/i.test(String(row?.reviewer_email || '')) ||
        row?.auto_review_policy_version) {
      exclude('automatic_decision'); continue;
    }
    const reason = String(row?.review_reason_type || '');
    const approved = row?.status === 'approved' && reason === 'approved_market_feedback';
    const rejected = row?.status === 'rejected' && reason === 'explicit_market_reject_feedback';
    if (row?.learning_eligible !== 1 && row?.learning_eligible !== true || !(approved || rejected)) {
      exclude('unclean_label'); continue;
    }
    const reviewedAt = parseUtc(row.reviewed_at);
    if (!Number.isFinite(reviewedAt) || reviewedAt > now || now - reviewedAt > POLICY.maxTrainingAgeMs) {
      exclude('stale_review'); continue;
    }
    const check = validMarketCapture(row, reviewedAt, POLICY.maxCaptureToReviewMs);
    if (check.reason) {
      const e = capture(row);
      // Old records may have a human label but no immutable source snapshot.
      // Count them visibly; no retrospective parser claim can repair missing
      // source evidence or qualify them as independent calibration examples.
      exclude(!e?.source_snapshot || !e?.source_snapshot_hash || !e?.price_structure || !e?.fetched_at
        ? 'legacy_unverifiable' : check.reason);
      continue;
    }
    const group = grouped.get(check.identity) || [];
    group.push({ identity: check.identity, signature: check.signature,
      cohortKeys: check.cohortKeys, label: approved ? 'approve' : 'reject', reviewedAt });
    grouped.set(check.identity, group);
  }
  const independent = [];
  for (const group of grouped.values()) {
    if (new Set(group.map(row => `${row.label}|${row.signature}`)).size !== 1) {
      exclude('conflicting_listing'); continue;
    }
    independent.push(group.sort((a, b) => a.reviewedAt - b.reviewedAt)[0]);
    if (group.length > 1) exclusions.duplicate_listing = (exclusions.duplicate_listing || 0) + group.length - 1;
  }
  independent.sort((a, b) => a.reviewedAt - b.reviewedAt || a.identity.localeCompare(b.identity));
  const split = independent.length - Math.ceil(independent.length * POLICY.holdoutFraction);
  const train = independent.slice(0, split), holdout = independent.slice(split);
  const trainLabels = count(train), holdoutLabels = count(holdout);
  const globalReady = train.length >= POLICY.minGlobalTrain && holdout.length >= POLICY.minGlobalHoldout &&
    trainLabels.approve >= POLICY.minEachLabel && trainLabels.reject >= POLICY.minEachLabel &&
    holdoutLabels.approve >= POLICY.minEachLabel && holdoutLabels.reject >= POLICY.minEachLabel;
  const cohorts = {};
  for (const record of train) for (const key of record.cohortKeys) {
    const bucket = cohorts[key] ||= { train: { approve: 0, reject: 0 }, holdout: { approve: 0, reject: 0 } };
    bucket.train[record.label] += 1;
  }
  for (const record of holdout) for (const key of record.cohortKeys) {
    const bucket = cohorts[key] ||= { train: { approve: 0, reject: 0 }, holdout: { approve: 0, reject: 0 } };
    bucket.holdout[record.label] += 1;
  }
  for (const bucket of Object.values(cohorts)) {
    const trainCount = bucket.train.approve + bucket.train.reject;
    const holdoutCount = bucket.holdout.approve + bucket.holdout.reject;
    // Direction is trained on the older half. The later half only tests the
    // frozen choice; it never selects a different direction or feature level.
    const direction = bucket.train.approve > bucket.train.reject ? 'approve' :
      bucket.train.reject > bucket.train.approve ? 'reject' : null;
    const trainBound = direction ? wilsonLower(bucket.train[direction], trainCount) : 0;
    const holdoutBound = direction ? wilsonLower(bucket.holdout[direction], holdoutCount) : 0;
    const lowerBound = Math.min(trainBound, holdoutBound);
    bucket.action = globalReady && trainCount >= POLICY.minCohortTrain &&
      holdoutCount >= POLICY.minCohortHoldout && lowerBound >= POLICY.minLowerBound ? direction : null;
    bucket.train_wilson_lower_bound = trainBound;
    bucket.holdout_wilson_lower_bound = holdoutBound;
    bucket.wilson_lower_bound = lowerBound;
  }
  return {
    policy_version: AUTO_REVIEW_POLICY_VERSION,
    status: globalReady ? 'validated_global_sample' : 'insufficient_data',
    validation: { method: 'chronological_group_holdout', confidence: 0.95,
      bound: 'one_sided_wilson', minimum_conditional_accuracy: POLICY.minLowerBound,
      actionable_cohorts: Object.values(cohorts).filter(bucket => bucket.action).length },
    samples: { input: rows.length, independent: independent.length, train: train.length, holdout: holdout.length,
      trainLabels, holdoutLabels },
    split: { trainThrough: train.length ? new Date(train.at(-1).reviewedAt).toISOString() : null,
      holdoutFrom: holdout.length ? new Date(holdout[0].reviewedAt).toISOString() : null },
    thresholds: { ...POLICY }, exclusions, cohorts,
    reviewed_source_identities: independent.map(row => row.identity),
  };
}

/** Fail-closed operational decision. Never call the old shadow model here. */
export function decideAutoReview(candidate, report, { now = Date.now() } = {}) {
  const abstain = reason => ({ action: 'abstain', reason, policy_version: AUTO_REVIEW_POLICY_VERSION });
  if (candidate?.status !== 'pending') return abstain('not_pending');
  if (!report || report.policy_version !== AUTO_REVIEW_POLICY_VERSION ||
      report.status !== 'validated_global_sample') return abstain('model_not_validated');
  if (!Number.isFinite(now)) return abstain('invalid_clock');
  const check = validMarketCapture(candidate, now, POLICY.maxCandidateAgeMs);
  if (check.reason) return abstain(check.reason);
  if (!Array.isArray(report.reviewed_source_identities)) return abstain('invalid_report');
  if (report.reviewed_source_identities.includes(check.identity)) return abstain('already_reviewed_source');
  // The only operational cohort retains both price range and option types.
  const selected = check.cohortKeys.find(key => {
    const bucket = report.cohorts?.[key];
    return bucket && Number.isSafeInteger(bucket.train?.approve) &&
      Number.isSafeInteger(bucket.train?.reject) &&
      bucket.train.approve + bucket.train.reject >= POLICY.minCohortTrain;
  });
  const cohort = selected ? report.cohorts?.[selected] : null;
  if (!cohort?.action) return abstain('cohort_not_validated');
  // Recheck independently; a malformed or externally forged report must not
  // become an authorization merely by carrying action='approve'.
  if (!['approve', 'reject'].every(label =>
    Number.isSafeInteger(cohort.train?.[label]) && cohort.train[label] >= 0 &&
    Number.isSafeInteger(cohort.holdout?.[label]) && cohort.holdout[label] >= 0))
    return abstain('invalid_report');
  const train = cohort.train.approve + cohort.train.reject;
  const holdout = cohort.holdout.approve + cohort.holdout.reject;
  const action = cohort.action;
  const bound = Math.min(wilsonLower(cohort.train[action], train),
    wilsonLower(cohort.holdout[action], holdout));
  if (!['approve', 'reject'].includes(action) || train < POLICY.minCohortTrain ||
      holdout < POLICY.minCohortHoldout || cohort.train[action] <= train / 2 ||
      bound < POLICY.minLowerBound ||
      Math.abs(cohort.wilson_lower_bound - bound) > 1e-12)
    return abstain('cohort_not_validated');
  return { action, reason: 'grouped_temporal_validation', policy_version: AUTO_REVIEW_POLICY_VERSION,
    source_identity: check.identity, cohort_signature: selected,
    metrics: { independent_train: train, independent_holdout: holdout,
      wilson_lower_bound: bound } };
}
