from math import sqrt


def _cosine(left, right):
    common = set(left) & set(right)

    if not common:
        return 0.0

    numerator = sum(left[key] * right[key] for key in common)
    left_norm = sqrt(sum(value * value for value in left.values()))
    right_norm = sqrt(sum(value * value for value in right.values()))

    if left_norm == 0 or right_norm == 0:
        return 0.0

    return numerator / (left_norm * right_norm)


def recommend(ratings, user_id, limit=5):
    if user_id not in ratings:
        raise ValueError(f"사용자를 찾을 수 없습니다: {user_id}")

    target = ratings[user_id]
    scores = {}

    for other_user, other_ratings in ratings.items():
        if other_user == user_id:
            continue

        similarity = _cosine(target, other_ratings)

        for item, rating in other_ratings.items():
            if item not in target:
                scores[item] = scores.get(item, 0.0) + similarity * rating

    ranked = sorted(
        scores.items(),
        key=lambda pair: pair[1],
        reverse=True,
    )

    return [
        {
            "item": item,
            "score": score,
        }
        for item, score in ranked[:limit]
    ]
