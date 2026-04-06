/**
 * 健康画像控制器
 */

import { Request, Response } from 'express';
import { PortraitService } from '../services/portraitService.js';
import { sendResult, sendError } from '../util/response.js';

function getUserIdFromReq(req: Request): number {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new Error('未授权：缺少用户信息');
  }
  return Number(userId);
}

export class PortraitController {
  /**
   * 获取健康画像数据
   * GET /api/health/portrait
   */
  static async getPortrait(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      console.log('[PortraitController.getPortrait] 获取画像，用户:', userId);

      const data = await PortraitService.getPortrait(userId);

      sendResult(res, data, '获取成功', 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // 检查是否是档案未完成错误
      if (message.includes('未完成健康档案设置')) {
        sendError(res, message, 400);
      } else {
        sendError(res, message, 500);
      }
    }
  }

  /**
   * 获取健康档案设置状态
   * GET /api/health/setup-status
   */
  static async getSetupStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      console.log('[PortraitController.getSetupStatus] 获取设置状态，用户:', userId);

      const data = await PortraitService.getSetupStatus(userId);

      sendResult(res, data, '查询成功', 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendError(res, message, 500);
    }
  }

  /**
   * 更新健康档案设置状态
   * PUT /api/health/setup-status
   */
  static async updateSetupStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const {
        basicInfoCompleted,
        healthExamCompleted,
        healthGoalsCompleted
      } = req.body;

      console.log('[PortraitController.updateSetupStatus] 更新设置状态，用户:', userId);

      const data = await PortraitService.updateSetupStatus(
        userId,
        basicInfoCompleted,
        healthExamCompleted,
        healthGoalsCompleted
      );

      sendResult(res, data, '更新成功', 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendError(res, message, 500);
    }
  }

  /**
   * 获取健康历史数据（用于对比）
   * GET /api/health/portrait/history
   */
  static async getPortraitHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;
      const interval = (req.query.interval as string) || 'day';

      console.log('[PortraitController.getPortraitHistory] 获取历史数据，用户:', userId);

      // TODO: 实现历史数据查询逻辑
      // 这需要在 PortraitService 中实现历史数据的查询和聚合

      sendResult(res, [], '获取成功', 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendError(res, message, 500);
    }
  }

  /**
   * 获取用户健康档案详情
   * GET /api/health/profile
   */
  static async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      console.log('[PortraitController.getUserProfile] 获取用户档案，用户:', userId);

      const data = await PortraitService.getUserProfile(userId);

      sendResult(res, data, '获取成功', 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendError(res, message, error instanceof Error && message.includes('不存在') ? 404 : 500);
    }
  }

  /**
   * 更新用户健康档案
   * PUT /api/health/profile
   */
  static async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const profileData = req.body;

      console.log('[PortraitController.updateUserProfile] 更新用户档案，用户:', userId);

      const data = await PortraitService.updateUserProfile(userId, profileData);

      sendResult(res, data, '更新成功', 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendError(res, message, 400);
    }
  }

  /**
   * 从 checkin 数据刷新健康画像
   * POST /api/health/refresh-from-checkin
   * 逻辑：如果已有数据则返回，无数据才调用 AI
   */
  static async refreshPortraitFromCheckin(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      console.log('[PortraitController.refreshPortraitFromCheckin] 从 checkin 刷新画像，用户:', userId);

      const data = await PortraitService.refreshPortraitFromCheckin(userId);

      sendResult(res, data, '健康画像已返回', 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendError(res, message, error instanceof Error && message.includes('未完成健康档案设置') ? 400 : 500);
    }
  }

  /**
   * 强制刷新健康画像数据
   * POST /api/health/force-refresh
   * 忽略现有数据，强制调用 AI 重新分析
   */
  static async forceRefreshPortrait(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      console.log('[PortraitController.forceRefreshPortrait] 强制刷新画像，用户:', userId);

      const data = await PortraitService.forceRefreshPortrait(userId);

      sendResult(res, data, '健康画像已强制更新', 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendError(res, message, error instanceof Error && message.includes('未完成健康档案设置') ? 400 : 500);
    }
  }
}
