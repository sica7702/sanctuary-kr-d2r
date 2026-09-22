from itertools import product


class BayesianNetwork:
    def __init__(self, variables, parents, probabilities):
        self.variables = list(variables)
        self.parents = dict(parents)
        self.probabilities = dict(probabilities)

        for variable in self.variables:
            if variable not in self.probabilities:
                raise ValueError(f"확률표가 없습니다: {variable}")

    def probability(self, assignment):
        result = 1.0

        for variable in self.variables:
            parent_values = tuple(
                assignment[parent]
                for parent in self.parents.get(variable, [])
            )

            true_probability = self.probabilities[variable][parent_values]
            result *= (
                true_probability
                if assignment[variable]
                else 1.0 - true_probability
            )

        return result

    def query(self, variable, evidence=None):
        evidence = dict(evidence or {})
        hidden = [
            item
            for item in self.variables
            if item not in evidence and item != variable
        ]

        numerator = 0.0
        denominator = 0.0

        for values in product([False, True], repeat=len(hidden)):
            assignment = dict(evidence)
            assignment.update(dict(zip(hidden, values)))

            for target_value in [False, True]:
                assignment[variable] = target_value
                joint = self.probability(assignment)
                denominator += joint

                if target_value:
                    numerator += joint

        if denominator == 0:
            raise ValueError("증거 조건의 확률이 0입니다.")

        return numerator / denominator
