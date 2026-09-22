import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel, ConstantKernel


def train_gpr_model(features, labels, noise_level=1.0):
    x = np.asarray(features, dtype=float)
    y = np.asarray(labels, dtype=float)

    if len(x) == 0 or len(y) == 0:
        raise ValueError("GPR 학습 데이터가 비어 있습니다.")

    if len(x) != len(y):
        raise ValueError("특성과 라벨 개수가 일치하지 않습니다.")

    kernel = (
        ConstantKernel(1.0, (1e-3, 1e3))
        * RBF(length_scale=1.0)
        + WhiteKernel(noise_level=noise_level)
    )

    model = GaussianProcessRegressor(
        kernel=kernel,
        normalize_y=True,
        n_restarts_optimizer=2,
        random_state=42
    )

    model.fit(x, y)
    return model


def predict_with_uncertainty(model, features, confidence_z=1.96):
    x = np.asarray(features, dtype=float)
    mean, std = model.predict(x, return_std=True)

    lower = mean - confidence_z * std
    upper = mean + confidence_z * std

    return {
        "mean": mean.tolist(),
        "std": std.tolist(),
        "lower": lower.tolist(),
        "upper": upper.tolist()
    }
