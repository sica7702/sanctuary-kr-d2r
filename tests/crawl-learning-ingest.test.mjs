import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestCrawlRecord } from '../crawl-learning-ingest.mjs';

const validRecord = {
  sourceUrl: 'https://example.com/item/1',
  capturedAt: '2026-09-22T12:00:00Z',
  imageHash: 'sha256:item-001',
  itemType: 'rare',
  options: [
    { optionId: 'FIRE_RESIST', value: 26 }
  ]
};

test('유효한 크롤링 데이터는 pending 큐에 넣는다', () => {
  const result = ingestCrawlRecord(validRecord, new Set());

  assert.equal(result.status, 'queued');
  assert.equal(result.datasetStatus, 'pending');
  assert.equal(result.record.sourceType, 'crawler');
  assert.equal(result.record.requiresHumanReview, true);
  assert.equal(result.record.learningEligible, false);
});

test('필수 출처 정보가 없으면 제외한다', () => {
  const result = ingestCrawlRecord({
    ...validRecord,
    sourceUrl: null
  }, new Set());

  assert.equal(result.status, 'excluded');
  assert.ok(result.errors.includes('SOURCE_URL_MISSING'));
});

test('중복 이미지 해시는 제외한다', () => {
  const result = ingestCrawlRecord(
    validRecord,
    new Set(['sha256:item-001'])
  );

  assert.equal(result.status, 'excluded');
  assert.ok(result.errors.includes('DUPLICATE_IMAGE'));
});

test('옵션 배열이 없으면 학습 큐에 넣지 않는다', () => {
  const result = ingestCrawlRecord({
    ...validRecord,
    options: null
  }, new Set());

  assert.equal(result.status, 'excluded');
  assert.ok(result.errors.includes('OPTIONS_MISSING'));
});
