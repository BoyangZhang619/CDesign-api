/**
 * 趋势分析路由
 */

import { Router } from 'express';
import { TrendsController } from '../controllers/trendsController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 获取趋势分析数据
 * GET /api/analysis/trends?range=month
 */
router.get('/trends', TrendsController.getTrendsData);

/**
 * 获取特定维度的详细数据
 * GET /api/analysis/trends/detail/:dimension?range=month
 */
router.get('/trends/detail/:dimension', TrendsController.getTrendDetail);

export default router;
