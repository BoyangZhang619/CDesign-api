#!/usr/bin/env node

/**
 * 睡眠质量模型完整测试脚本
 * 
 * 使用方法:
 * npm run test:sleep-model
 * 
 * 或直接运行:
 * npx ts-node src/services/sleepQualityModel.ts
 */

import { SleepQualityModel, PredictionInput, PredictionResult } from "./sleepQualityModel.js";

async function main() {
    console.log("╔════════════════════════════════════════╗");
    console.log("║   睡眠质量 ONNX 模型完整测试          ║");
    console.log("╚════════════════════════════════════════╝\n");

    const model = new SleepQualityModel();

    try {
        // 步骤 1: 初始化模型
        console.log("📋 步骤 1: 初始化模型...");
        await model.initialize();

        // 步骤 2: 获取模型信息
        console.log("\n📋 步骤 2: 获取模型信息");
        const modelInfo = model.getModelInfo();

        if (modelInfo) {
            console.log(`   模型名称: ${modelInfo.model_name}`);
            console.log(`   模型类型: ${modelInfo.model_type}`);
            console.log(`   缩放器类型: ${modelInfo.scaler_type}`);
            console.log(`   特征数量: ${modelInfo.feature_count}`);
            console.log(`\n   模型性能指标:`);
            console.log(`   ├─ 测试集 R²: ${modelInfo.r2_score.toFixed(4)}`);
            console.log(`   ├─ 测试集 RMSE: ${modelInfo.rmse.toFixed(4)}`);
            console.log(`   ├─ 训练集 R²: ${modelInfo.train_r2_score?.toFixed(4) || 'N/A'}`);
            console.log(`   └─ 训练集 RMSE: ${modelInfo.train_rmse?.toFixed(4) || 'N/A'}`);
            
            console.log(`\n   特征列表 (共 ${modelInfo.feature_count} 个):`);
            modelInfo.feature_names.forEach((name, index) => {
                const range = modelInfo.feature_range?.[name];
                if (range) {
                    console.log(`      ${index + 1}. ${name.padEnd(30)} [${range.min.toFixed(2)}, ${range.max.toFixed(2)}]`);
                } else {
                    console.log(`      ${index + 1}. ${name}`);
                }
            });
        }

        // 步骤 3: 显示特征重要性
        console.log("\n📋 步骤 3: 特征重要性排名 (Top 10)");
        const importances = model.getFeatureImportance();
        importances.slice(0, 10).forEach(([feature, importance], index) => {
            const bar = "█".repeat(Math.round(importance * 50));
            console.log(`   ${String(index + 1).padStart(2)}. ${feature.padEnd(25)} ${bar} ${(importance * 100).toFixed(2)}%`);
        });

        // 步骤 4: 创建测试输入
        console.log("\n📋 步骤 4: 创建测试输入");
        const testInput: PredictionInput = {};

        if (modelInfo) {
            modelInfo.feature_names.forEach((feature) => {
                // 生成随机但合理的特征值
                let value: number;
                if (feature.toLowerCase().includes("duration")) {
                    value = Math.random() * 10; // 时长 0-10 小时
                } else if (feature.toLowerCase().includes("rate")) {
                    value = 60 + Math.random() * 40; // 心率 60-100
                } else if (feature.toLowerCase().includes("steps")) {
                    value = Math.random() * 15000; // 步数 0-15000
                } else {
                    value = Math.random() * 100; // 其他 0-100
                }
                testInput[feature] = Math.round(value * 100) / 100;
            });
        }

        console.log("   生成的测试特征值:");
        Object.entries(testInput).slice(0, 5).forEach(([key, value]) => {
            console.log(`      ${key}: ${value}`);
        });
        if (Object.keys(testInput).length > 5) {
            console.log(`      ... 还有 ${Object.keys(testInput).length - 5} 个特征`);
        }

        // 步骤 5: 单次预测
        console.log("\n📋 步骤 5: 执行单次预测");
        const singleResult = await model.predict(testInput);

        console.log(`   ✓ 预测完成!`);
        console.log(`     睡眠质量评分: ${singleResult.prediction.toFixed(2)}`);
        console.log(`     置信度: ${(singleResult.confidence * 100).toFixed(2)}%`);
        console.log(`     预测时间: ${singleResult.timestamp}`);

        // 步骤 6: 批量预测
        console.log("\n📋 步骤 6: 执行批量预测 (3 个样本)");
        const batchInputs: PredictionInput[] = [];

        for (let i = 0; i < 3; i++) {
            const input: PredictionInput = {};
            if (modelInfo) {
                modelInfo.feature_names.forEach((feature) => {
                    const baseValue = testInput[feature] || 50;
                    const variance = (Math.random() - 0.5) * 20;
                    input[feature] = Math.max(0, baseValue + variance);
                });
            }
            batchInputs.push(input);
        }

        const batchResults = await model.predictBatch(batchInputs);

        console.log(`   ✓ 预测完成! (${batchResults.length} 个样本)`);
        batchResults.forEach((result, index) => {
            console.log(`     样本 ${index + 1}: 评分 ${result.prediction.toFixed(2)}, 置信度 ${(result.confidence * 100).toFixed(2)}%`);
        });

        // 步骤 7: 性能测试
        console.log("\n📋 步骤 7: 性能测试");
        const perfTestCount = 100;
        const startTime = Date.now();

        const perfInput: PredictionInput = {};
        if (modelInfo) {
            modelInfo.feature_names.forEach((feature) => {
                perfInput[feature] = Math.random() * 100;
            });
        }

        for (let i = 0; i < perfTestCount; i++) {
            await model.predict(perfInput);
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / perfTestCount;

        console.log(`   执行 ${perfTestCount} 次预测:`);
        console.log(`     总耗时: ${totalTime}ms`);
        console.log(`     平均耗时: ${avgTime.toFixed(2)}ms/次`);
        console.log(`     吞吐量: ${(1000 / avgTime).toFixed(2)} 次/秒`);

        // 步骤 8: 总结
        console.log("\n╔════════════════════════════════════════╗");
        console.log("║           测试总结                     ║");
        console.log("╚════════════════════════════════════════╝");
        console.log("✓ 模型初始化成功");
        console.log("✓ 单次预测成功");
        console.log("✓ 批量预测成功");
        console.log("✓ 性能测试完成");
        console.log("\n所有测试通过! ONNX 模型已准备就绪。\n");
    } catch (error) {
        console.error("\n✗ 测试失败:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
