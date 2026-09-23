import { readFile, writeFile } from 'node:fs/promises';
import { runShadowReview } from './shadow-runner.mjs';

function rowsFromExport(value) {
  if (Array.isArray(value)) return value.flatMap(item => Array.isArray(item?.results) ? item.results : []);
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function candidateFromRow(row) {
  let evidence = [];
  try { evidence = Array.isArray(row.evidence_json) ? row.evidence_json : JSON.parse(row.evidence_json || '[]'); } catch {}
  return { ...row, evidence, mismatch_comparisons: row.mismatch_comparisons || [] };
}

export async function runBatchShadow(inputPath, outputPath = null, { adapters = [], provider = null, limit = 500 } = {}) {
  const raw = JSON.parse(await readFile(inputPath, 'utf8'));
  const rows = rowsFromExport(raw).slice(0, Math.max(0, Math.min(5000, Number(limit) || 0)));
  const results = [];
  for (const row of rows) results.push(await runShadowReview(candidateFromRow(row), { adapters, provider }));
  const report = { runner_version: 'batch-shadow-v1', input: inputPath, count: results.length, applied_count: results.filter(item => item.applied).length, human_review_count: results.filter(item => item.uncertainty?.abstain).length, results };
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

if (process.argv[1]?.endsWith('batch-shadow-runner.mjs')) {
  const report = await runBatchShadow(process.argv[2], process.argv[3] || null);
  process.stdout.write(`${JSON.stringify({ runner_version: report.runner_version, count: report.count, applied_count: report.applied_count, human_review_count: report.human_review_count })}\n`);
}
