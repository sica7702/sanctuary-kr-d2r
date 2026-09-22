import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

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

scaler = StandardScaler()
scaled = scaler.fit_transform(X)

model = DBSCAN(eps=1.2, min_samples=3)
labels = model.fit_predict(scaled)

Path("artifacts").mkdir(exist_ok=True)
joblib.dump(
    {
        "scaler": scaler,
        "model": model,
        "feature_count": max_features,
        "training": scaled,
    },
    "artifacts/dbscan_admin_review.joblib",
)

print({
    "samples": len(rows),
    "clusters": len(set(labels)) - (1 if -1 in labels else 0),
    "outliers": int(np.sum(labels == -1)),
    "artifact": "artifacts/dbscan_admin_review.joblib",
})
