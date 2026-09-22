import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildXgboostDataset,
  serializeXgboostJsonl
} from '../xgboost-dataset.mjs';

test('학습 후보만 train·validation 데이터로 변환한다', () => {
  const result = buildXgboostDataset([
    {
      datasetStatus: 'train_candidate',
      features: { option_FIRE_RESIST: 26 },
      salePrice: 120
    },
    {
      datasetStatus: 'pending',
      features: { option_FIRE_RESIST: 31 },
      salePrice: 150
    },
    {
      datasetStatus: 'train_candidate',
      features: { option_LIFE: 11 },
      salePrice: 90
    }
  ], 0.5);

  assert.equal(result.train.length, 1);
  assert.equal(result.validation.length, 1);
  assert.equal(result.excludedCount, 1);
  assert.equal(result.train[0].split, 'train');
  assert.equal(result.validation[0].split, 'validation');
});

test('가격이 숫자가 아닌 레코드는 제외한다', () => {
  const result = buildXgboostDataset([
    {
      datasetStatus: 'train_candidate',
      features: { option_FIRE_RESIST: 26 },
      salePrice: null
    }
  ]);

  assert.equal(result.train.length, 0);
  assert.equal(result.validation.length, 0);
  assert.equal(result.excludedCount, 1);
});

test('JSONL 형식으로 직렬화한다', () => {
  const jsonl = serializeXgboostJsonl([
    {
      features: { option_FIRE_RESIST: 26 },
      label: 120,
      split: 'train'
    },
    {
      features: { option_LIFE: 11 },
      label: 90,
      split: 'validation'
    }
  ]);

  const lines = jsonl.split('\n');

  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).label, 120);
  assert.equal(JSON.parse(lines[1]).split, 'validation');
});
