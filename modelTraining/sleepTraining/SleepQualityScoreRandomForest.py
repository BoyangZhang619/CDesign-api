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
print("=" * 60)
print("睡眠质量预测模型 - MinMaxScaler 版本")
print("=" * 60)

csv_path = os.path.join(cur_path, './csv/wearable_tech_sleep_quality.csv')
print(f"\n加载数据: {csv_path}")
df = pd.read_csv(csv_path)
print(f"✓ 数据加载成功，总记录数: {len(df)}")

# 2. 数据检查和验证
print("\n[数据验证]")
print(f"数据形状: {df.shape}")
print(f"\n数据类型:\n{df.dtypes}")
print(f"\n缺失值检查:\n{df.isnull().sum()}")
print(f"\n数据统计信息:\n{df.describe()}")

# 3. 准备特征和目标
print("\n[特征准备]")
X = df.drop('Sleep_Quality_Score', axis=1)
y = df['Sleep_Quality_Score']

print(f"特征数: {X.shape[1]}")
print(f"样本数: {X.shape[0]}")
print(f"\n特征名称: {X.columns.tolist()}")

# 保存特征名称用于后续使用
feature_names = X.columns.tolist()
feature_count = len(feature_names)

# 检查特征值范围
print(f"\n特征值范围 (归一化前):")
for col in X.columns:
    print(f"  {col}: [{X[col].min():.2f}, {X[col].max():.2f}]")

# 检查目标值范围
print(f"\n目标值范围:")
print(f"  Sleep_Quality_Score: [{y.min():.2f}, {y.max():.2f}]")

# 4. 划分数据集
print("\n[数据集划分]")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"训练集大小: {len(X_train)} ({len(X_train)/len(X)*100:.1f}%)")
print(f"测试集大小: {len(X_test)} ({len(X_test)/len(X)*100:.1f}%)")

# 5. MinMaxScaler 归一化（0-1范围）
print("\n[特征归一化 - MinMaxScaler]")
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print("✓ MinMaxScaler 应用成功")
print(f"  归一化范围: [0, 1]")
print(f"  训练集形状: {X_train_scaled.shape}")
print(f"  测试集形状: {X_test_scaled.shape}")

# 显示归一化后的特征范围
print(f"\n归一化后特征值范围:")
for i, col in enumerate(X.columns):
    min_val = X_train_scaled[:, i].min()
    max_val = X_train_scaled[:, i].max()
    print(f"  {col}: [{min_val:.4f}, {max_val:.4f}]")

# 6. 训练随机森林回归模型
print("\n[模型训练]")
print("配置: RandomForestRegressor(n_estimators=100, max_depth=10)")
model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
model.fit(X_train_scaled, y_train)
print("✓ 模型训练完成")

# 7. 评估模型性能
print("\n[模型评估]")
train_predictions = model.predict(X_train_scaled)
test_predictions = model.predict(X_test_scaled)

train_r2 = r2_score(y_train, train_predictions)
test_r2 = r2_score(y_test, test_predictions)
train_rmse = np.sqrt(mean_squared_error(y_train, train_predictions))
test_rmse = np.sqrt(mean_squared_error(y_test, test_predictions))

print(f"\n训练集性能:")
print(f"  R² 分数: {train_r2:.4f}")
print(f"  RMSE: {train_rmse:.4f}")

print(f"\n测试集性能:")
print(f"  R² 分数: {test_r2:.4f}")
print(f"  RMSE: {test_rmse:.4f}")

# 检查过拟合
overfitting_ratio = train_r2 - test_r2
print(f"\n过拟合检查 (R²_train - R²_test): {overfitting_ratio:.4f}")
if overfitting_ratio > 0.1:
    print("  ⚠️  检测到可能的过拟合")
else:
    print("  ✓ 模型泛化能力良好")

predictions = test_predictions

# 8. 特征重要性分析
print("\n[特征重要性排名]")
importances = pd.Series(model.feature_importances_, index=X.columns)
importances_sorted = importances.sort_values(ascending=False)

print("\n所有特征的重要性:")
for feature, importance in importances_sorted.items():
    importance_pct = importance * 100
    bar_length = int(importance_pct / 2)
    bar = "█" * bar_length
    print(f"  {feature:30s} {importance_pct:6.2f}% {bar}")

# 检查特征重要性是否均衡
max_importance = importances_sorted.iloc[0]
print(f"\n最高重要性: {max_importance*100:.2f}%")
if max_importance > 0.8:
    print("  ⚠️  单个特征占权过高，可能导致模型偏差")
else:
    print("  ✓ 特征分布相对均衡")

# 8. 导出为 ONNX 格式
print("\n[ONNX 模型导出]")
print("正在转换模型为 ONNX 格式...")

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
print("\n[保存模型元数据]")
model_metadata = {
    "model_name": "sleep_quality_random_forest",
    "feature_names": feature_names,
    "feature_count": feature_count,
    "model_type": "random_forest_regressor",
    "scaler_type": "MinMaxScaler",
    "r2_score": float(test_r2),
    "rmse": float(test_rmse),
    "train_r2_score": float(train_r2),
    "train_rmse": float(train_rmse),
    "scaler_min": scaler.data_min_.tolist(),
    "scaler_max": scaler.data_max_.tolist(),
    "scaler_scale": scaler.scale_.tolist(),
    "feature_importances": importances_sorted.to_dict(),
    "feature_range": {col: {"min": float(X[col].min()), "max": float(X[col].max())} for col in X.columns}
}

metadata_path = os.path.join(os.path.join(cur_path, output_dir), "sleep_quality_model_metadata.json")
with open(metadata_path, "w", encoding="utf-8") as f:
    json.dump(model_metadata, f, indent=2, ensure_ascii=False)

print(f"✓ 模型元数据已保存到: {metadata_path}")

# 10. 测试 ONNX 模型推理
print("\n[ONNX 模型推理测试]")
print("正在验证 ONNX 模型推理精度...")

sess = ort.InferenceSession(onnx_model_path, providers=['CPUExecutionProvider'])

# 用测试集的前 10 个样本测试
num_test_samples = min(10, len(X_test_scaled))
test_samples = X_test_scaled[:num_test_samples].astype(np.float32)
input_name = sess.get_inputs()[0].name
label_name = sess.get_outputs()[0].name

onnx_predictions = sess.run([label_name], {input_name: test_samples})[0]
sklearn_predictions = model.predict(test_samples)

print(f"\n前 {num_test_samples} 个样本的预测对比:")
print(f"{'样本':^6} {'真实值':^10} {'Sklearn':^12} {'ONNX':^12} {'误差':^10}")
print("-" * 60)

max_error = 0
for i in range(num_test_samples):
    true_val = y_test.iloc[i]
    sklearn_pred = sklearn_predictions[i]
    onnx_pred = onnx_predictions[i][0]
    error = abs(sklearn_pred - onnx_pred)
    max_error = max(max_error, error)
    print(f"{i+1:^6} {true_val:^10.2f} {sklearn_pred:^12.4f} {onnx_pred:^12.4f} {error:^10.6f}")

# 验证 ONNX 和 Sklearn 预测的一致性
consistency_check = np.allclose(onnx_predictions.flatten(), sklearn_predictions, atol=1e-5)
print(f"\n预测结果一致性检查 (atol=1e-5): {consistency_check}")
print(f"最大误差: {max_error:.6f}")

if consistency_check:
    print("✓ ONNX 模型转换成功，推理精度达标！")
else:
    print("⚠️  ONNX 模型与 Sklearn 预测存在偏差，需要检查")

print("\n" + "=" * 60)
print("✓ 所有操作完成！模型已准备好用于生产环境")
print("=" * 60)
