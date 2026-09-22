import test from 'node:test';
import assert from 'node:assert/strict';
import {
  XGBOOST_FEATURE_SCHEMA,
  buildXgboostFeatures
} from '../xgboost-feature-contract.mjs';

test('XGBoost feature schema가 범주형·수치형·시너지 특성을 정의한다', () => {
  assert.ok(XGBOOST_FEATURE_SCHEMA.categorical.includes('item_type'));
  assert.ok(XGBOOST_FEATURE_SCHEMA.numeric.includes('required_level'));
  assert.equal(XGBOOST_FEATURE_SCHEMA.target, 'sale_price');
  assert.ok(XGBOOST_FEATURE_SCHEMA.synergyPrefixes.includes('synergy_'));
});

test('아이템 기본 특성을 생성한다', () => {
  const features = buildXgboostFeatures({
    itemType: 'rare',
    itemSlot: 'ring',
    itemClass: 'all',
    mode: 'softcore',
    market: {
      medianPrice: 120,
      sampleCount: 25,
      volume7d: 8
    },
    requiredLevel: 87,
    ladder: true,
    options: []
  });

  assert.equal(features.item_type, 'rare');
  assert.equal(features.item_slot, 'ring');
  assert.equal(features.required_level, 87);
  assert.equal(features.market_median_price, 120);
  assert.equal(features.ladder_flag, 1);
});

test('옵션과 시너지 특성을 확장한다', () => {
  const features = buildXgboostFeatures({
    options: [
      { optionId: 'FIRE_RESIST', value: 26 },
      { optionId: 'LIFE', value: 11 }
    ],
    synergies: [
      { id: 'CASTER_RING', score: 0.8 }
    ]
  });

  assert.equal(features.option_FIRE_RESIST, 26);
  assert.equal(features.option_LIFE, 11);
  assert.equal(features.synergy_CASTER_RING, 0.8);
  assert.equal(features.option_count, 2);
});
