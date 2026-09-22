import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('GPR 학습과 불확실성 예측이 실행된다', () => {
  const result = spawnSync(
    'python',
    ['-c', `
import numpy as np
from gpr_model import train_gpr_model, predict_with_uncertainty

x = np.array([[1], [2], [3], [4]], dtype=float)
y = np.array([10, 20, 30, 40], dtype=float)

model = train_gpr_model(x, y)
prediction = predict_with_uncertainty(model, np.array([[2.5]], dtype=float))

assert len(prediction["mean"]) == 1
assert len(prediction["std"]) == 1
assert len(prediction["lower"]) == 1
assert len(prediction["upper"]) == 1
assert prediction["lower"][0] <= prediction["mean"][0] <= prediction["upper"][0]
print("gpr smoke ok")
`],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /gpr smoke ok/);
});
