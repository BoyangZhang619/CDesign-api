/**
 * TodoList 路由
 */

import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { 
    getTasks,
    getTaskStats,
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

// 获取任务列表
router.get('/', authMiddleware, getTasks);

// 获取任务统计信息
router.get('/stats', authMiddleware, getTaskStats);

// 创建任务
router.post('/', authMiddleware, createTask);

// 获取任务详情
router.get('/:id', authMiddleware, getTask);

// 更新任务
router.put('/:id', authMiddleware, updateTask);

// 删除任务
router.delete('/:id', authMiddleware, deleteTask);

// 标记任务为完成
router.patch('/:id/complete', authMiddleware, completeTask);

// 标记任务为未完成
router.patch('/:id/uncomplete', authMiddleware, uncompleteTask);

// 同步打卡状态
router.post('/sync-checkin', authMiddleware, syncCheckin);

// 生成 AI 建议
router.post('/ai-suggestions', authMiddleware, generateAISuggestions);

// 接受 AI 建议
router.post('/:id/accept-suggestion', authMiddleware, acceptSuggestion);

// 驳回 AI 建议
router.post('/:id/reject-suggestion', authMiddleware, rejectSuggestion);

export default router;
