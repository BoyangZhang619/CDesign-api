/**
 * 任务完成历史路由
 */

import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getTaskCompletionHistory,
  getTaskCompletionStats,
  getCompletionByDate
} from '../controllers/taskCompletionHistoryController.js';

const router = Router();

router.use(authMiddleware);

// 获取任务完成记录列表
router.get('/', getTaskCompletionHistory);

// 获取统计信息
router.get('/stats', getTaskCompletionStats);

// 获取按日期的汇总
router.get('/by-date', getCompletionByDate);

export default router;
