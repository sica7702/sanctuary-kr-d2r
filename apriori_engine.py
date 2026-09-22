import json
import sys

from apriori_model import apriori


def main():
    request = json.loads(sys.stdin.read().lstrip("\ufeff"))
    transactions = request.get("transactions", [])

    if not transactions:
        raise ValueError("transactions가 필요합니다.")

    result = apriori(transactions, min_support=0.5)
    rules = result["rules"]

    score = max(
        (float(rule["confidence"]) for rule in rules),
        default=0.0,
    )

    print(json.dumps({
        "model": "apriori",
        "score": score,
        "confidence": score,
        "status": "candidate",
        "explanation": "실제 Apriori 연관 규칙 추론 결과",
        "metadata": {
            "frequentItemsets": len(result["frequent_itemsets"]),
            "rules": rules,
        },
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
