import json
import sys
from pathlib import Path

import numpy as np
import xgboost as xgb


def main():
    request = json.loads(sys.stdin.read().lstrip("\ufeff"))
    features = [float(value) for value in request["features"]]
    artifact = Path(
        request.get(
            "artifact",
            "artifacts/xgboost_admin_review.json",
        )
    )

    if not artifact.exists():
        raise FileNotFoundError(f"모델 파일이 없습니다: {artifact}")

    model = xgb.XGBClassifier()
    model.load_model(str(artifact))

    expected = model.get_booster().num_features()
    padded = features[:expected] + [0.0] * max(0, expected - len(features))

    probability = float(
        model.predict_proba(np.asarray([padded], dtype=float))[0][1]
    )

    print(json.dumps({
        "model": "xgboost",
        "score": probability,
        "confidence": probability,
        "status": "candidate",
        "explanation": "실제 XGBoost artifact 추론 결과",
        "metadata": {
            "artifact": str(artifact),
            "featureCount": expected,
        },
    }))


if __name__ == "__main__":
    main()

