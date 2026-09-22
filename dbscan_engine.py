import json
import sys
from pathlib import Path

import joblib
import numpy as np


def main():
    request = json.loads(sys.stdin.read().lstrip("\ufeff"))
    bundle = joblib.load(Path("artifacts/dbscan_admin_review.joblib"))

    features = [float(value) for value in request["features"]]
    expected = bundle["feature_count"]
    padded = features[:expected] + [0.0] * max(0, expected - len(features))

    point = bundle["scaler"].transform([padded])[0]
    distances = np.linalg.norm(bundle["training"] - point, axis=1)
    nearest_index = int(np.argmin(distances))
    nearest_distance = float(distances[nearest_index])

    nearest_label = int(bundle["model"].labels_[nearest_index])
    is_outlier = nearest_distance > 1.2 or nearest_label == -1

    print(json.dumps({
        "model": "dbscan",
        "score": 0.0 if is_outlier else 1.0,
        "confidence": float(1.0 / (1.0 + nearest_distance)),
        "status": "candidate",
        "explanation": "DBSCAN 군집 소속 및 이상치 판정",
        "metadata": {
            "artifact": "artifacts/dbscan_admin_review.joblib",
            "cluster": None if is_outlier else nearest_label,
            "outlier": is_outlier,
            "distance": nearest_distance,
        },
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
