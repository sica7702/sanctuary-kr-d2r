import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Ridge 회귀 학습·평가 스크립트가 실행된다', () => {
  const result = spawnSync(
    'python',
    ['-c', `
import numpy as np
from statistical_regression import train_regression_model, evaluate_regression_model

x = np.array([[1, 10], [2, 20], [3, 30], [4, 40]], dtype=float)
y = np.array([12, 24, 36, 48], dtype=float)

model = train_regression_model(x, y)
metrics = evaluate_regression_model(model, x, y)

assert len(metrics["predictions"]) == 4
assert len(metrics["coefficients"]) == 2
assert metrics["mae"] >= 0
print("regression smoke ok")
`],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /regression smoke ok/);
});
