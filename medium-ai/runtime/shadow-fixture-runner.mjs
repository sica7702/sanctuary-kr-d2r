import { readFile } from 'node:fs/promises';
import { runShadowReview } from './shadow-runner.mjs';

export async function runFixture(path, { provider = null } = {}) {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  const adapters = fixture.adapters || [];
  const candidates = Array.isArray(fixture.candidates) ? fixture.candidates : [fixture.candidate].filter(Boolean);
  const results = [];
  for (const candidate of candidates) results.push(await runShadowReview(candidate, { adapters, provider, mismatchComparisons: candidate.mismatch_comparisons || [] }));
  return { runner_version: 'shadow-fixture-v1', fixture: path, count: results.length, results };
}

if (process.argv[1] && process.argv[1].endsWith('shadow-fixture-runner.mjs')) {
  const path = process.argv[2];
  if (!path) throw new Error('fixture_path_required');
  const report = await runFixture(path);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
