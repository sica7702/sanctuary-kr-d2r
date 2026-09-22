import numpy as np
import xgboost as xgb

X = np.array([
    [26, 11, 87],
    [31, 15, 87],
    [10, 5, 60],
    [40, 20, 90]
], dtype=float)

y = np.array([120, 160, 40, 220], dtype=float)

model = xgb.XGBRegressor(
    n_estimators=20,
    max_depth=3,
    learning_rate=0.1,
    objective='reg:squarederror',
    tree_method='hist',
    n_jobs=2
)

model.fit(X, y)
prediction = model.predict(np.array([[26, 11, 87]], dtype=float))

print('XGBoost CPU smoke test: OK')
print('prediction:', float(prediction[0]))
