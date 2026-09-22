import json
import sys


def main():
    request = json.loads(sys.stdin.read())
    model = request.get("model")
    features = [float(value) for value in request.get("features", [])]

    if not features:
        raise ValueError("features가 비어 있습니다.")

    score = sum(features) / len(features)

    print(json.dumps({
        "model": model,
        "score": score,
        "status": "smoke_connected",
    }))


if __name__ == "__main__":
    main()
