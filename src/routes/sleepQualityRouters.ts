import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
    predictSleepQuality,
    predictSleepQualityBatch,
    getSleepModelInfo
} from '../services/sleepQualityPredictService.js';

const router = Router();

router.use(authMiddleware);

// 预测睡眠质量（单次）
router.post('/predict', predictSleepQuality);

// 批量预测睡眠质量
router.post('/predict-batch', predictSleepQualityBatch);

// 获取模型信息
router.get('/model-info', getSleepModelInfo);

export default router;
