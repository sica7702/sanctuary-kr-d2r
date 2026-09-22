import test from 'node:test';
import assert from 'node:assert/strict';

function validateItemResult(value) {
  if (!value || typeof value !== 'object') throw new Error('object required');
  if (value.schema_version !== '1.0') throw new Error('schema_version required');
  if (typeof value.item_type !== 'string') throw new Error('item_type required');
  if (!Array.isArray(value.stats)) throw new Error('stats must be array');
  if (!Array.isArray(value.errors)) throw new Error('errors must be array');
  for (const stat of value.stats) {
    if (typeof stat.stat_id !== 'string') throw new Error('stat_id required');
    if (typeof stat.value !== 'number') throw new Error('numeric value required');
  }
  return true;
}

const samples = [
  { schema_version: '1.0', item_type: 'rare', stats: [{ stat_id: 'FIRE_RESIST', value: 26 }], errors: [] },
  { schema_version: '1.0', item_type: 'magic', stats: [{ stat_id: 'FCR', value: 20 }], errors: [] },
  { schema_version: '1.0', item_type: 'crafted', stats: [{ stat_id: 'LIFE', value:  devalue(40) }], errors: [] }
];

function devalue(value) { return Number(value); }

test('three valid samples serialize and deserialize with the same schema', () => {
  for (const sample of samples) {
    const parsed = JSON.parse(JSON.stringify(sample));
    assert.equal(validateItemResult(parsed), true);
    assert.deepEqual(parsed, sample);
  }
});

test('missing schema fields are rejected', () => {
  assert.throws(() => validateItemResult({ item_type: 'rare', stats: [], errors: [] }));
  assert.throws(() => validateItemResult({ schema_version: '1.0', item_type: 'rare', errors: [] }));
});

test('invalid option value types are rejected', () => {
  assert.throws(() => validateItemResult({
    schema_version: '1.0',
    item_type: 'rare',
    stats: [{ stat_id: 'FIRE_RESIST', value: '26' }],
    errors: []
  }));
});
