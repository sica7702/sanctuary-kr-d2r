import json
import sys
from pathlib import Path

import joblib
import numpy as np


def main():
    request = json.loads(sys.stdin.read().lstrip("\ufeff"))
    artifact = Path("artifacts/ridge_admin_review.joblib")
    bundle = joblib.load(artifact)

    features = [float(value) for value in request["features"]]
    expected = bundle["feature_count"]
    padded = features[:expected] + [0.0] * max(0, expected - len(features))

    score = float(
        np.clip(bundle["model"].predict([padded])[0], 0.0, 1.0)
    )

    print(json.dumps({
        "model": "regression",
        "score": score,
        "confidence": None,
        "status": "candidate",
        "explanation": "실제 Ridge 회귀 artifact 추론 결과",
        "metadata": {
            "artifact": str(artifact),
            "featureCount": expected,
        },
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
