import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runBatchShadow } from '../runtime/batch-shadow-runner.mjs';

test('batch shadow runner reads D1 export format without applying results', async () => {
  const fixture = fileURLToPath(new URL('./fixtures/d1-export-shadow.json', import.meta.url));
  const report = await runBatchShadow(fixture, null, { limit: 1 });
  assert.equal(report.count, 1);
  assert.equal(report.applied_count, 0);
  assert.equal(report.human_review_count, 1);
});
