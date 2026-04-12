/**
 * 任务完成历史控制器
 * 用于获取任务完成记录
 */

import { Request, Response } from 'express';
import { getUserIdFromReq } from './sharedMethods.js';
import { sendResult, sendError } from '../util/response.js';
import { TaskCompletionHistoryDAL, type TaskCompletionQueryParams } from '../services/taskCompletionHistoryDAL.js';

/**
 * 获取任务完成记录列表
 * GET /api/task-history
 */
async function getTaskCompletionHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserIdFromReq(req);
    const params: TaskCompletionQueryParams = {
      type: (req.query.type as string) || undefined,
      category: (req.query.category as string) || undefined,
      startDate: (req.query.startDate as string) || undefined,
      endDate: (req.query.endDate as string) || undefined,
      priority: (req.query.priority as string) || undefined,
      completionStatus: (req.query.completionStatus as string) || undefined,
      search: (req.query.search as string) || undefined,
      sort: (req.query.sort as string) || 'newest',
      page: parseInt((req.query.page as string) || '1', 10),
      limit: parseInt((req.query.limit as string) || '20', 10)
    };

    console.log('🔍 [getTaskCompletionHistory 控制器] 接收参数:', { params, userId });

    const { records, total } = await TaskCompletionHistoryDAL.getTaskCompletionRecords(userId, params);

    console.log(`🎯 [getTaskCompletionHistory 控制器] 返回结果: ${records.length} 条记录，总计 ${total} 条`);

    sendResult(res, {
      data: records,
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total,
        totalPages: Math.ceil(total / (params.limit || 20))
      }
    });
  } catch (error) {
    console.error('❌ [getTaskCompletionHistory 控制器] 错误:', error);
    sendError(res, String(error instanceof Error ? error.message : error));
  }
}

/**
 * 获取任务完成统计信息
 * GET /api/task-history/stats
 */
async function getTaskCompletionStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserIdFromReq(req);

    console.log('🔍 [getTaskCompletionStats 控制器] 获取统计信息，用户:', userId);

    const stats = await TaskCompletionHistoryDAL.getTaskCompletionStatistics(userId);

    console.log(`🎯 [getTaskCompletionStats 控制器] 返回统计:`, stats);

    sendResult(res, { data: stats });
  } catch (error) {
    console.error('❌ [getTaskCompletionStats 控制器] 错误:', error);
    sendError(res, String(error instanceof Error ? error.message : error));
  }
}

/**
 * 获取按日期的完成汇总
 * GET /api/task-history/by-date
 */
async function getCompletionByDate(req: Request, res: Response): Promise<void> {
  try {
    const userId = getUserIdFromReq(req);
    const startDate = (req.query.startDate as string) || undefined;
    const endDate = (req.query.endDate as string) || undefined;

    console.log('🔍 [getCompletionByDate 控制器] 获取日期汇总:', { userId, startDate, endDate });

    const data = await TaskCompletionHistoryDAL.getCompletionByDate(userId, startDate, endDate);

    console.log(`🎯 [getCompletionByDate 控制器] 返回 ${data.length} 天的汇总数据`);

    sendResult(res, { data });
  } catch (error) {
    console.error('❌ [getCompletionByDate 控制器] 错误:', error);
    sendError(res, String(error instanceof Error ? error.message : error));
  }
}

export { getTaskCompletionHistory, getTaskCompletionStats, getCompletionByDate };
