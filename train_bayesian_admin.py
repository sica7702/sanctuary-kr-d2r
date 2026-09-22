import json
from pathlib import Path

import joblib
import numpy as np

rows = [
    json.loads(line)
    for line in Path("training-candidates.jsonl")
    .read_text(encoding="utf-8")
    .splitlines()
    if line.strip()
]

sums = np.asarray(
    [sum(row["features"]) for row in rows],
    dtype=float,
)

threshold = float(np.median(sums))
counts = {
    "low": {"approved": 0, "total": 0},
    "high": {"approved": 0, "total": 0},
}

for row, total in zip(rows, sums):
    bucket = "high" if total >= threshold else "low"
    counts[bucket]["total"] += 1
    counts[bucket]["approved"] += int(row["label"] == 1)

cpt = {
    bucket: (
        values["approved"] / values["total"]
        if values["total"]
        else 0.5
    )
    for bucket, values in counts.items()
}

Path("artifacts").mkdir(exist_ok=True)
joblib.dump(
    {
        "threshold": threshold,
        "cpt": cpt,
    },
    "artifacts/bayesian_admin_review.joblib",
)

print({
    "samples": len(rows),
    "threshold": threshold,
    "cpt": cpt,
    "artifact": "artifacts/bayesian_admin_review.joblib",
})
