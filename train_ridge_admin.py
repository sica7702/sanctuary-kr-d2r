import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

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

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42,
)

model = Ridge(alpha=1.0)
model.fit(X_train, y_train)

predictions = np.clip(model.predict(X_test), 0.0, 1.0)
mae = mean_absolute_error(y_test, predictions)

Path("artifacts").mkdir(exist_ok=True)
joblib.dump(
    {
        "model": model,
        "feature_count": max_features,
    },
    "artifacts/ridge_admin_review.joblib",
)

print({
    "samples": len(rows),
    "feature_count": max_features,
    "mae": round(float(mae), 4),
    "artifact": "artifacts/ridge_admin_review.joblib",
})
