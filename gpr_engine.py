import json
import sys
from pathlib import Path

import joblib
import numpy as np


def main():
    request = json.loads(sys.stdin.read().lstrip("\ufeff"))
    artifact = Path("artifacts/gpr_admin_review.joblib")
    bundle = joblib.load(artifact)

    features = [float(value) for value in request["features"]]
    expected = bundle["feature_count"]
    padded = features[:expected] + [0.0] * max(0, expected - len(features))

    mean, standard_deviation = bundle["model"].predict(
        np.asarray([padded], dtype=float),
        return_std=True,
    )

    score = float(np.clip(mean[0], 0.0, 1.0))
    uncertainty = float(standard_deviation[0])

    print(json.dumps({
        "model": "gpr",
        "score": score,
        "confidence": float(1.0 / (1.0 + uncertainty)),
        "status": "candidate",
        "explanation": "실제 GPR artifact 추론 결과",
        "metadata": {
            "artifact": str(artifact),
            "uncertainty": uncertainty,
            "featureCount": expected,
        },
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
