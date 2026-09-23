import test from 'node:test';
import assert from 'node:assert/strict';
import { runFixture } from '../runtime/shadow-fixture-runner.mjs';

test('fixture runner returns shadow-only report', async () => {
  const report = await runFixture(new URL('./fixtures/shadow-candidates.json', import.meta.url));
  assert.equal(report.count, 2);
  assert.equal(report.results.every(item => item.applied === false), true);
  assert.equal(report.results[1].mismatch.severity, 'high');
  assert.equal(report.results[1].uncertainty.abstain, true);
});
