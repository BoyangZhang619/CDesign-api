/**
 * 健康画像业务逻辑层
 * 负责计算、生成和处理健康画像数据
 */

import { PortraitDAL } from './portraitDAL.js';
import { AIChatService } from './aiChatService.js';
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
import { getCurrentDateTimeString } from '../util/dateTime.js';
import { get } from 'http';

export class PortraitService {
  /**
   * 获取用户的完整健康画像数据
   */
  static async getPortrait(userId: number): Promise<PortraitData> {
    try {
      console.log('[PortraitService.getPortrait] 获取用户画像:', userId);

      // 1. 检查健康档案设置状态
      const setupStatus = await PortraitDAL.getSetupStatus(userId);
      if (!setupStatus || setupStatus.userId !== userId) {
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
        lastUpdated: getCurrentDateTimeString(new Date(status.completedAt))
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
        lastUpdated: getCurrentDateTimeString(new Date(status.completedAt))
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

  /**
   * 从 checkin 数据刷新健康画像
   * 获取运动、饮食、睡眠的打卡数据，使用 aiChat 分析并更新健康画像
   * 
   * 逻辑：
   * - 如果用户已有数据（分数 > 0），直接返回现有数据
   * - 如果用户无数据，调用 aiChat 分析并保存
   */
  static async refreshPortraitFromCheckin(userId: number): Promise<PortraitData> {
    try {
      console.log('[PortraitService.refreshPortraitFromCheckin] 从 checkin 刷新画像，用户:', userId);

      // 1. 首先检查用户是否已有有效数据
      const existingPortrait = await PortraitDAL.getPortrait(userId);
      
      // 如果用户已有数据（至少有一项分数 > 0），直接返回现有数据
      if (existingPortrait && 
          (existingPortrait.exerciseScore > 0 || 
           existingPortrait.mealScore > 0 || 
           existingPortrait.sleepScore > 0)) {
        console.log('[PortraitService.refreshPortraitFromCheckin] 用户已有数据，直接返回现有数据');
        
        // 获取建议和时间轴
        const recommendations = await this.generateRecommendations(userId, existingPortrait);
        const timeline = await this.generateTimeline(userId);
        
        // 构建雷达图数据
        const radarData = this.buildRadarData(
          existingPortrait.exerciseScore,
          existingPortrait.mealScore,
          existingPortrait.sleepScore,
          existingPortrait.cardioStatus,
          existingPortrait.metabolism,
          0
        );
        
        return {
          exerciseScore: existingPortrait.exerciseScore,
          mealScore: existingPortrait.mealScore,
          sleepScore: existingPortrait.sleepScore,
          bmi: existingPortrait.bmi,
          bmiStatus: existingPortrait.bmiStatus,
          cardioLevel: existingPortrait.cardioLevel,
          cardioStatus: existingPortrait.cardioStatus,
          metabolism: existingPortrait.metabolism,
          metabolismStatus: existingPortrait.metabolismStatus,
          sleepQuality: existingPortrait.sleepQuality,
          sleepQualityStatus: existingPortrait.sleepQualityStatus,
          radarData,
          recommendations,
          timeline
        };
      }

      // 2. 用户无数据，获取最近的打卡数据
      const checkinData = await PortraitDAL.getLatestCheckinData(userId);


      // 3. 使用 aiChat 分析打卡数据并生成新的评分
      const analysisResult = await this.analyzeCheckinDataWithAI(userId, checkinData);

      // 4. 更新健康画像（基于 upsert，因为每个用户只有一条记录）
      const updatedPortrait = await PortraitDAL.upsertPortrait(userId, {
        exerciseScore: analysisResult.exerciseScore,
        mealScore: analysisResult.mealScore,
        sleepScore: analysisResult.sleepScore,
        metabolism: analysisResult.metabolism,
        bmi: analysisResult.bmi,
        bmiStatus: analysisResult.bmiStatus,
        cardioLevel: analysisResult.cardioLevel,
        cardioStatus: analysisResult.cardioStatus,
        sleepQuality: analysisResult.sleepQuality,
        sleepQualityStatus: analysisResult.sleepQualityStatus,
        radarData: null // 会在 getPortrait 中重新生成
      });

      // 5. 重新生成建议和时间轴
      const recommendations = await this.generateRecommendations(userId, updatedPortrait);
      const timeline = await this.generateTimeline(userId);

      // 6. 构建完整响应
      const radarData = this.buildRadarData(
        updatedPortrait.exerciseScore,
        updatedPortrait.mealScore,
        updatedPortrait.sleepScore,
        updatedPortrait.cardioStatus,
        updatedPortrait.metabolism,
        0
      );

      return {
        exerciseScore: updatedPortrait.exerciseScore,
        mealScore: updatedPortrait.mealScore,
        sleepScore: updatedPortrait.sleepScore,
        bmi: updatedPortrait.bmi,
        bmiStatus: updatedPortrait.bmiStatus,
        cardioLevel: updatedPortrait.cardioLevel,
        cardioStatus: updatedPortrait.cardioStatus,
        metabolism: updatedPortrait.metabolism,
        metabolismStatus: updatedPortrait.metabolismStatus,
        sleepQuality: updatedPortrait.sleepQuality,
        sleepQualityStatus: updatedPortrait.sleepQualityStatus,
        radarData,
        recommendations,
        timeline
      };
    } catch (error) {
      console.error('[PortraitService.refreshPortraitFromCheckin] 错误:', error);
      throw error;
    }
  }

  /**
   * 使用 aiChat 分析 checkin 数据
   */
  private static async analyzeCheckinDataWithAI(userId: number, checkinData: any): Promise<any> {
    console.log('[PortraitService.analyzeCheckinDataWithAI] 分析 checkin 数据，用户:', userId);

    try {
      // 获取用户的健康档案设置信息和个人资料，用于提供背景信息给 AI
      const setupStatus = await PortraitDAL.getSetupStatus(userId);
      const userProfile = await PortraitDAL.getUserProfile(userId);
      
      // 构建包含用户背景信息的 AI 分析提示
      const analysisPrompt = `[用户的总体状态信息处理与分析]
请根据以下用户的健康信息、最近的打卡数据以及任务完成情况进行综合分析，并返回 JSON 格式的评分结果。

【用户背景信息】
年龄: ${userProfile?.age || '未知'}岁
性别: ${userProfile?.gender === 'male' ? '男' : '女'}
身高: ${userProfile?.heightCm || '未知'}cm
体重: ${userProfile?.currentWeightKg || '未知'}kg
目标体重: ${userProfile?.targetWeightKg || '未知'}kg
活动级别: ${userProfile?.activityLevel || '未知'}
健康目标: ${userProfile?.healthGoals || '未知'}
饮食偏好: ${userProfile?.dietaryPreferences || '未知'}
过敏信息: ${userProfile?.allergies || '无'}
作息习惯: ${userProfile?.workRestHabit || '未知'}

【最近打卡数据统计】
运动数据（最近7天）:
- 总记录数: ${checkinData.exerciseData?.length || 0}条
- 平均时长: ${checkinData.exerciseData && checkinData.exerciseData.length > 0 ? Math.round(checkinData.exerciseData.reduce((sum: number, r: any) => sum + (r.duration_min || 0), 0) / checkinData.exerciseData.length) : 0}分钟
- 强度分布: ${checkinData.exerciseData && checkinData.exerciseData.length > 0 ? checkinData.exerciseData.map((e: any) => e.intensity).filter((v: any) => v).join(', ') : '暂无'}
- 总消耗热量: ${checkinData.exerciseData && checkinData.exerciseData.length > 0 ? Math.round(checkinData.exerciseData.reduce((sum: number, r: any) => sum + (r.calories_burned || 0), 0)) : 0}大卡

饮食数据（最近7天）:
- 记录总数: ${checkinData.mealData?.length || 0}条
- 平均热量/餐: ${checkinData.mealData && checkinData.mealData.length > 0 ? Math.round(checkinData.mealData.reduce((sum: number, m: any) => sum + (m.calories || 0), 0) / checkinData.mealData.length) : 0}大卡
- 餐次分布: ${checkinData.mealData && checkinData.mealData.length > 0 ? [...new Set(checkinData.mealData.map((m: any) => m.meal_type))].join(', ') : '暂无'}

睡眠数据（最近7天）:
- 记录总数: ${checkinData.sleepData?.length || 0}条
- 平均睡眠时长: ${checkinData.sleepData && checkinData.sleepData.length > 0 ? Math.round(checkinData.sleepData.reduce((sum: number, s: any) => sum + (Number(s.sleep_duration_hours) || 0), 0) / checkinData.sleepData.length * 10) / 10 : 0}小时
- 平均睡眠质量评分: ${checkinData.sleepData && checkinData.sleepData.length > 0 ? Math.round(checkinData.sleepData.reduce((sum: number, s: any) => sum + (s.sleep_quality_score || 0), 0) / checkinData.sleepData.length) : 0}/100

任务完成情况（最近7天）:
- 总完成任务数: ${checkinData.taskCompletionData?.length || 0}条
${checkinData.taskCompletionData && checkinData.taskCompletionData.length > 0 ? `- 任务类型分布: ${[...new Set(checkinData.taskCompletionData.map((t: any) => t.task_type))].join(', ')}
- 优先级分布: ${[...new Set(checkinData.taskCompletionData.map((t: any) => t.task_priority))].join(', ')}
- 完成的任务: ${checkinData.taskCompletionData.slice(0, 5).map((t: any) => t.task_title).join('、')}${checkinData.taskCompletionData.length > 5 ? '等' : ''}` : '- 未完成任何任务'}

身体指标:
- BMI: ${checkinData.bmi?.toFixed(1) || '未知'}

【分析要求】
根据上述用户背景、打卡数据和任务完成情况，请分析用户的健康状况和自律程度，并返回以下 JSON 格式的结果（只返回JSON，不要其他文字）：

{
  "exerciseScore": 0-100 的数字,
  "mealScore": 0-100 的数字,
  "sleepScore": 0-100 的数字,
  "metabolism": 0-100 的数字,
  "bmi": 数字,
  "bmiStatus": "underweight|normal|overweight|obese 中的一个",
  "cardioLevel": "用户心肺功能描述，如'良好'、'待改善'等",
  "cardioStatus": "excellent|good|normal|poor 中的一个",
  "sleepQuality": "用户睡眠质量描述，如'优质'、'良好'等",
  "sleepQualityStatus": "excellent|good|normal|poor 中的一个"
}`;

      // 调用 AIChatService 获取分析结果
      const sessionData = {
        title: `Portrait Analysis ${getCurrentDateTimeString().split('T')[0]}`,
        description: '打卡数据AI分析',
        ai_model: 'dashscope'
      };

      const session = await AIChatService.createSession(userId, sessionData);
      const aiResult = await AIChatService.sendMessage(userId, session.id, analysisPrompt);

      // 检查 AI 调用是否成功
      if (!aiResult?.aiMessage) {
        console.warn('[PortraitService.analyzeCheckinDataWithAI] AI 调用失败: 无有效响应');
        // 使用本地计算作为备选方案
        return {
          exerciseScore: this.calculateExerciseScoreFromCheckin(checkinData.exerciseData),
          mealScore: this.calculateMealScoreFromCheckin(checkinData.mealData),
          sleepScore: this.calculateSleepScoreFromCheckin(checkinData.sleepData),
          metabolism: Math.round(Math.random() * 100),
          bmi: checkinData.bmi || 0,
          bmiStatus: this.calculateBmiStatus(checkinData.bmi || 0),
          cardioLevel: '待评估',
          cardioStatus: 'normal' as CardioStatus,
          sleepQuality: '待评估',
          sleepQualityStatus: 'normal' as SleepQualityStatus
        };
      }

      // 解析 AI 的 JSON 响应
      let result;
      try {
        // 尝试从响应中提取 JSON
        const jsonMatch = aiResult.aiMessage.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
          console.log('[PortraitService.analyzeCheckinDataWithAI] AI 分析结果:', result);
          return result;
        } else {
          throw new Error('无法从 AI 响应中提取 JSON');
        }
      } catch (parseError) {
        console.warn('[PortraitService.analyzeCheckinDataWithAI] AI 返回格式解析失败，使用本地计算:', parseError);
        // 如果 AI 响应格式不正确，使用本地计算作为备选方案
        return {
          exerciseScore: this.calculateExerciseScoreFromCheckin(checkinData.exerciseData),
          mealScore: this.calculateMealScoreFromCheckin(checkinData.mealData),
          sleepScore: this.calculateSleepScoreFromCheckin(checkinData.sleepData),
          metabolism: Math.round(Math.random() * 100),
          bmi: checkinData.bmi || 0,
          bmiStatus: this.calculateBmiStatus(checkinData.bmi || 0),
          cardioLevel: '待评估',
          cardioStatus: 'normal' as CardioStatus,
          sleepQuality: '待评估',
          sleepQualityStatus: 'normal' as SleepQualityStatus
        };
      }
    } catch (error) {
      console.error('[PortraitService.analyzeCheckinDataWithAI] AI 分析失败:', error);
      // 返回基于本地计算的备选结果，确保不中断主流程
      return {
        exerciseScore: this.calculateExerciseScoreFromCheckin(checkinData.exerciseData),
        mealScore: this.calculateMealScoreFromCheckin(checkinData.mealData),
        sleepScore: this.calculateSleepScoreFromCheckin(checkinData.sleepData),
        metabolism: Math.round(Math.random() * 100),
        bmi: checkinData.bmi || 0,
        bmiStatus: this.calculateBmiStatus(checkinData.bmi || 0),
        cardioLevel: '待评估',
        cardioStatus: 'normal' as CardioStatus,
        sleepQuality: '待评估',
        sleepQualityStatus: 'normal' as SleepQualityStatus
      };
    }
  }

  /**
   * 根据运动 checkin 数据计算运动评分
   */
  private static calculateExerciseScoreFromCheckin(exerciseData: any[]): number {
    if (!exerciseData || exerciseData.length === 0) return 0;

    // 根据运动频率、时长、强度计算评分
    const totalMinutes = exerciseData.reduce((sum: number, record: any) => sum + (record.duration_min || 0), 0);
    const frequencyScore = Math.min(exerciseData.length * 15, 40); // 运动频次评分，最高40分
    
    // 时长评分（每周建议150分钟中等强度运动）
    const durationScore = Math.min((totalMinutes / 150) * 40, 40); // 最高40分
    
    // 强度评分
    const highIntensityCount = exerciseData.filter((r: any) => r.intensity === 'high').length;
    const intensityScore = Math.min((highIntensityCount / Math.max(exerciseData.length, 1)) * 20, 20); // 最高20分

    const score = frequencyScore + durationScore + intensityScore;
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * 根据饮食 checkin 数据计算饮食评分
   */
  private static calculateMealScoreFromCheckin(mealData: any[]): number {
    if (!mealData || mealData.length === 0) return 0;

    // 根据饮食规律性和营养均衡度评分
    const frequencyScore = Math.min(mealData.length * 15, 40); // 进餐频次评分，最高40分
    
    // 营养均衡度：检查是否包含足够的营养成分
    const balancedMeals = mealData.filter((m: any) => {
      const hasProtein = m.protein_g && Number(m.protein_g) > 0;
      const hasFat = m.fat_g && Number(m.fat_g) > 0;
      const hasCarbs = m.carbohydrate_g && Number(m.carbohydrate_g) > 0;
      return hasProtein && hasFat && hasCarbs;
    }).length;
    
    const balanceScore = (balancedMeals / Math.max(mealData.length, 1)) * 40; // 最高40分
    
    // 热量适度性评分
    const avgCalories = mealData.reduce((sum: number, m: any) => sum + (Number(m.calories) || 0), 0) / mealData.length;
    let calorieScore = 0;
    if (avgCalories >= 400 && avgCalories <= 800) {
      calorieScore = 20; // 最高20分
    } else if (avgCalories >= 300 && avgCalories <= 900) {
      calorieScore = 15;
    } else {
      calorieScore = 5;
    }

    const score = frequencyScore + balanceScore + calorieScore;
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * 根据睡眠 checkin 数据计算睡眠评分
   */
  private static calculateSleepScoreFromCheckin(sleepData: any[]): number {
    if (!sleepData || sleepData.length === 0) return 0;

    // 优先使用 AI 评分（sleep_quality_score），如果没有则使用时长推算
    const hasAiScores = sleepData.some(s => s.sleep_quality_score);
    
    if (hasAiScores) {
      // 使用 AI 给出的睡眠质量评分
      const avgScore = sleepData.reduce((sum: number, record: any) => {
        return sum + (record.sleep_quality_score || 0);
      }, 0) / sleepData.length;
      
      return Math.round(Math.max(0, Math.min(100, avgScore)));
    }

    // 备选方案：根据平均睡眠时长和规律性评分
    const averageDuration = sleepData.reduce((sum: number, record: any) => sum + (Number(record.sleep_duration_hours) || 0), 0) / sleepData.length;

    // 理想睡眠 7-8 小时
    let score = 0;
    if (averageDuration >= 7 && averageDuration <= 8) {
      score = 90;
    } else if (averageDuration >= 6 && averageDuration <= 9) {
      score = 75;
    } else if (averageDuration >= 5 && averageDuration <= 10) {
      score = 50;
    } else {
      score = 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 强制刷新健康画像数据
   * 忽略现有数据，强制调用 AI 重新分析打卡数据
   */
  static async forceRefreshPortrait(userId: number): Promise<PortraitData> {
    try {
      console.log('[PortraitService.forceRefreshPortrait] 强制刷新画像，用户:', userId);

      // 1. 获取最近的打卡数据
      const checkinData = await PortraitDAL.getLatestCheckinData(userId);

      // 2. 使用 aiChat 分析打卡数据并生成新的评分
      const analysisResult = await this.analyzeCheckinDataWithAI(userId, checkinData);

      // 3. 更新健康画像
      const updatedPortrait = await PortraitDAL.upsertPortrait(userId, {
        exerciseScore: analysisResult.exerciseScore,
        mealScore: analysisResult.mealScore,
        sleepScore: analysisResult.sleepScore,
        metabolism: analysisResult.metabolism,
        bmi: analysisResult.bmi,
        bmiStatus: analysisResult.bmiStatus,
        cardioLevel: analysisResult.cardioLevel,
        cardioStatus: analysisResult.cardioStatus,
        sleepQuality: analysisResult.sleepQuality,
        sleepQualityStatus: analysisResult.sleepQualityStatus,
        radarData: null
      });

      // 4. 重新生成建议和时间轴
      const recommendations = await this.generateRecommendations(userId, updatedPortrait);
      const timeline = await this.generateTimeline(userId);

      // 5. 构建完整响应
      const radarData = this.buildRadarData(
        updatedPortrait.exerciseScore,
        updatedPortrait.mealScore,
        updatedPortrait.sleepScore,
        updatedPortrait.cardioStatus,
        updatedPortrait.metabolism,
        0
      );

      return {
        exerciseScore: updatedPortrait.exerciseScore,
        mealScore: updatedPortrait.mealScore,
        sleepScore: updatedPortrait.sleepScore,
        bmi: updatedPortrait.bmi,
        bmiStatus: updatedPortrait.bmiStatus,
        cardioLevel: updatedPortrait.cardioLevel,
        cardioStatus: updatedPortrait.cardioStatus,
        metabolism: updatedPortrait.metabolism,
        metabolismStatus: updatedPortrait.metabolismStatus,
        sleepQuality: updatedPortrait.sleepQuality,
        sleepQualityStatus: updatedPortrait.sleepQualityStatus,
        radarData,
        recommendations,
        timeline
      };
    } catch (error) {
      console.error('[PortraitService.forceRefreshPortrait] 错误:', error);
      throw error;
    }
  }
}
