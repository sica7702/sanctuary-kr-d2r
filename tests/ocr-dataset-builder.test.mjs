import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrainingRecord, splitDataset } from '../ocr-dataset-builder.mjs';

const validRecord = {
  imageHash: 'sha256:item-001',
  ocrResult: { text: '화염 저항 +26%' },
  multimodalResult: { text: '화염 저항 +26%' },
  humanLabel: { optionId: 'FIRE_RESIST', value: 26 },
  labelSource: 'admin_review'
};

test('사람이 확정한 레코드만 학습 후보가 된다', () => {
  const result = buildTrainingRecord(validRecord);

  assert.equal(result.status, 'train_candidate');
  assert.equal(result.record.humanLabel.value, 26);
  assert.equal(result.record.labelSource, 'admin_review');
});

test('사람 확정 라벨이 없으면 학습 후보가 되지 않는다', () => {
  const result = buildTrainingRecord({
    ...validRecord,
    humanLabel: null
  });

  assert.equal(result.status, 'rejected');
  assert.ok(result.rejectionReasons.includes('HUMAN_LABEL_MISSING'));
});

test('중복·미해결 충돌 레코드는 제외한다', () => {
  const result = buildTrainingRecord({
    ...validRecord,
    isDuplicate: true,
    hasConflict: true
  });

  assert.equal(result.status, 'rejected');
  assert.ok(result.rejectionReasons.includes('DUPLICATE_RECORD'));
  assert.ok(result.rejectionReasons.includes('UNRESOLVED_CONFLICT'));
});

test('학습 후보를 학습셋과 검증셋으로 분리한다', () => {
  const records = [
    buildTrainingRecord({ ...validRecord, imageHash: 'sha256:1' }),
    buildTrainingRecord({ ...validRecord, imageHash: 'sha256:2' }),
    buildTrainingRecord({ ...validRecord, imageHash: 'sha256:3' }),
    buildTrainingRecord({ ...validRecord, imageHash: 'sha256:4' }),
    buildTrainingRecord({ ...validRecord, imageHash: 'sha256:5' })
  ];

  const result = splitDataset(records, 0.2);

  assert.equal(result.validation.length, 1);
  assert.equal(result.train.length, 4);
});
