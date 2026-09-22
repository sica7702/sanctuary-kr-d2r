import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, ConstantKernel, WhiteKernel

rows = [
    json.loads(line)
    for line in Path("training-candidates.jsonl")
    .read_text(encoding="utf-8")
    .splitlines()
    if line.strip()
]

max_features = max(len(row["features"]) for row in rows)

X = np.asarray(
    [
        row["features"] + [0.0] * (max_features - len(row["features"]))
        for row in rows
    ],
    dtype=float,
)
y = np.asarray([row["label"] for row in rows], dtype=float)

kernel = (
    ConstantKernel(1.0, (1e-3, 1e3))
    * RBF(length_scale=1.0)
    + WhiteKernel(noise_level=0.1)
)

model = GaussianProcessRegressor(
    kernel=kernel,
    normalize_y=True,
    random_state=42,
)

model.fit(X, y)

Path("artifacts").mkdir(exist_ok=True)
joblib.dump(
    {
        "model": model,
        "feature_count": max_features,
    },
    "artifacts/gpr_admin_review.joblib",
)

print({
    "samples": len(rows),
    "feature_count": max_features,
    "artifact": "artifacts/gpr_admin_review.joblib",
})
