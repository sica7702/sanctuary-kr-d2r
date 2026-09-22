import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler


def cluster_items(features, eps=0.8, min_samples=3):
    x = np.asarray(features, dtype=float)

    if len(x) == 0:
        raise ValueError("군집화 데이터가 비어 있습니다.")

    scaled = StandardScaler().fit_transform(x)

    model = DBSCAN(
        eps=eps,
        min_samples=min_samples
    )

    labels = model.fit_predict(scaled)

    return {
        "labels": labels.tolist(),
        "cluster_count": len(set(labels)) - (1 if -1 in labels else 0),
        "outlier_indices": [
            index
            for index, label in enumerate(labels)
            if label == -1
        ]
    }
