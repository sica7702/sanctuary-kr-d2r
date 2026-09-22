import numpy as np
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score


def train_regression_model(features, labels, alpha=1.0):
    x = np.asarray(features, dtype=float)
    y = np.asarray(labels, dtype=float)

    if len(x) == 0 or len(y) == 0:
        raise ValueError("회귀 학습 데이터가 비어 있습니다.")

    if len(x) != len(y):
        raise ValueError("특성과 라벨 개수가 일치하지 않습니다.")

    model = Ridge(alpha=alpha)
    model.fit(x, y)
    return model


def evaluate_regression_model(model, features, labels):
    x = np.asarray(features, dtype=float)
    y = np.asarray(labels, dtype=float)
    predictions = model.predict(x)

    return {
        "mae": float(mean_absolute_error(y, predictions)),
        "r2": float(r2_score(y, predictions)),
        "predictions": predictions.tolist(),
        "coefficients": model.coef_.tolist()
    }
