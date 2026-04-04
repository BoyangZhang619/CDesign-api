/**
 * 睡眠质量模型推理服务
 * 使用 ONNX Runtime 加载和执行睡眠质量预测模型
 */

import * as ort from "onnxruntime-node";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ModelMetadata {
    model_name: string;
    feature_names: string[];
    feature_count: number;
    model_type: string;
    r2_score: number;
    rmse: number;
    scaler_mean: number[];
    scaler_scale: number[];
    feature_importances: Record<string, number>;
}

interface PredictionInput {
    [key: string]: number;
}

interface PredictionResult {
    prediction: number;
    confidence: number;
    features: PredictionInput;
    timestamp: string;
}

class SleepQualityModel {
    private session: ort.InferenceSession | null = null;
    private metadata: ModelMetadata | null = null;
    private modelPath: string;
    private metadataPath: string;

    constructor() {
        this.modelPath = path.join(__dirname, "models", "sleep_quality_model.onnx");
        this.metadataPath = path.join(__dirname, "models", "sleep_quality_model_metadata.json");
    }

    /**
     * 初始化模型
     */
    async initialize(): Promise<void> {
        try {
            // 检查模型文件是否存在
            if (!fs.existsSync(this.modelPath)) {
                throw new Error(`模型文件不存在: ${this.modelPath}`);
            }

            if (!fs.existsSync(this.metadataPath)) {
                throw new Error(`模型元数据文件不存在: ${this.metadataPath}`);
            }

            // 加载元数据
            const metadataContent = fs.readFileSync(this.metadataPath, "utf-8");
            this.metadata = JSON.parse(metadataContent) as ModelMetadata;

            // 创建 ONNX Runtime session
            this.session = await ort.InferenceSession.create(this.modelPath, {
                executionProviders: ["cpu"],
            });

            console.log("✓ 睡眠质量模型初始化成功");
            console.log(`  模型类型: ${this.metadata.model_type}`);
            console.log(`  特征数量: ${this.metadata.feature_count}`);
            console.log(`  R2 分数: ${this.metadata.r2_score.toFixed(4)}`);
            console.log(`  RMSE: ${this.metadata.rmse.toFixed(4)}`);
        } catch (error) {
            console.error("模型初始化失败:", error);
            throw error;
        }
    }

    /**
     * 获取模型信息
     */
    getModelInfo(): ModelMetadata | null {
        return this.metadata;
    }

    /**
     * 标准化输入数据
     */
    private normalizeInput(input: number[]): number[] {
        if (!this.metadata) {
            throw new Error("模型未初始化");
        }

        return input.map((value, index) => {
            const mean = this.metadata!.scaler_mean[index];
            const scale = this.metadata!.scaler_scale[index];
            return (value - mean) / scale;
        });
    }

    /**
     * 从对象转换为数组（按特征名称顺序）
     */
    private objectToArray(input: PredictionInput): number[] {
        if (!this.metadata) {
            throw new Error("模型未初始化");
        }

        return this.metadata.feature_names.map((name) => {
            if (!(name in input)) {
                throw new Error(`缺少必需的特征: ${name}`);
            }
            return input[name];
        });
    }

    /**
     * 预测睡眠质量
     */
    async predict(input: PredictionInput): Promise<PredictionResult> {
        if (!this.session || !this.metadata) {
            throw new Error("模型未初始化");
        }

        try {
            // 转换输入格式
            const inputArray = this.objectToArray(input);

            // 标准化输入
            const normalizedInput = this.normalizeInput(inputArray);

            // 转换为 Float32Array 并调整维度为 [1, feature_count]
            const tensor = new ort.Tensor("float32", new Float32Array(normalizedInput), [
                1,
                this.metadata.feature_count,
            ]);

            // 执行推理
            const feeds: Record<string, ort.Tensor> = {};
            feeds[this.session.inputNames[0]] = tensor;

            const results = await this.session.run(feeds);
            const output = results[this.session.outputNames[0]];

            // 提取预测值
            const predictionValue = (output.data as Float32Array)[0];

            // 计算置信度（基于特征重要性）
            const confidence = this.calculateConfidence(input);

            return {
                prediction: predictionValue,
                confidence,
                features: input,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error("预测失败:", error);
            throw error;
        }
    }

    /**
     * 计算模型置信度
     */
    private calculateConfidence(input: PredictionInput): number {
        if (!this.metadata) {
            throw new Error("模型未初始化");
        }

        // 基于特征重要性加权计算置信度
        let totalImportance = 0;
        let weightedSum = 0;

        for (const [feature, importance] of Object.entries(
            this.metadata.feature_importances
        )) {
            if (feature in input) {
                totalImportance += importance;
                const featureValue = input[feature];
                // 简单置信度计算：值在合理范围内则提高置信度
                const confidence = Math.min(1, Math.abs(featureValue) / 100);
                weightedSum += importance * confidence;
            }
        }

        return totalImportance > 0 ? weightedSum / totalImportance : 0.5;
    }

    /**
     * 批量预测
     */
    async predictBatch(inputs: PredictionInput[]): Promise<PredictionResult[]> {
        return Promise.all(inputs.map((input) => this.predict(input)));
    }

    /**
     * 获取特征重要性排名
     */
    getFeatureImportance(): Array<[string, number]> {
        if (!this.metadata) {
            throw new Error("模型未初始化");
        }

        return Object.entries(this.metadata.feature_importances)
            .sort((a, b) => b[1] - a[1]);
    }
}

/**
 * 测试模型
 */
async function testModel() {
    console.log("===== 睡眠质量模型测试 =====\n");

    const model = new SleepQualityModel();

    try {
        // 初始化模型
        await model.initialize();

        // 获取模型信息
        const info = model.getModelInfo();
        if (info) {
            console.log("\n模型特征:");
            console.log(`特征名称: ${info.feature_names.join(", ")}`);

            console.log("\n特征重要性排名 (Top 5):");
            const importances = model.getFeatureImportance();
            importances.slice(0, 5).forEach(([feature, importance]) => {
                console.log(`  ${feature}: ${(importance * 100).toFixed(2)}%`);
            });
        }

        // 创建示例输入（需要根据实际特征调整）
        // 这里假设特征名称，实际需要根据 CSV 文件的列名
        const sampleInput: PredictionInput = {};

        if (info) {
            // 为每个特征生成随机值用于测试
            info.feature_names.forEach((feature) => {
                // 生成 0-100 之间的随机值
                sampleInput[feature] = Math.random() * 100;
            });
        }

        console.log("\n输入特征值:");
        Object.entries(sampleInput).forEach(([key, value]) => {
            console.log(`  ${key}: ${value.toFixed(2)}`);
        });

        // 执行预测
        console.log("\n执行单次预测...");
        const result = await model.predict(sampleInput);

        console.log("\n预测结果:");
        console.log(`  睡眠质量评分: ${result.prediction.toFixed(2)}`);
        console.log(`  置信度: ${(result.confidence * 100).toFixed(2)}%`);
        console.log(`  预测时间: ${result.timestamp}`);

        // 批量预测测试
        console.log("\n执行批量预测 (3 个样本)...");
        const batchInputs: PredictionInput[] = [
            { ...sampleInput },
            { ...sampleInput },
            { ...sampleInput },
        ];

        // 添加一些随机变化
        batchInputs.forEach((input) => {
            Object.keys(input).forEach((key) => {
                input[key] += (Math.random() - 0.5) * 20;
            });
        });

        const batchResults = await model.predictBatch(batchInputs);

        console.log("\n批量预测结果:");
        batchResults.forEach((result, index) => {
            console.log(`  样本 ${index + 1}: ${result.prediction.toFixed(2)}`);
        });

        console.log("\n✓ 模型测试完成！");
    } catch (error) {
        console.error("✗ 测试失败:", error);
        process.exit(1);
    }
}

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
    testModel().catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}

export { SleepQualityModel, PredictionInput, PredictionResult, ModelMetadata };
