/**
 * 健康画像业务逻辑层
 * 负责计算、生成和处理健康画像数据
 */

import { PortraitDAL } from './portraitDAL.js';
import type {
  PortraitData,
  RadarData,
  Recommendation,
  TimelineEvent,
  BMIStatus,
  CardioStatus,
  MetabolismStatus,
  SleepQualityStatus,
  Priority
} from '../types/portrait.js';

export class PortraitService {
  /**
   * 获取用户的完整健康画像数据
   */
  static async getPortrait(userId: number): Promise<PortraitData> {
    try {
      console.log('[PortraitService.getPortrait] 获取用户画像:', userId);

      // 1. 检查健康档案设置状态
      const setupStatus = await PortraitDAL.getSetupStatus(userId);
      if (setupStatus?.userId != userId || !setupStatus) {
        throw new Error('用户未完成健康档案设置');
      }

      // 2. 获取健康画像基础数据
      let portrait = await PortraitDAL.getPortrait(userId);

      // 如果没有画像数据，使用默认值
      if (!portrait) {
        portrait = await this.initializeDefaultPortrait(userId);
      }

      // 3. 生成个性化建议
      const recommendations = await this.generateRecommendations(userId, portrait);

      // 4. 生成进度时间轴
      const timeline = await this.generateTimeline(userId);

      // 5. 确保雷达图数据存在
      let radarData = portrait.radarData;
      if (!radarData) {
        radarData = this.buildRadarData(
          portrait.exerciseScore,
          portrait.mealScore,
          portrait.sleepScore,
          portrait.cardioStatus,
          portrait.metabolism,
          0 // 暂时使用默认压力指数
        );
      }

      const data: PortraitData = {
        exerciseScore: portrait.exerciseScore,
        mealScore: portrait.mealScore,
        sleepScore: portrait.sleepScore,
        bmi: portrait.bmi,
        bmiStatus: portrait.bmiStatus,
        cardioLevel: portrait.cardioLevel,
        cardioStatus: portrait.cardioStatus,
        metabolism: portrait.metabolism,
        metabolismStatus: portrait.metabolismStatus,
        sleepQuality: portrait.sleepQuality,
        sleepQualityStatus: portrait.sleepQualityStatus,
        radarData,
        recommendations,
        timeline
      };

      console.log('[PortraitService.getPortrait] 返回数据:', data);
      return data;
    } catch (error) {
      console.error('[PortraitService.getPortrait] 错误:', error);
      throw error;
    }
  }

  /**
   * 初始化默认画像数据
   */
  private static async initializeDefaultPortrait(userId: number) {
    console.log('[PortraitService.initializeDefaultPortrait] 初始化用户:', userId);

    const defaultPortrait = {
      exerciseScore: 0,
      mealScore: 0,
      sleepScore: 0,
      bmi: 0,
      bmiStatus: 'normal' as BMIStatus,
      cardioLevel: '未评估',
      cardioStatus: 'normal' as CardioStatus,
      metabolism: 0,
      metabolismStatus: 'normal' as MetabolismStatus,
      sleepQuality: '未评估',
      sleepQualityStatus: 'normal' as SleepQualityStatus,
      radarData: null
    };

    return await PortraitDAL.upsertPortrait(userId, defaultPortrait);
  }

  /**
   * 生成个性化建议
   */
  private static async generateRecommendations(
    userId: number,
    portrait: any
  ): Promise<Recommendation[]> {
    console.log('[PortraitService.generateRecommendations] 生成建议，用户:', userId);

    try {
      // 清除旧的建议
      await PortraitDAL.clearRecommendations(userId);

      const recommendations: Omit<Recommendation, 'sourceType'>[] = [];

      // 1. 运动建议
      if (portrait.exerciseScore < 70) {
        const priority = portrait.exerciseScore < 50 ? 'high' : 'medium';
        recommendations.push({
          icon: '🏃',
          title: portrait.exerciseScore < 50 ? '增加有氧运动' : '加强运动计划执行力',
          description: portrait.exerciseScore < 50
            ? '建议每周进行3-5次有氧运动，每次30分钟以上，可以有效提升心肺功能和整体健康水平'
            : '您目前的运动频率还需要提高，建议制定详细的运动计划并严格执行',
          priority
        });

        // 保存到数据库
        await PortraitDAL.addRecommendation(userId, {
          ...recommendations[recommendations.length - 1],
          sourceType: 'exercise',
          sourceScore: portrait.exerciseScore,
          isActive: true
        });
      }

      // 2. 饮食建议
      if (portrait.mealScore < 70) {
        const priority = portrait.mealScore < 50 ? 'high' : 'medium';
        recommendations.push({
          icon: '🥗',
          title: portrait.mealScore < 50 ? '均衡膳食结构' : '改善饮食习惯',
          description: portrait.mealScore < 50
            ? '增加蔬菜水果摄入，减少高热量食物，保持营养均衡，三餐规律'
            : '建议改善饮食结构，偶有不均衡情况，需要更加谨慎',
          priority
        });

        await PortraitDAL.addRecommendation(userId, {
          ...recommendations[recommendations.length - 1],
          sourceType: 'meal',
          sourceScore: portrait.mealScore,
          isActive: true
        });
      }

      // 3. 睡眠建议
      if (portrait.sleepScore < 80) {
        const priority = portrait.sleepScore < 50 ? 'high' : 'medium';
        recommendations.push({
          icon: '🌙',
          title: portrait.sleepScore < 50 ? '规律作息' : '逐步调整睡眠时间',
          description: portrait.sleepScore < 50
            ? '建议22:30前入睡，保证7-8小时睡眠时间，养成规律的作息习惯'
            : '您的睡眠时间基本规律，但还可以进一步改善睡眠质量',
          priority
        });

        await PortraitDAL.addRecommendation(userId, {
          ...recommendations[recommendations.length - 1],
          sourceType: 'sleep',
          sourceScore: portrait.sleepScore,
          isActive: true
        });
      }

      // 4. 心肺功能建议
      if (portrait.cardioStatus !== 'excellent' && portrait.cardioStatus !== 'good') {
        recommendations.push({
          icon: '💪',
          title: '增强心肺功能',
          description: '通过坚持有氧运动（跑步、游泳、骑行等），可以有效改善心肺功能，增强体质',
          priority: 'high'
        });

        await PortraitDAL.addRecommendation(userId, {
          ...recommendations[recommendations.length - 1],
          sourceType: 'cardio',
          sourceScore: 0,
          isActive: true
        });
      }

      // 5. 压力管理建议（如果压力指数低）
      const stressManagementScore = (portrait.exerciseScore * 0.4 + portrait.sleepScore * 0.6);
      if (stressManagementScore < 60) {
        recommendations.push({
          icon: '🧘',
          title: '压力管理',
          description: '学习冥想和放松技巧，可以有效缓解压力，改善心理健康。建议每天进行10-15分钟的冥想',
          priority: 'medium'
        });

        await PortraitDAL.addRecommendation(userId, {
          ...recommendations[recommendations.length - 1],
          sourceType: 'stress',
          sourceScore: Math.round(stressManagementScore),
          isActive: true
        });
      }

      // 6. 固定建议：补水
      recommendations.push({
        icon: '💧',
        title: '适当补水',
        description: '每天建议饮用8杯水（约2升），保持身体水分平衡，有助于新陈代谢',
        priority: 'low'
      });

      await PortraitDAL.addRecommendation(userId, {
        ...recommendations[recommendations.length - 1],
        sourceType: 'water',
        sourceScore: 100,
        isActive: true
      });

      // 返回前 4 条建议（优先级从高到低排序）
      return recommendations.slice(0, 4) as Recommendation[];
    } catch (error) {
      console.error('[PortraitService.generateRecommendations] 错误:', error);
      // 返回默认建议
      return [
        {
          icon: '💡',
          title: '继续改进',
          description: '持续关注您的健康指标，坚持健康的生活方式',
          priority: 'medium'
        }
      ];
    }
  }

  /**
   * 生成进度时间轴
   */
  private static async generateTimeline(userId: number): Promise<TimelineEvent[]> {
    console.log('[PortraitService.generateTimeline] 生成时间轴，用户:', userId);

    try {
      const events = await PortraitDAL.getTimeline(userId);

      // 格式化时间轴事件
      return events.map(event => ({
        date: this.formatTimelineDate(new Date(event.eventDate)),
        title: event.title,
        description: event.description,
        status: event.status,
        eventType: event.eventType
      }));
    } catch (error) {
      console.error('[PortraitService.generateTimeline] 错误:', error);
      // 返回默认时间轴
      return [];
    }
  }

  /**
   * 格式化时间轴日期
   */
  private static formatTimelineDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
  }

  /**
   * 构建雷达图数据
   */
  private static buildRadarData(
    exerciseScore: number,
    mealScore: number,
    sleepScore: number,
    cardioStatus: CardioStatus,
    metabolism: number,
    stressManagementScore: number
  ): RadarData {
    // 根据心肺功能状态计算心肺功能评分
    let cardioScore = 0;
    switch (cardioStatus) {
      case 'excellent':
        cardioScore = 95;
        break;
      case 'good':
        cardioScore = 80;
        break;
      case 'normal':
        cardioScore = 60;
        break;
      case 'poor':
        cardioScore = 40;
        break;
    }

    // 如果没有提供压力管理评分，则根据运动和睡眠计算
    if (stressManagementScore === 0) {
      stressManagementScore = Math.round(exerciseScore * 0.4 + sleepScore * 0.6);
    }

    return {
      exercise: exerciseScore,
      meal: mealScore,
      sleep: sleepScore,
      cardio: cardioScore,
      metabolism,
      stressManagement: stressManagementScore
    };
  }

  /**
   * 计算 BMI 状态
   */
  static calculateBmiStatus(bmi: number): BMIStatus {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 24) return 'normal';
    if (bmi < 28) return 'overweight';
    return 'obese';
  }

  /**
   * 计算心肺功能状态
   */
  static calculateCardioStatus(exerciseScore: number): CardioStatus {
    if (exerciseScore >= 85) return 'excellent';
    if (exerciseScore >= 70) return 'good';
    if (exerciseScore >= 50) return 'normal';
    return 'poor';
  }

  /**
   * 计算代谢状态
   */
  static calculateMetabolismStatus(metabolism: number): MetabolismStatus {
    if (metabolism >= 85) return 'high';
    if (metabolism >= 70) return 'normal';
    return 'low';
  }

  /**
   * 计算睡眠质量状态
   */
  static calculateSleepQualityStatus(sleepScore: number): SleepQualityStatus {
    if (sleepScore >= 90) return 'excellent';
    if (sleepScore >= 75) return 'good';
    if (sleepScore >= 50) return 'normal';
    return 'poor';
  }

  /**
   * 检查健康档案设置状态
   */
  static async getSetupStatus(userId: number) {
    try {
      const status = await PortraitDAL.getSetupStatus(userId);
      
      if (!status) {
        return await PortraitDAL.initializeSetupStatus(userId);
      }

      return {
        completed: status.isCompleted,
        lastUpdated: status.completedAt?.toISOString()
      };
    } catch (error) {
      console.error('[PortraitService.getSetupStatus] 错误:', error);
      throw error;
    }
  }

  /**
   * 更新健康档案设置状态
   */
  static async updateSetupStatus(
    userId: number,
    basicInfoCompleted?: boolean,
    healthExamCompleted?: boolean,
    healthGoalsCompleted?: boolean
  ) {
    try {
      // 检查是否所有步骤都完成
      const isCompleted =
        basicInfoCompleted === true &&
        healthExamCompleted === true &&
        healthGoalsCompleted === true;

      const status = await PortraitDAL.updateSetupStatus(userId, {
        isCompleted,
        basicInfoCompleted,
        healthExamCompleted,
        healthGoalsCompleted
      } as any);

      return {
        completed: status.isCompleted,
        lastUpdated: status.completedAt?.toISOString()
      };
    } catch (error) {
      console.error('[PortraitService.updateSetupStatus] 错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户健康档案详细信息
   */
  static async getUserProfile(userId: number) {
    try {
      console.log('[PortraitService.getUserProfile] 获取用户档案，用户:', userId);
      const profile = await PortraitDAL.getUserProfile(userId);
      if (!profile) {
        throw new Error('用户档案不存在');
      }
      return profile;
    } catch (error) {
      console.error('[PortraitService.getUserProfile] 错误:', error);
      throw error;
    }
  }

  /**
   * 更新用户健康档案信息
   */
  static async updateUserProfile(userId: number, profileData: any) {
    try {
      console.log('[PortraitService.updateUserProfile] 更新用户档案，用户:', userId);
      const updated = await PortraitDAL.updateUserProfile(userId, profileData);
      return updated;
    } catch (error) {
      console.error('[PortraitService.updateUserProfile] 错误:', error);
      throw error;
    }
  }
}
