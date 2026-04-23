/**
 * 趋势分析控制器
 */

import { Request, Response } from 'express';
import { TrendsService } from '../services/trendsService.js';
import { sendError, sendResult } from '../util/response.js';

export class TrendsController {
  /**
   * 获取趋势分析数据
   * GET /api/analysis/trends?range=month
   */
  static async getTrendsData(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, '未授权', 401);
      }

      const range = (req.query.range as string) || 'month';

      // 验证 range 参数
      const validRanges = ['week', 'month', 'quarter', 'year'];
      if (!validRanges.includes(range)) {
        return sendError(res, '无效的范围参数', 400);
      }

      console.log('[TrendsController.getTrendsData] 获取趋势数据，用户:', userId, '范围:', range);

      const trendsData = await TrendsService.getTrendsData(userId, range);

      return sendResult(res, trendsData, '获取趋势数据成功');
    } catch (error) {
      console.error('[TrendsController.getTrendsData] 错误:', error);
      return sendError(res, '获取趋势数据失败', 500);
    }
  }

  /**
   * 获取特定维度的详细数据
   * GET /api/analysis/trends/detail/:dimension
   * dimension: exercise, meal, sleep
   */
  static async getTrendDetail(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, '未授权', 401);
      }

      const { dimension } = req.params;
      const range = (req.query.range as string) || 'month';

      const validDimensions = ['exercise', 'meal', 'sleep'];
      if (!validDimensions.includes(dimension as string)) {
        return sendError(res, '无效的维度参数', 400);
      }

      console.log('[TrendsController.getTrendDetail] 获取', dimension, '详细数据，用户:', userId);

      // 获取基础趋势数据
      const trendsData = await TrendsService.getTrendsData(userId, range);

      // 返回指定维度的数据
      let detail: any = {};

      if (dimension === 'exercise') {
        detail = {
          avgDuration: trendsData.avgExercise,
          maxDuration: trendsData.maxExercise,
          totalTime: trendsData.totalExerciseTime,
          trend: trendsData.exerciseTrend
        };
      } else if (dimension === 'meal') {
        detail = {
          avgCalories: trendsData.avgMealCalories,
          maxCalories: trendsData.maxMealCalories,
          totalCalories: trendsData.totalCalories,
          trend: trendsData.caloriesTrend
        };
      } else if (dimension === 'sleep') {
        detail = {
          avgDuration: trendsData.avgSleep,
          maxDuration: trendsData.maxSleep,
          totalTime: trendsData.totalSleepTime,
          trend: trendsData.sleepTrend
        };
      }

      return sendResult(res, { dimension, ...detail, dailyData: trendsData.dailyData }, `获取${dimension}详细数据成功`);
    } catch (error) {
      console.error('[TrendsController.getTrendDetail] 错误:', error);
      return sendError(res, "获取趋势详情失败", 500);
    }
  }
}
