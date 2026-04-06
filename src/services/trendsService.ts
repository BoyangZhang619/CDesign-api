/**
 * 趋势分析业务逻辑层
 * 负责数据聚合、统计、对比分析等
 */

import { PortraitDAL } from './portraitDAL.js';

export interface TrendsData {
  // 基础统计
  avgExercise: number;
  maxExercise: number;
  totalExerciseTime: number;
  
  avgMealCalories: number;
  maxMealCalories: number;
  
  avgSleep: number;
  maxSleep: number;
  totalSleepTime: number;
  
  // 综合指标
  totalCalories: number;
  healthScore: number;
  
  // 趋势百分比
  caloriesTrend: number;
  exerciseTrend: number;
  sleepTrend: number;
  scoreTrend: number;
  
  // 周对比
  weekComparison: {
    exerciseFrequency: number;
    exerciseFrequencyTrend: number;
    avgSleepCurrent: number;
    avgSleepPrev: number;
    sleepTrend: number;
    mealBalance: number;
    mealBalanceTrend: number;
  };
  
  // 习惯养成数据
  habits: Array<{
    id: number;
    title: string;
    description: string;
    days: number;
    progress: number;
    target: number;
  }>;
  
  // 详细数据
  dailyData: Array<{
    date: string;
    exercise: number;
    meal: number;
    sleep: number;
  }>;
}

export class TrendsService {
  /**
   * 获取指定时间范围的趋势数据
   * @param userId 用户ID
   * @param range 时间范围: week, month, quarter, year
   */
  static async getTrendsData(userId: number, range: string = 'month'): Promise<TrendsData> {
    try {
      console.log('[TrendsService.getTrendsData] 获取趋势数据，用户:', userId, '范围:', range);

      // 计算天数
      let days = 30;
      if (range === 'week') days = 7;
      else if (range === 'quarter') days = 90;
      else if (range === 'year') days = 365;

      // 获取打卡数据
      const checkinData = await PortraitDAL.getLatestCheckinData(userId, days, 0);
      
      if (!checkinData) {
        return this.getDefaultTrendsData();
      }

      // 聚合数据
      const trends = this.aggregateCheckinData(checkinData, days);
      
      // 计算对比数据 - 获取上一个周期的数据
      // offset = days 表示从上一个周期开始，days 表示周期长度
      const prevPeriodData = await PortraitDAL.getLatestCheckinData(userId, days, days);
      console.log('[TrendsService.getTrendsData] 上周期数据:', prevPeriodData);
      const comparison = this.compareWithPreviousPeriod(checkinData, prevPeriodData, days);
      
      return {
        avgExercise: trends.avgExerciseDuration,
        maxExercise: trends.maxExerciseDuration,
        totalExerciseTime: Math.round(trends.totalExerciseDuration / 60 * 10) / 10,
        
        avgMealCalories: Math.round(trends.avgMealCalories),
        maxMealCalories: trends.maxMealCalories,
        
        avgSleep: Math.round(trends.avgSleepDuration * 10) / 10,
        maxSleep: trends.maxSleepDuration,
        totalSleepTime: Math.round(trends.totalSleepDuration / 60 * 10) / 10,
        
        totalCalories: trends.totalCalories,
        healthScore: this.calculateHealthScore(trends),
        
        caloriesTrend: comparison.caloriesTrend,
        exerciseTrend: comparison.exerciseTrend,
        sleepTrend: comparison.sleepTrend,
        scoreTrend: comparison.scoreTrend,
        
        weekComparison: comparison.weekComparison,
        habits: this.generateHabits(trends),
        dailyData: this.generateDailyData(checkinData, days)
      };
    } catch (error) {
      console.error('[TrendsService.getTrendsData] 错误:', error);
      return this.getDefaultTrendsData();
    }
  }

  /**
   * 聚合打卡数据
   */
  private static aggregateCheckinData(checkinData: any, days: number) {
    const exercises = checkinData.exerciseData || [];
    const meals = checkinData.mealData || [];
    const sleeps = checkinData.sleepData || [];

    // 运动数据聚合
    const exerciseDurations = exercises.map((e: any) => e.duration_min || 0);
    const totalExerciseDuration = exerciseDurations.reduce((a: number, b: number) => Number(a) + Number(b), 0);
    const avgExerciseDuration = exerciseDurations.length > 0 ? totalExerciseDuration / exerciseDurations.length : 0;
    const maxExerciseDuration = exerciseDurations.length > 0 ? Math.max(...exerciseDurations) : 0;

    // 饮食数据聚合
    const mealCalories = meals.map((m: any) => m.calories || 0);
    const totalCalories = mealCalories.reduce((a: number, b: number) => Number(a) + Number(b), 0);
    const avgMealCalories = mealCalories.length > 0 ? totalCalories / mealCalories.length : 0;
    const maxMealCalories = mealCalories.length > 0 ? Math.max(...mealCalories) : 0;

    // 睡眠数据聚合
    const sleepDurations = sleeps.map((s: any) => s.sleep_duration_hours || 0);
    const totalSleepDuration = sleepDurations.reduce((a: number, b: number) => Number(a) + Number(b), 0) * 60; // 转换为分钟
    const avgSleepDuration = sleepDurations.length > 0 ? totalSleepDuration / sleepDurations.length / 60 : 0;
    const maxSleepDuration = sleepDurations.length > 0 ? Math.max(...sleepDurations) : 0;

    return {
      totalExerciseDuration,
      avgExerciseDuration,
      maxExerciseDuration,
      exerciseCount: exercises.length,
      
      totalCalories,
      avgMealCalories,
      maxMealCalories,
      mealCount: meals.length,
      
      totalSleepDuration,
      avgSleepDuration,
      maxSleepDuration,
      sleepCount: sleeps.length,
      
      bmi: checkinData.bmi || 0
    };
  }

  /**
   * 与上一个周期对比
   */
  private static compareWithPreviousPeriod(currentData: any, prevData: any, days: number) {
    const current = this.aggregateCheckinData(currentData, days);
    const prev = this.aggregateCheckinData(prevData || {}, days * 2) || {};

    // 计算趋势百分比
    const caloriesTrend = (prev as any).totalCalories ? 
      Math.round(((current.totalCalories - (prev as any).totalCalories) / (prev as any).totalCalories) * 100) : 0;
    
    const exerciseTrend = (prev as any).exerciseCount ?
      Math.round(((current.exerciseCount - (prev as any).exerciseCount) / (prev as any).exerciseCount) * 100) : 0;
    
    const sleepTrend = (prev as any).sleepCount ?
      Math.round(((current.sleepCount - (prev as any).sleepCount) / (prev as any).sleepCount) * 100) : 0;

    // 健康评分趋势
    const scoreTrend = Math.round((exerciseTrend + sleepTrend) / 2 * 0.7 + (Math.max(0, -caloriesTrend) || 0) * 0.3);

    return {
      caloriesTrend,
      exerciseTrend,
      sleepTrend,
      scoreTrend,
      weekComparison: {
        exerciseFrequency: current.exerciseCount || 0,
        exerciseFrequencyPrev: (prev as any).exerciseCount || 0,
        exerciseFrequencyTrend: exerciseTrend,
        avgSleepCurrent: Math.round(current.avgSleepDuration * 10) / 10,
        avgSleepPrev: (prev as any).avgSleepDuration ? Math.round(((prev as any).avgSleepDuration || 0) * 10) / 10 : 0,
        sleepTrend,
        mealBalance: Math.round(current.avgMealCalories / 2500 * 100),
        mealBalanceTrend: current.mealCount > 0 ? ((prev as any).mealCount ? Math.round(((current.mealCount - (prev as any).mealCount) / (prev as any).mealCount) * 100) : 0) : 0
      }
    };
  }

  /**
   * 计算健康评分
   */
  private static calculateHealthScore(trends: any): number {
    // 基于运动、睡眠、饮食的综合评分
    let score = 50; // 基础分

    // 运动加分（最多 +20）
    const exerciseScore = Math.min(20, (trends.avgExerciseDuration / 60) * 20);
    score += exerciseScore;

    // 睡眠加分（最多 +20）
    if (trends.avgSleepDuration >= 7 && trends.avgSleepDuration <= 9) {
      score += 20;
    } else if (trends.avgSleepDuration >= 6 && trends.avgSleepDuration <= 10) {
      score += 15;
    } else {
      score += 10;
    }

    // 饮食加分（最多 +10）
    if (trends.avgMealCalories >= 1800 && trends.avgMealCalories <= 2500) {
      score += 10;
    } else if (trends.avgMealCalories >= 1500 && trends.avgMealCalories <= 3000) {
      score += 5;
    }

    return Math.round(Math.min(100, score));
  }

  /**
   * 生成每日数据用于图表
   */
  private static generateDailyData(checkinData: any, days: number): Array<{date: string; exercise: number; meal: number; sleep: number}> {
    const result = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // 使用 YYYY-MM-DD 格式进行日期比较，避免时区问题
      const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
      const dateYMD = date.getFullYear() + '-' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(date.getDate()).padStart(2, '0');

      // 查找该日期的数据
      const dayExercises = (checkinData.exerciseData || []).filter((e: any) => {
        const eDate = new Date(e.created_at);
        const eYMD = eDate.getFullYear() + '-' + 
                     String(eDate.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(eDate.getDate()).padStart(2, '0');
        return eYMD === dateYMD;
      });

      const dayMeals = (checkinData.mealData || []).filter((m: any) => {
        const mDate = new Date(m.created_at);
        const mYMD = mDate.getFullYear() + '-' + 
                     String(mDate.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(mDate.getDate()).padStart(2, '0');
        return mYMD === dateYMD;
      });

      const daySleeps = (checkinData.sleepData || []).filter((s: any) => {
        const sDate = new Date(s.created_at);
        const sYMD = sDate.getFullYear() + '-' + 
                     String(sDate.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(sDate.getDate()).padStart(2, '0');
        return sYMD === dateYMD;
      });

      result.push({
        date: dateStr,
        exercise: dayExercises.reduce((sum: number, e: any) => sum + (e.duration_min || 0), 0),
        meal: dayMeals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0),
        sleep: daySleeps.length > 0 ? daySleeps[0].sleep_duration_hours || 0 : 0
      });
    }

    return result;
  }

  /**
   * 生成习惯养成数据
   */
  private static generateHabits(trends: any): Array<{id: number; title: string; description: string; days: number; progress: number; target: number}> {
    // 基于趋势数据生成习惯养成建议
    const habits = [];

    // 运动习惯
    if (trends.exerciseCount > 0) {
      const exerciseProgress = Math.min(100, (trends.exerciseCount / 3) * 100);
      habits.push({
        id: 1,
        title: '坚持运动',
        description: '保持规律运动习惯',
        days: trends.exerciseCount,
        progress: Math.round(exerciseProgress),
        target: 3
      });
    }

    // 睡眠习惯
    if (trends.sleepCount > 0) {
      const sleepProgress = Math.min(100, (trends.sleepCount / 5) * 100);
      habits.push({
        id: 2,
        title: '规律睡眠',
        description: '维持充足的睡眠时间',
        days: trends.sleepCount,
        progress: Math.round(sleepProgress),
        target: 5
      });
    }

    // 饮食习惯
    if (trends.mealCount > 0) {
      const mealProgress = Math.min(100, (trends.mealCount / 4) * 100);
      habits.push({
        id: 3,
        title: '均衡饮食',
        description: '记录和控制日常饮食',
        days: trends.mealCount,
        progress: Math.round(mealProgress),
        target: 4
      });
    }

    // 如果没有任何数据，返回空数组
    return habits;
  }

  /**
   * 返回默认数据
   */
  private static getDefaultTrendsData(): TrendsData {
    return {
      avgExercise: 35,
      maxExercise: 60,
      totalExerciseTime: 5.5,
      
      avgMealCalories: 2000,
      maxMealCalories: 2800,
      
      avgSleep: 7.2,
      maxSleep: 8.5,
      totalSleepTime: 50.4,
      
      totalCalories: 12500,
      healthScore: 78,
      
      caloriesTrend: 0,
      exerciseTrend: 0,
      sleepTrend: 0,
      scoreTrend: 0,
      
      weekComparison: {
        exerciseFrequency: 5,
        exerciseFrequencyTrend: 0,
        avgSleepCurrent: 7.2,
        avgSleepPrev: 6.8,
        sleepTrend: 5,
        mealBalance: 78,
        mealBalanceTrend: 0
      },

      habits: [
        {
          id: 1,
          title: '坚持运动',
          description: '保持规律运动习惯',
          days: 0,
          progress: 0,
          target: 3
        },
        {
          id: 2,
          title: '规律睡眠',
          description: '维持充足的睡眠时间',
          days: 0,
          progress: 0,
          target: 5
        },
        {
          id: 3,
          title: '均衡饮食',
          description: '记录和控制日常饮食',
          days: 0,
          progress: 0,
          target: 4
        }
      ],
      
      dailyData: [
        { date: '-·-', exercise: 0, meal: 0, sleep: 0 },
        { date: '-·-', exercise: 0, meal: 0, sleep: 0 },
        { date: '-·-', exercise: 0, meal: 0, sleep: 0 },
        { date: '-·-', exercise: 0, meal: 0, sleep: 0 },
        { date: '-·-', exercise: 0, meal: 0, sleep: 0 },
        { date: '-·-', exercise: 0, meal: 0, sleep: 0 },
        { date: '-·-', exercise: 0, meal: 0, sleep: 0 }
      ]
    };
  }
}
