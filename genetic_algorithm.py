import random


def optimize(
    objective,
    bounds,
    population_size=24,
    generations=30,
    mutation_rate=0.15,
    seed=42,
):
    if not bounds:
        raise ValueError("최적화 변수 범위가 비어 있습니다.")

    if population_size < 2:
        raise ValueError("population_size는 2 이상이어야 합니다.")

    rng = random.Random(seed)

    population = [
        [
            rng.uniform(lower, upper)
            for lower, upper in bounds
        ]
        for _ in range(population_size)
    ]

    def score(candidate):
        return float(objective(candidate))

    for _ in range(generations):
        ranked = sorted(
            population,
            key=score,
            reverse=True,
        )

        elite_count = max(2, population_size // 4)
        next_population = ranked[:elite_count]

        while len(next_population) < population_size:
            parent_a = rng.choice(ranked[: max(2, population_size // 2)])
            parent_b = rng.choice(ranked[: max(2, population_size // 2)])

            child = [
                (value_a + value_b) / 2
                for value_a, value_b in zip(parent_a, parent_b)
            ]

            for index, (lower, upper) in enumerate(bounds):
                if rng.random() < mutation_rate:
                    span = upper - lower
                    child[index] += rng.uniform(-0.1 * span, 0.1 * span)
                    child[index] = min(upper, max(lower, child[index]))

            next_population.append(child)

        population = next_population

    best = max(population, key=score)

    return {
        "best_parameters": best,
        "best_score": score(best),
        "generations": generations,
        "population_size": population_size,
    }
