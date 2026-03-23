import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
    CheckHealthInfo,
    InsertHealthInfo,
    UpdateHealthInfo,
    GetHealthInfo
} from '../controllers/healthInfoController.js';

const router = express.Router();

// 获取信息
router.get('/get-health-info', authMiddleware, GetHealthInfo);

// 检查是否存在
router.post('/check-health-info', authMiddleware, CheckHealthInfo);

// 插入健康信息
router.post('/insert-health-info', authMiddleware, InsertHealthInfo);

// 更新健康信息
router.post('/update-health-info', authMiddleware, UpdateHealthInfo);

export default router;