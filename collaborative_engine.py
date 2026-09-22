import json
import sys

from collaborative_filtering import recommend


def main():
    request = json.loads(sys.stdin.read().lstrip("\ufeff"))
    ratings = request.get("ratings", {})
    user_id = request["userId"]

    recommendations = recommend(
        ratings,
        user_id,
        limit=5,
    )

    top_score = (
        float(recommendations[0]["score"])
        if recommendations
        else 0.0
    )

    score = max(0.0, min(1.0, top_score / 5.0))

    print(json.dumps({
        "model": "collaborative",
        "score": score,
        "confidence": score,
        "status": "candidate",
        "explanation": "실제 협업 필터링 추천 결과",
        "metadata": {
            "recommendations": recommendations,
        },
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
