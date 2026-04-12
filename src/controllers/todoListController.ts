/**
 * TodoList 控制器
 */

import { Request, Response } from 'express';
import { TodoListService } from '../services/todoListService.js';
import { sendResult, sendError } from '../util/response.js';
import type {
    CreateTaskRequest,
    UpdateTaskRequest,
    CompleteTaskRequest,
    SyncCheckinRequest,
    AISuggestionsRequest,
    TaskQueryParams
} from '../types/todolist.js';

// 获取用户 ID（从认证中间件获取）
function getUserIdFromReq(req: Request): number {
    const userId = (req as any).user.userId || (req as any).user?.userId;
    if (!userId) {
        throw new Error('未授权：缺少用户信息');
    }
    return Number(userId);
}
async function getTasks(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const params: TaskQueryParams = {
            date: (req.query.date as string) || undefined,
            status: (req.query.status as any) || undefined,
            type: (req.query.type as any) || undefined,
            priority: (req.query.priority as any) || undefined,
            search: (req.query.search as string) || undefined,
            page: parseInt((req.query.page as string) || '1', 10),
            limit: parseInt((req.query.limit as string) || '20', 10)
        };
        
        console.log('🔍 [getTasks 控制器] 接收参数:', { params, userId });
        
        const { tasks, total } = await TodoListService.getUserTasks(userId, params);
        
        console.log(`🎯 [getTasks 控制器] 返回结果: ${tasks.length} 条任务，总计 ${total} 条`);
        console.log('📦 任务数据:', tasks);
        
        sendResult(res, {
            data: tasks,
            pagination: {
                page: params.page || 1,
                limit: params.limit || 20,
                total,
                totalPages: Math.ceil(total / (params.limit || 20))
            }
        });
    } catch (error) {
        console.error('❌ [getTasks 控制器] 错误:', error);
        sendError(res, String(error instanceof Error ? error.message : error));
    }
}

/**
 * 获取任务统计
 * GET /api/tasks/stats
 */
async function getTaskStats(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const date = (req.query.date as string) || undefined;

        const stats = await TodoListService.getTaskStatistics(userId, date);

        sendResult(res, { data: stats });
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error));
    }
}

/**
 * 创建任务
 * POST /api/tasks
 */
async function createTask(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const taskData: CreateTaskRequest = req.body;

        const task = await TodoListService.createTask(userId, taskData);

        sendResult(res, { data: task }, '任务创建成功');
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
}

/**
 * 获取任务详情
 * GET /api/tasks/:id
 */
async function getTask(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const taskId = parseInt(String(req.params.id), 10);

        const task = await TodoListService.getTask(userId, taskId);

        if (!task) {
            sendError(res, '任务不存在', 404);
            return;
        }

        sendResult(res, { data: task });
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error));
    }
}

/**
 * 更新任务
 * PUT /api/tasks/:id
 */
async function updateTask(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const taskId = parseInt(String(req.params.id), 10);
        const updateData: UpdateTaskRequest = req.body;

        const task = await TodoListService.updateTask(userId, taskId, updateData);

        if (!task) {
            sendError(res, '任务不存在', 404);
            return;
        }

        sendResult(res, { data: task }, '任务更新成功');
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
}

/**
 * 删除任务
 * DELETE /api/tasks/:id
 */
async function deleteTask(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const taskId = parseInt(String(req.params.id), 10);

        const success = await TodoListService.deleteTask(userId, taskId);

        if (!success) {
            sendError(res, '任务不存在', 404);
            return;
        }

        sendResult(res, { message: 'Task deleted successfully' }, '任务删除成功');
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error));
    }
}

/**
 * 标记任务为完成
 * PATCH /api/tasks/:id/complete
 */
async function completeTask(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const taskId = parseInt(String(req.params.id), 10);
        const { completed_date } = req.body as CompleteTaskRequest;

        const task = await TodoListService.completeTask(userId, taskId, completed_date);

        if (!task) {
            sendError(res, '任务不存在', 404);
            return;
        }

        sendResult(res, { data: task }, '任务标记为已完成');
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
}

/**
 * 标记任务为未完成
 * PATCH /api/tasks/:id/uncomplete
 */
async function uncompleteTask(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const taskId = parseInt(String(req.params.id), 10);

        const task = await TodoListService.uncompleteTask(userId, taskId);

        if (!task) {
            sendError(res, '任务不存在', 404);
            return;
        }

        sendResult(res, { data: task }, '任务标记为未完成');
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error));
    }
}

/**
 * 同步打卡
 * POST /api/tasks/sync-checkin
 */
async function syncCheckin(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const syncData: SyncCheckinRequest = req.body;

        const task = await TodoListService.syncCheckin(userId, syncData);

        sendResult(res, { data: task }, '打卡同步成功');
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
}

/**
 * 生成 AI 建议
 * POST /api/tasks/ai-suggestions
 */
async function generateAISuggestions(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const request: AISuggestionsRequest = req.body || {};

        const suggestions = await TodoListService.generateAISuggestions(userId, request);

        sendResult(res, { data: suggestions }, 'AI 建议生成成功');
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error));
    }
}

/**
 * 接受 AI 建议
 * POST /api/tasks/:id/accept-suggestion
 */
async function acceptSuggestion(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const taskId = parseInt(String(req.params.id), 10);

        const task = await TodoListService.acceptSuggestion(userId, taskId);

        if (!task) {
            sendError(res, '任务不存在', 404);
            return;
        }

        sendResult(res, { data: task }, 'AI 建议已接受');
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
}

/**
 * 驳回 AI 建议
 * POST /api/tasks/:id/reject-suggestion
 */
async function rejectSuggestion(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const taskId = parseInt(String(req.params.id), 10);

        const success = await TodoListService.rejectSuggestion(userId, taskId);

        if (!success) {
            sendError(res, '任务不存在', 404);
            return;
        }

        sendResult(res, { message: 'AI suggestion rejected and deleted' }, 'AI 建议已驳回');
    } catch (error) {
        sendError(res, String(error instanceof Error ? error.message : error));
    }
}

export {
    getTasks,
    getTask,
    getTaskStats,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    syncCheckin,
    generateAISuggestions,
    acceptSuggestion,
    rejectSuggestion
}