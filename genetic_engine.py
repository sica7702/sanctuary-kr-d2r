import json
import sys

import numpy as np

from genetic_algorithm import optimize


def main():
    request = json.loads(sys.stdin.read().lstrip("\ufeff"))
    features = np.asarray(
        [float(value) for value in request["features"]],
        dtype=float,
    )

    if len(features) == 0:
        raise ValueError("features가 비어 있습니다.")

    scale = max(float(np.max(np.abs(features))), 1.0)
    normalized = np.clip(np.abs(features) / scale, 0.0, 1.0)

    bounds = [(0.0, 1.0)] * len(normalized)

    def objective(weights):
        weights = np.asarray(weights, dtype=float)
        total = float(np.sum(weights))

        if total == 0:
            return 0.0

        return float(np.dot(normalized, weights) / total)

    result = optimize(
        objective,
        bounds,
        population_size=24,
        generations=30,
        seed=42,
    )

    print(json.dumps({
        "model": "genetic",
        "score": float(np.clip(result["best_score"], 0.0, 1.0)),
        "confidence": 0.5,
        "status": "candidate",
        "explanation": "유전 알고리즘 기반 특징 가중치 최적화 결과",
        "metadata": {
            "bestParameters": result["best_parameters"],
            "generations": result["generations"],
            "populationSize": result["population_size"],
        },
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
