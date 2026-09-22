import json
import sys
from pathlib import Path

import joblib


def main():
    request = json.loads(sys.stdin.read().lstrip("\ufeff"))
    bundle = joblib.load(
        Path("artifacts/bayesian_admin_review.joblib")
    )

    total = sum(float(value) for value in request["features"])
    bucket = "high" if total >= bundle["threshold"] else "low"
    score = float(bundle["cpt"][bucket])

    print(json.dumps({
        "model": "bayesian",
        "score": score,
        "confidence": abs(score - 0.5) * 2,
        "status": "candidate",
        "explanation": "조건부확률 기반 승인 가능성 추론",
        "metadata": {
            "bucket": bucket,
            "threshold": bundle["threshold"],
            "cpt": bundle["cpt"],
        },
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
