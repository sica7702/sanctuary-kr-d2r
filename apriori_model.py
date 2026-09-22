from itertools import combinations


def apriori(transactions, min_support=0.5):
    if not transactions:
        raise ValueError("거래 데이터가 비어 있습니다.")

    normalized = [set(transaction) for transaction in transactions]
    total = len(normalized)
    frequent = {}

    items = sorted(set().union(*normalized))

    for size in range(1, len(items) + 1):
        for combo in combinations(items, size):
            itemset = frozenset(combo)
            support = sum(
                itemset.issubset(transaction)
                for transaction in normalized
            ) / total

            if support >= min_support:
                frequent[tuple(sorted(itemset))] = support

    rules = []

    for itemset, support in frequent.items():
        if len(itemset) < 2:
            continue

        itemset_set = set(itemset)

        for size in range(1, len(itemset)):
            for antecedent_values in combinations(itemset, size):
                antecedent = set(antecedent_values)
                consequent = itemset_set - antecedent
                antecedent_support = frequent.get(
                    tuple(sorted(antecedent)),
                    0.0,
                )

                if antecedent_support == 0:
                    continue

                rules.append({
                    "antecedent": sorted(antecedent),
                    "consequent": sorted(consequent),
                    "support": support,
                    "confidence": support / antecedent_support,
                })

    return {
        "frequent_itemsets": frequent,
        "rules": rules,
    }
