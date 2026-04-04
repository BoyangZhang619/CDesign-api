/**
 * 睡眠质量预测 API 端点示例
 * 展示如何在后端 API 中集成 ONNX 模型
 */

import { Request, Response } from "express";
import { SleepQualityModel, PredictionInput } from "./sleepQualityModel.js";
import { sendError, sendResult } from "../util/response.js";
import { getUserIdFromReq } from "../controllers/sharedMethods.js";

// 全局模型实例（启动时初始化一次）
let globalSleepModel: SleepQualityModel | null = null;

/**
 * 初始化模型（应在应用启动时调用）
 */
export async function initializeSleepQualityModel(): Promise<void> {
    try {
        globalSleepModel = new SleepQualityModel();
        await globalSleepModel.initialize();
        console.log("✓ 睡眠质量模型已初始化");
    } catch (error) {
        console.error("✗ 睡眠质量模型初始化失败:", error);
        // 不中断应用启动，仅记录警告
    }
}

/**
 * 预测睡眠质量 API 端点
 * 
 * 请求示例:
 * POST /api/sleep/predict
 * {
 *   "heart_rate": 65,
 *   "steps": 8000,
 *   "sleep_duration": 7.5,
 *   ...其他特征
 * }
 */
export async function predictSleepQuality(req: Request, res: Response): Promise<Response> {
    try {
        if (!globalSleepModel) {
            return sendError(res, "模型未初始化，请稍后重试");
        }

        const userId = getUserIdFromReq(req);
        const input = req.body as PredictionInput;

        // 基本验证
        if (!input || Object.keys(input).length === 0) {
            return sendError(res, "缺少预测特征");
        }

        // 执行预测
        const result = await globalSleepModel.predict(input);

        return sendResult(res, {
            userId,
            prediction: {
                quality_score: result.prediction,
                confidence: (result.confidence * 100).toFixed(2) + "%",
                timestamp: result.timestamp,
            },
            features_used: Object.keys(result.features).length,
        });
    } catch (error) {
        return sendError(res, "预测失败: " + (error as any).message);
    }
}

/**
 * 批量预测 API 端点
 * 
 * 请求示例:
 * POST /api/sleep/predict-batch
 * {
 *   "samples": [
 *     { "heart_rate": 65, "steps": 8000, ... },
 *     { "heart_rate": 72, "steps": 10000, ... },
 *     ...
 *   ]
 * }
 */
export async function predictSleepQualityBatch(req: Request, res: Response): Promise<Response> {
    try {
        if (!globalSleepModel) {
            return sendError(res, "模型未初始化，请稍后重试");
        }

        const { samples } = req.body;

        if (!Array.isArray(samples) || samples.length === 0) {
            return sendError(res, "缺少样本数据或样本为空");
        }

        const results = await globalSleepModel.predictBatch(samples);

        return sendResult(res, {
            total_samples: samples.length,
            predictions: results.map((r) => ({
                quality_score: r.prediction,
                confidence: (r.confidence * 100).toFixed(2) + "%",
            })),
        });
    } catch (error) {
        return sendError(res, "批量预测失败: " + (error as any).message);
    }
}

/**
 * 获取模型信息 API 端点
 */
export async function getSleepModelInfo(req: Request, res: Response): Promise<Response> {
    try {
        if (!globalSleepModel) {
            return sendError(res, "模型未初始化");
        }

        const info = globalSleepModel.getModelInfo();
        const importances = globalSleepModel.getFeatureImportance();

        return sendResult(res, {
            model_info: info,
            top_features: importances.slice(0, 10).map(([name, importance]) => ({
                name,
                importance: (importance * 100).toFixed(2) + "%",
            })),
        });
    } catch (error) {
        return sendError(res, "获取模型信息失败: " + (error as any).message);
    }
}

export { SleepQualityModel };
