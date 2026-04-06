/**
 * 健康画像路由
 */

import { Router } from 'express';
import { PortraitController } from '../controllers/portraitController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 获取健康画像数据
 * GET /api/health/portrait
 */
router.get('/portrait', PortraitController.getPortrait);

/**
 * 获取健康档案设置状态
 * GET /api/health/setup-status
 */
router.get('/setup-status', PortraitController.getSetupStatus);

/**
 * 更新健康档案设置状态
 * PUT /api/health/setup-status
 */
router.put('/setup-status', PortraitController.updateSetupStatus);

/**
 * 获取历史画像数据
 * GET /api/health/portrait/history
 */
router.get('/portrait/history', PortraitController.getPortraitHistory);

/**
 * 获取用户健康档案
 * GET /api/health/profile
 */
router.get('/profile', PortraitController.getUserProfile);

/**
 * 更新用户健康档案
 * PUT /api/health/profile
 */
router.put('/profile', PortraitController.updateUserProfile);

/**
 * 从 checkin 数据刷新健康画像
 * POST /api/health/refresh-from-checkin
 * 如果已有数据则返回，无数据才调用 AI
 */
router.post('/refresh-from-checkin', PortraitController.refreshPortraitFromCheckin);

/**
 * 强制刷新健康画像
 * POST /api/health/force-refresh
 * 忽略现有数据，强制调用 AI 重新分析
 */
router.post('/force-refresh', PortraitController.forceRefreshPortrait);

export default router;
