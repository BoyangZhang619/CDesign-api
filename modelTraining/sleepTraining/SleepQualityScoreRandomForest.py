import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler,MinMaxScaler
import skl2onnx
from skl2onnx.common.data_types import FloatTensorType
import onnx
import onnxruntime as ort
import json
import os

cur_path = os.path.dirname(os.path.abspath(__file__))

# 1. 加载数据
df = pd.read_csv(os.path.join(cur_path, './csv/wearable_tech_sleep_quality.csv'))

# 2. 准备特征和目标
# 假设我们要预测睡眠质量
X = df.drop('Sleep_Quality_Score', axis=1)
y = df['Sleep_Quality_Score']

# 保存特征名称用于后续使用
feature_names = X.columns.tolist()
feature_count = len(feature_names)

# 3. 划分数据集
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. 标准化特征（可选但推荐）
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 5. 训练随机森林回归模型
model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
model.fit(X_train_scaled, y_train)

# 6. 评估
predictions = model.predict(X_test_scaled)
print(f"回归模型 R2 分数: {r2_score(y_test, predictions):.4f}")
print(f"回归模型 RMSE: {np.sqrt(mean_squared_error(y_test, predictions)):.4f}")

# 7. 查看特征重要性（看看哪个指标最影响睡眠）
importances = pd.Series(model.feature_importances_, index=X.columns)
print("\n特征影响力排名:\n", importances.sort_values(ascending=False))

# 8. 导出为 ONNX 格式
print("\n正在导出 ONNX 模型...")

# 定义输入类型（需要匹配特征数量）
initial_type = [('float_input', FloatTensorType([None, feature_count]))]

# 转换模型
onnx_model = skl2onnx.convert_sklearn(model, initial_types=initial_type)

# 验证 ONNX 模型
onnx.checker.check_model(onnx_model)
print("✓ ONNX 模型验证通过")

# 保存 ONNX 模型
output_dir = "../../src/models"
os.makedirs(os.path.join(cur_path, output_dir), exist_ok=True)

onnx_model_path = os.path.join(os.path.join(cur_path, output_dir), "sleep_quality_model.onnx")
with open(onnx_model_path, "wb") as f:
    f.write(onnx_model.SerializeToString())

print(f"✓ ONNX 模型已保存到: {onnx_model_path}")

# 9. 保存特征信息和缩放器参数供 TypeScript 使用
model_metadata = {
    "model_name": "sleep_quality_random_forest",
    "feature_names": feature_names,
    "feature_count": feature_count,
    "model_type": "random_forest_regressor",
    "r2_score": float(r2_score(y_test, predictions)),
    "rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),
    "scaler_min": scaler.min_.tolist(),
    "scaler_scale": scaler.scale_.tolist(),
    "feature_importances": importances.to_dict()
}

metadata_path = os.path.join(os.path.join(cur_path, output_dir), "sleep_quality_model_metadata.json")
with open(metadata_path, "w", encoding="utf-8") as f:
    json.dump(model_metadata, f, indent=2, ensure_ascii=False)

print(f"✓ 模型元数据已保存到: {metadata_path}")

# 10. 测试 ONNX 模型推理
print("\n测试 ONNX 模型推理...")
sess = ort.InferenceSession(onnx_model_path)

# 用测试集的前 5 个样本测试
test_samples = X_test_scaled[:5].astype(np.float32)
input_name = sess.get_inputs()[0].name
label_name = sess.get_outputs()[0].name

onnx_predictions = sess.run([label_name], {input_name: test_samples})
sklearn_predictions = model.predict(test_samples)

print("\nONNX 模型预测结果:")
print(onnx_predictions[0])
print("\nSklearn 模型预测结果:")
print(sklearn_predictions)
print("\n预测结果一致性:", np.allclose(onnx_predictions[0], sklearn_predictions, atol=1e-5))

print("\n✓ 所有操作完成！")
