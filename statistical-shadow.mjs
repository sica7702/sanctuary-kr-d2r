/**
 * Conservative, read-only statistical shadow model for admin review outcomes.
 *
 * The target is the probability that a review candidate is approved. It is NOT
 * an item price, an appraisal score, or a recommendation to auto-approve.
 * Only immutable capture metadata is used as a feature. Review reasons are
 * consulted solely to exclude manual-review-only records.
 */

const DEFAULTS = Object.freeze({
  holdoutFraction: 0.2,
  minTrain: 30,
  minHoldout: 10,
  minCohort: 5,
  priorStrength: 6,
  minImprovement: 0,
});

function clean(value) {
  return String(value ?? '').trim().toLowerCase();
}

function approvalLabel(status) {
  const value = clean(status);
  if (value === 'approved' || value === 'approve') return 1;
  if (value === 'rejected' || value === 'reject' || value === 'discarded') return 0;
  return null;
}

function isManualReviewOnly(row) {
  const reason = clean(row.review_reason_type);
  return reason === 'manual_review_only' || reason === 'review_only';
}

export function canonicalSourceIdentity(row) {
  const sourceUrl = String(row.source_url ?? '').trim();
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        // The same listing often arrives with different search/filter parameters.
        const path = url.pathname.replace(/\/+$/, '') || '/';
        return `url:${url.hostname.toLowerCase()}${path}`;
      }
    } catch {
      // An invalid URL cannot be treated as an independent listing identity.
    }
  }
  const dedupeKey = clean(row.dedupe_key);
  if (dedupeKey) return `dedupe:${dedupeKey}`;
  // Candidate IDs are database row IDs, not independent market evidence.
  return null;
}

function confidenceBucket(confidence) {
  if (confidence === null || confidence === undefined || confidence === '') return 'unknown';
  let value = Number(confidence);
  if (!Number.isFinite(value) || value < 0) return 'unknown';
  if (value > 1 && value <= 100) value /= 100;
  if (value > 1) return 'unknown';
  if (value < 0.5) return 'low';
  if (value < 0.8) return 'medium';
  return 'high';
}

function featureSnapshot(row) {
  return {
    source_type: clean(row.source_type) || 'unknown',
    item_type: clean(row.item_type) || 'unknown',
    confidence_bucket: confidenceBucket(row.confidence),
  };
}

function cohortKeys(features) {
  return [
    `exact|${features.source_type}|${features.item_type}|${features.confidence_bucket}`,
    `source_item|${features.source_type}|${features.item_type}`,
    `source|${features.source_type}`,
  ];
}

function addCount(counts, key, label) {
  const current = counts[key] ?? { approved: 0, rejected: 0 };
  current[label ? 'approved' : 'rejected'] += 1;
  counts[key] = current;
}

function countTotal(count) {
  return count.approved + count.rejected;
}

function predictWithModel(model, features) {
  const keys = cohortKeys(features);
  const selected = keys.find((key) => countTotal(model.cohorts[key] ?? { approved: 0, rejected: 0 }) >= model.minCohort);
  const count = selected ? model.cohorts[selected] : { approved: 0, rejected: 0 };
  const strength = model.priorStrength;
  const probability = (count.approved + strength * model.baselineProbability) / (countTotal(count) + strength);
  return {
    probability,
    cohort: selected ?? 'global',
    cohortSample: countTotal(count),
    target: 'admin_approval_probability',
    action: 'review_only',
  };
}

export function predictApprovalProbability(report, candidate) {
  if (!report?.model) throw new TypeError('A statistical shadow report is required');
  // Intentionally never inspect candidate.status, review reason, or proposals.
  return predictWithModel(report.model, featureSnapshot(candidate ?? {}));
}

function brier(predictions, labels) {
  if (predictions.length === 0) return null;
  return predictions.reduce((sum, probability, index) => sum + (probability - labels[index]) ** 2, 0) / predictions.length;
}

export function buildStatisticalShadowReport(rows, options = {}) {
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
  const settings = { ...DEFAULTS, ...options };
  if (!(settings.holdoutFraction > 0 && settings.holdoutFraction < 1)) throw new RangeError('holdoutFraction must be between 0 and 1');
  if (!Number.isInteger(settings.minTrain) || settings.minTrain < 1) throw new RangeError('minTrain must be a positive integer');
  if (!Number.isInteger(settings.minHoldout) || settings.minHoldout < 1) throw new RangeError('minHoldout must be a positive integer');
  if (!Number.isInteger(settings.minCohort) || settings.minCohort < 1) throw new RangeError('minCohort must be a positive integer');
  if (!(settings.priorStrength > 0)) throw new RangeError('priorStrength must be positive');

  const grouped = new Map();
  const exclusions = { unlabeled: 0, manualReviewOnly: 0, invalidTimestamp: 0, missingIdentity: 0, conflictingGroups: 0, duplicateRows: 0 };
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    if (isManualReviewOnly(row)) { exclusions.manualReviewOnly += 1; continue; }
    const label = approvalLabel(row.status);
    if (label === null) { exclusions.unlabeled += 1; continue; }
    const timestamp = Date.parse(row.reviewed_at);
    if (!Number.isFinite(timestamp)) { exclusions.invalidTimestamp += 1; continue; }
    const identity = canonicalSourceIdentity(row);
    if (!identity) { exclusions.missingIdentity += 1; continue; }
    const record = { identity, label, timestamp, features: featureSnapshot(row) };
    const group = grouped.get(identity) ?? [];
    group.push(record);
    grouped.set(identity, group);
  }

  const examples = [];
  for (const group of grouped.values()) {
    if (new Set(group.map((record) => record.label)).size !== 1) {
      exclusions.conflictingGroups += 1;
      continue;
    }
    group.sort((left, right) => left.timestamp - right.timestamp);
    examples.push(group[0]);
    exclusions.duplicateRows += group.length - 1;
  }
  examples.sort((left, right) => left.timestamp - right.timestamp || left.identity.localeCompare(right.identity));

  const holdoutCount = examples.length > 1 ? Math.max(1, Math.ceil(examples.length * settings.holdoutFraction)) : 0;
  const train = examples.slice(0, examples.length - holdoutCount);
  const holdout = examples.slice(examples.length - holdoutCount);
  const approved = train.reduce((sum, record) => sum + record.label, 0);
  const baselineProbability = (approved + 1) / (train.length + 2);
  const cohorts = {};
  for (const record of train) for (const key of cohortKeys(record.features)) addCount(cohorts, key, record.label);
  const model = {
    target: 'admin_approval_probability',
    mode: 'shadow_only',
    baselineProbability,
    minCohort: settings.minCohort,
    priorStrength: settings.priorStrength,
    cohorts,
  };
  const predictions = holdout.map((record) => predictWithModel(model, record.features).probability);
  const labels = holdout.map((record) => record.label);
  const modelBrier = brier(predictions, labels);
  const baselineBrier = brier(labels.map(() => baselineProbability), labels);
  const bothLabels = approved > 0 && approved < train.length && holdout.some((record) => record.label === 1) && holdout.some((record) => record.label === 0);
  const sampleGatePassed = train.length >= settings.minTrain && holdout.length >= settings.minHoldout && bothLabels;
  const improvement = baselineBrier === null || modelBrier === null ? null : baselineBrier - modelBrier;
  const status = !sampleGatePassed ? 'insufficient_data' : improvement > settings.minImprovement ? 'shadow_validated' : 'not_better_than_baseline';

  return {
    status,
    target: 'admin_approval_probability',
    disclaimer: 'Review-only statistical estimate; never an item price, appraisal score, or automatic approval decision.',
    samples: { inputRows: rows.length, independentGroups: examples.length, train: train.length, holdout: holdout.length },
    exclusions,
    split: {
      method: 'chronological_group_holdout',
      trainThrough: train.length ? new Date(train.at(-1).timestamp).toISOString() : null,
      holdoutFrom: holdout.length ? new Date(holdout[0].timestamp).toISOString() : null,
    },
    metrics: { brier: modelBrier, baselineBrier, improvement, sampleGatePassed },
    model,
  };
}

// The admin endpoint uses this name to emphasize that this is an evaluation,
// not an operational score or price model.
export const evaluateReviewShadow = buildStatisticalShadowReport;
