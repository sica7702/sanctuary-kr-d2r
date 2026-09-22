import json
import sys
from pathlib import Path

import numpy as np
import xgboost as xgb


def load_rows(path):
    rows = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("split") not in {"train", "validation"}:
            continue
        rows.append(row)
    return rows


def matrix(rows, keys):
    return np.array(
        [[float(row["features"].get(key, 0)) for key in keys] for row in rows],
        dtype=float,
    )


def main():
    if len(sys.argv) < 3:
        raise SystemExit(
            "사용법: python xgboost_train.py <dataset.jsonl> <model.json>"
        )

    dataset_path = Path(sys.argv[1])
    model_path = Path(sys.argv[2])

    if not dataset_path.exists():
        raise SystemExit(f"데이터셋이 없습니다: {dataset_path}")

    rows = load_rows(dataset_path)
    train_rows = [row for row in rows if row["split"] == "train"]
    validation_rows = [row for row in rows if row["split"] == "validation"]

    if not train_rows or not validation_rows:
        raise SystemExit("train·validation 데이터가 모두 필요합니다.")

    keys = sorted({
        key
        for row in rows
        for key in row["features"].keys()
    })

    train_x = matrix(train_rows, keys)
    train_y = np.array([row["label"] for row in train_rows], dtype=float)
    valid_x = matrix(validation_rows, keys)
    valid_y = np.array([row["label"] for row in validation_rows], dtype=float)

    model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="reg:squarederror",
        tree_method="hist",
        device="cuda",
        eval_metric="mae",
    )

    model.fit(
        train_x,
        train_y,
        eval_set=[(valid_x, valid_y)],
        verbose=False,
    )

    model.save_model(model_path)
    print(f"학습 완료: {model_path}")
    print(f"특성 수: {len(keys)}")
    print(f"학습 샘플: {len(train_rows)}")
    print(f"검증 샘플: {len(validation_rows)}")


if __name__ == "__main__":
    main()
