import json
from pathlib import Path

import numpy as np
import xgboost as xgb
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

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
y = np.asarray([row["label"] for row in rows], dtype=int)

if len(set(y)) < 2:
    raise ValueError("승인·거절 라벨이 모두 필요합니다.")

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42,
    stratify=y,
)

model = xgb.XGBClassifier(
    n_estimators=80,
    max_depth=3,
    learning_rate=0.08,
    objective="binary:logistic",
    eval_metric="logloss",
    tree_method="hist",
    n_jobs=2,
)

model.fit(X_train, y_train)

predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)
f1 = f1_score(y_test, predictions, zero_division=0)

Path("artifacts").mkdir(exist_ok=True)
model.save_model("artifacts/xgboost_admin_review.json")

print({
    "samples": len(rows),
    "train_samples": len(X_train),
    "test_samples": len(X_test),
    "accuracy": round(float(accuracy), 4),
    "f1": round(float(f1), 4),
    "artifact": "artifacts/xgboost_admin_review.json",
})

