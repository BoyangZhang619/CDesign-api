/**
 * 趋势分析控制器
 */

import { Request, Response } from 'express';
import { TrendsService } from '../services/trendsService.js';

export class TrendsController {
  /**
   * 获取趋势分析数据
   * GET /api/analysis/trends?range=month
   */
  static async getTrendsData(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权'
        });
      }

      const range = (req.query.range as string) || 'month';
      
      // 验证 range 参数
      const validRanges = ['week', 'month', 'quarter', 'year'];
      if (!validRanges.includes(range)) {
        return res.status(400).json({
          success: false,
          message: '无效的时间范围'
        });
      }

      console.log('[TrendsController.getTrendsData] 获取趋势数据，用户:', userId, '范围:', range);

      const trendsData = await TrendsService.getTrendsData(userId, range);

      return res.status(200).json({
        success: true,
        message: '获取趋势数据成功',
        data: trendsData
      });
    } catch (error) {
      console.error('[TrendsController.getTrendsData] 错误:', error);
      return res.status(500).json({
        success: false,
        message: '获取趋势数据失败'
      });
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
        return res.status(401).json({
          success: false,
          message: '未授权'
        });
      }

      const { dimension } = req.params;
      const range = (req.query.range as string) || 'month';

      const validDimensions = ['exercise', 'meal', 'sleep'];
      if (!validDimensions.includes(dimension as string)) {
        return res.status(400).json({
          success: false,
          message: '无效的维度'
        });
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

      return res.status(200).json({
        success: true,
        message: `获取${dimension}详细数据成功`,
        data: {
          dimension,
          ...detail,
          dailyData: trendsData.dailyData
        }
      });
    } catch (error) {
      console.error('[TrendsController.getTrendDetail] 错误:', error);
      return res.status(500).json({
        success: false,
        message: '获取趋势详情失败'
      });
    }
  }
}
