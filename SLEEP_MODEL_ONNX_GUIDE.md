# 睡眠质量 ONNX 模型集成指南

## 概述

本项目使用 Scikit-Learn 训练的随机森林模型，并通过 ONNX (Open Neural Network Exchange) 格式导出，以支持在 TypeScript/Node.js 后端进行推理。

## 架构说明

### Python 端 (模型训练)

**文件**: `modelTraining/sleepTraining/SleepQualityScoreRandomForest.py`

功能:
- 从 CSV 数据加载睡眠数据
- 使用 StandardScaler 标准化特征
- 训练 RandomForestRegressor 模型
- 计算模型性能指标 (R², RMSE)
- 导出为 ONNX 格式
- 生成元数据 JSON 文件
- 验证 ONNX 模型推理

输出文件:
- `src/models/sleep_quality_model.onnx` - 模型文件
- `src/models/sleep_quality_model_metadata.json` - 模型元数据

### TypeScript 端 (模型推理)

**文件**: `src/services/sleepQualityModel.ts`

核心类: `SleepQualityModel`

主要方法:
- `initialize()` - 初始化模型和加载元数据
- `predict(input)` - 单次预测
- `predictBatch(inputs)` - 批量预测
- `getModelInfo()` - 获取模型信息
- `getFeatureImportance()` - 获取特征重要性排名

## 安装依赖

### Python 端

```bash
cd modelTraining/sleepTraining
pip install pandas scikit-learn skl2onnx onnx onnxruntime
```

### Node.js 端

```bash
npm install onnxruntime-node
npm install --save-dev @types/onnxruntime-node
```

## 使用流程

### 1. 训练和导出模型

```bash
# 进入 Python 训练目录
cd modelTraining/sleepTraining

# 确保有数据文件
# - wearable_tech_sleep_quality.csv

# 运行训练脚本
python SleepQualityScoreRandomForest.py
```

输出示例:
```
回归模型 R2 分数: 0.8234
回归模型 RMSE: 1.2345

特征影响力排名:
sleep_duration_hours      0.35
heart_rate_avg           0.25
exercise_minutes         0.20
...

✓ ONNX 模型已保存到: ../../src/models/sleep_quality_model.onnx
✓ 模型元数据已保存到: ../../src/models/sleep_quality_model_metadata.json

预测结果一致性: True
✓ 所有操作完成！
```

### 2. 在 Node.js 中使用模型

#### 初始化模型

```typescript
import { SleepQualityModel } from './services/sleepQualityModel.js';

const model = new SleepQualityModel();
await model.initialize();
```

#### 单次预测

```typescript
const result = await model.predict({
    heart_rate: 65,
    steps: 8000,
    sleep_duration: 7.5,
    // ... 其他特征
});

console.log(`睡眠质量: ${result.prediction.toFixed(2)}`);
console.log(`置信度: ${(result.confidence * 100).toFixed(2)}%`);
```

#### 批量预测

```typescript
const results = await model.predictBatch([
    { heart_rate: 65, steps: 8000, sleep_duration: 7.5 },
    { heart_rate: 70, steps: 10000, sleep_duration: 8.0 },
    { heart_rate: 72, steps: 9000, sleep_duration: 7.0 }
]);

results.forEach((r, i) => {
    console.log(`样本 ${i + 1}: ${r.prediction.toFixed(2)}`);
});
```

### 3. 在 API 中集成

**文件**: `src/services/sleepQualityPredictService.ts`

```typescript
import { initializeSleepQualityModel, predictSleepQuality } from './services/sleepQualityPredictService.js';

// 在应用启动时初始化模型
app.on('ready', async () => {
    await initializeSleepQualityModel();
});

// 创建 API 路由
app.post('/api/sleep/predict', predictSleepQuality);
app.post('/api/sleep/predict-batch', predictSleepQualityBatch);
app.get('/api/sleep/model-info', getSleepModelInfo);
```

## API 端点

### POST /api/sleep/predict

预测单个样本的睡眠质量

请求体:
```json
{
    "heart_rate": 65,
    "steps": 8000,
    "sleep_duration": 7.5,
    "exercise_minutes": 30,
    "stress_level": 4,
    "water_intake_ml": 2000
}
```

响应:
```json
{
    "userId": 5,
    "prediction": {
        "quality_score": 82.34,
        "confidence": "87.23%",
        "timestamp": "2024-03-20T14:30:45.123Z"
    },
    "features_used": 6
}
```

### POST /api/sleep/predict-batch

批量预测

请求体:
```json
{
    "samples": [
        { "heart_rate": 65, "steps": 8000, ... },
        { "heart_rate": 72, "steps": 10000, ... }
    ]
}
```

### GET /api/sleep/model-info

获取模型信息和特征重要性

响应:
```json
{
    "model_info": {
        "model_name": "sleep_quality_random_forest",
        "feature_count": 10,
        "r2_score": 0.8234,
        "rmse": 1.2345,
        ...
    },
    "top_features": [
        { "name": "sleep_duration_hours", "importance": "35.20%" },
        { "name": "heart_rate_avg", "importance": "25.10%" },
        ...
    ]
}
```

## 测试

### 运行完整测试套件

```bash
npm run test:sleep-model
```

或

```bash
npx ts-node src/services/testSleepModel.ts
```

### 测试内容

1. ✓ 模型初始化
2. ✓ 获取模型信息
3. ✓ 显示特征重要性
4. ✓ 单次预测
5. ✓ 批量预测
6. ✓ 性能测试 (100 次推理)

## 性能指标

- **单次推理耗时**: ~5-10ms (取决于硬件)
- **吞吐量**: 100-200 次/秒
- **内存占用**: ~50-100MB (模型 + 运行时)
- **模型大小**: ~5-10MB (ONNX 格式)

## 文件结构

```
CDesign-api/
├── modelTraining/
│   └── sleepTraining/
│       ├── SleepQualityScoreRandomForest.py    # 训练脚本
│       ├── csv/
│       │   └── wearable_tech_sleep_quality.csv # 训练数据
│       └── img/
│           └── elbow_method.png
│
├── src/
│   ├── models/
│   │   ├── sleep_quality_model.onnx            # ONNX 模型 ⭐
│   │   └── sleep_quality_model_metadata.json   # 模型元数据 ⭐
│   │
│   └── services/
│       ├── sleepQualityModel.ts                # 模型推理类
│       ├── sleepQualityPredictService.ts       # API 服务集成
│       └── testSleepModel.ts                   # 测试脚本
```

## 注意事项

1. **特征顺序**: 输入特征必须与模型训练时的特征顺序一致，通过 `metadata.feature_names` 获取正确顺序

2. **特征标准化**: 模型会自动使用保存的缩放参数进行标准化，无需手动处理

3. **缺失值**: 不允许缺失特征，必须提供所有必需的特征值

4. **并发推理**: ONNX Runtime 支持并发推理，可以放心使用 Promise.all()

5. **模型更新**: 重新训练模型后，需要重新导出 ONNX 文件并重启应用以加载新模型

## 故障排除

### 模型初始化失败

```
Error: 模型文件不存在: src/models/sleep_quality_model.onnx
```

**解决方案**:
1. 确保运行了 Python 训练脚本
2. 检查 `src/models/` 目录是否存在
3. 确保 ONNX 文件导出成功

### 预测特征不匹配

```
Error: 缺少必需的特征: heart_rate
```

**解决方案**:
1. 使用 `model.getModelInfo()` 获取需要的所有特征名称
2. 确保提供的特征名称与模型期望的完全一致
3. 检查 `sleep_quality_model_metadata.json` 中的 `feature_names`

### 性能缓慢

如果推理速度很慢:
1. 使用性能分析工具定位瓶颈
2. 考虑使用 GPU 执行提供者 (如果可用)
3. 批量预测会更高效

## 相关资源

- [ONNX 官网](https://onnx.ai/)
- [ONNX Runtime 文档](https://onnxruntime.ai/)
- [scikit-learn 到 ONNX](https://skl2onnx.readthedocs.io/)
- [RandomForestRegressor 文档](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestRegressor.html)

## 许可证

MIT

## 联系方式

如有问题，请联系开发团队。
