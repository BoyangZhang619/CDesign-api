/**
 * TodoList 路由
 */

import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { 
    getTasks,
    getTaskStats,
    getTasksByDate,
    createTask,
    getTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    syncCheckin,
    generateAISuggestions,
    acceptSuggestion,
    rejectSuggestion
} from '../controllers/todoListController.js';

const router = Router();

router.use(authMiddleware);

// 获取任务列表
router.get('/', getTasks);

// 获取任务统计信息
router.get('/stats', getTaskStats);

// 获取指定日期的任务
router.get('/date/:dateStr', getTasksByDate);

// 创建任务
router.post('/', createTask);

// 获取任务详情
router.get('/:id', getTask);

// 更新任务
router.put('/:id', updateTask);

// 删除任务
router.delete('/:id', deleteTask);

// 标记任务为完成
router.patch('/:id/complete', completeTask);

// 标记任务为未完成
router.patch('/:id/uncomplete', uncompleteTask);

// 同步打卡状态
router.post('/sync-checkin', syncCheckin);

// 生成 AI 建议
router.post('/ai-suggestions', generateAISuggestions);

// 接受 AI 建议
router.post('/:id/accept-suggestion', acceptSuggestion);

// 驳回 AI 建议
router.post('/:id/reject-suggestion', rejectSuggestion);

export default router;
