/**
 * 健康画像数据访问层 (Data Access Layer)
 * 负责与数据库交互
 */

import pool from '../config/db.js';
import type {
  PortraitRecord,
  RecommendationRecord,
  TimelineRecord,
  HealthProfileSetupRecord,
  RadarData
} from '../types/portrait.js';

/**
 * 用户档案数据接口（来自 user_profile 表）
 */
export interface UserProfileData {
  id: number;
  userId: number;
  gender?: string;
  birthday?: Date;
  age?: number;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  goalType?: string;
  dietaryPreferences?: string;
  allergies?: string;
  workRestHabit?: string;
  activityLevel?: string;
  healthGoals?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PortraitDAL {
  /**
   * 获取用户的健康画像记录
   */
  static async getPortrait(userId: number): Promise<PortraitRecord | null> {
    const query = `
      SELECT 
        id, user_id as userId, exercise_score as exerciseScore,
        meal_score as mealScore, sleep_score as sleepScore,
        overall_score as overallScore, bmi, bmi_status as bmiStatus,
        cardio_level as cardioLevel, cardio_status as cardioStatus,
        metabolism, metabolism_status as metabolismStatus,
        sleep_quality as sleepQuality, sleep_quality_status as sleepQualityStatus,
        radar_data as radarData, created_at as createdAt, updated_at as updatedAt
      FROM health_portrait
      WHERE user_id = ?
    `;

    try {
      const [rows] = await pool.query(query, [userId]);
      const result = (rows as any[])[0];

      if (result && result.radarData) {
        result.radarData = JSON.parse(result.radarData);
      }

      return result || null;
    } catch (error) {
      console.error('[PortraitDAL.getPortrait] 错误:', error);
      throw error;
    }
  }

  /**
   * 创建或更新健康画像
   */
  static async upsertPortrait(
    userId: number,
    data: Partial<PortraitRecord>
  ): Promise<PortraitRecord> {
    const {
      exerciseScore = 0,
      mealScore = 0,
      sleepScore = 0,
      bmi = 0,
      bmiStatus = 'normal',
      cardioLevel = '一般',
      cardioStatus = 'normal',
      metabolism = 0,
      metabolismStatus = 'normal',
      sleepQuality = '一般',
      sleepQualityStatus = 'normal',
      radarData
    } = data;

    const overallScore = Math.round((exerciseScore + mealScore + sleepScore) / 3);
    const radarDataJson = radarData ? JSON.stringify(radarData) : null;

    const query = `
      INSERT INTO health_portrait (
        user_id, exercise_score, meal_score, sleep_score, overall_score,
        bmi, bmi_status, cardio_level, cardio_status,
        metabolism, metabolism_status, sleep_quality, sleep_quality_status,
        radar_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        exercise_score = VALUES(exercise_score),
        meal_score = VALUES(meal_score),
        sleep_score = VALUES(sleep_score),
        overall_score = VALUES(overall_score),
        bmi = VALUES(bmi),
        bmi_status = VALUES(bmi_status),
        cardio_level = VALUES(cardio_level),
        cardio_status = VALUES(cardio_status),
        metabolism = VALUES(metabolism),
        metabolism_status = VALUES(metabolism_status),
        sleep_quality = VALUES(sleep_quality),
        sleep_quality_status = VALUES(sleep_quality_status),
        radar_data = VALUES(radar_data),
        updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await pool.query(query, [
        userId, exerciseScore, mealScore, sleepScore, overallScore,
        bmi, bmiStatus, cardioLevel, cardioStatus,
        metabolism, metabolismStatus, sleepQuality, sleepQualityStatus,
        radarDataJson
      ]);

      const result = await this.getPortrait(userId);
      if (!result) {
        throw new Error('Failed to retrieve upserted portrait');
      }
      return result;
    } catch (error) {
      console.error('[PortraitDAL.upsertPortrait] 错误:', error);
      throw error;
    }
  }

  /**
   * 添加健康建议
   */
  static async addRecommendation(
    userId: number,
    recommendation: Omit<RecommendationRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<number> {
    const query = `
      INSERT INTO health_recommendations (
        user_id, icon, title, description, priority, source_type, source_score, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await pool.query(query, [
        userId,
        recommendation.icon,
        recommendation.title,
        recommendation.description,
        recommendation.priority,
        recommendation.sourceType || null,
        recommendation.sourceScore || null,
        recommendation.isActive !== false
      ]);

      return (result as any).insertId;
    } catch (error) {
      console.error('[PortraitDAL.addRecommendation] 错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户的健康建议列表
   */
  static async getRecommendations(userId: number): Promise<RecommendationRecord[]> {
    const query = `
      SELECT 
        id, user_id as userId, icon, title, description, priority,
        source_type as sourceType, source_score as sourceScore,
        is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM health_recommendations
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY priority DESC, created_at DESC
    `;

    try {
      const [rows] = await pool.query(query, [userId]);
      return (rows as any[]) || [];
    } catch (error) {
      console.error('[PortraitDAL.getRecommendations] 错误:', error);
      throw error;
    }
  }

  /**
   * 清除用户的旧建议
   */
  static async clearRecommendations(userId: number): Promise<void> {
    const query = `
      UPDATE health_recommendations
      SET is_active = FALSE
      WHERE user_id = ? AND is_active = TRUE
    `;

    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('[PortraitDAL.clearRecommendations] 错误:', error);
      throw error;
    }
  }

  /**
   * 添加时间轴事件
   */
  static async addTimelineEvent(
    userId: number,
    event: Omit<TimelineRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<number> {
    const query = `
      INSERT INTO health_timeline (
        user_id, event_date, title, description, status,
        event_type, related_score_type, related_score_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await pool.query(query, [
        userId,
        event.eventDate,
        event.title,
        event.description,
        event.status,
        event.eventType || null,
        event.relatedScoreType || null,
        event.relatedScoreValue || null
      ]);

      return (result as any).insertId;
    } catch (error) {
      console.error('[PortraitDAL.addTimelineEvent] 错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户的时间轴事件列表
   */
  static async getTimeline(userId: number): Promise<TimelineRecord[]> {
    const query = `
      SELECT 
        id, user_id as userId, event_date as eventDate,
        title, description, status, event_type as eventType,
        related_score_type as relatedScoreType,
        related_score_value as relatedScoreValue,
        created_at as createdAt, updated_at as updatedAt
      FROM health_timeline
      WHERE user_id = ?
      ORDER BY event_date DESC
    `;

    try {
      const [rows] = await pool.query(query, [userId]);
      return (rows as any[]) || [];
    } catch (error) {
      console.error('[PortraitDAL.getTimeline] 错误:', error);
      throw error;
    }
  }

  /**
   * 获取健康档案设置状态
   * 从 user_profile 表判断用户是否已填写健康档案
   */
  static async getSetupStatus(userId: number): Promise<HealthProfileSetupRecord | null> {
    const query = `
      SELECT 
        id,
        user_id as userId,
        CASE 
          WHEN height_cm IS NOT NULL 
            AND current_weight_kg IS NOT NULL 
            AND goal_type IS NOT NULL 
            THEN TRUE 
          ELSE FALSE 
        END as isCompleted,
        CASE 
          WHEN height_cm IS NOT NULL 
            AND current_weight_kg IS NOT NULL 
            AND goal_type IS NOT NULL 
            THEN updated_at 
          ELSE NULL 
        END as completedAt,
        CASE 
          WHEN height_cm IS NOT NULL 
            AND current_weight_kg IS NOT NULL 
            THEN TRUE 
          ELSE FALSE 
        END as basicInfoCompleted,
        CASE 
          WHEN height_cm IS NOT NULL 
            AND current_weight_kg IS NOT NULL 
            AND age IS NOT NULL 
            THEN TRUE 
          ELSE FALSE 
        END as healthExamCompleted,
        CASE 
          WHEN goal_type IS NOT NULL 
            AND health_goals IS NOT NULL 
            THEN TRUE 
          ELSE FALSE 
        END as healthGoalsCompleted,
        created_at as createdAt,
        updated_at as updatedAt
      FROM user_profile
      WHERE user_id = ?
    `;

    try {
      const [rows] = await pool.query(query, [userId]);
      console.log('[PortraitDAL.getSetupStatus] 从 user_profile 查询结果:', rows);
      return ((rows as any[])[0]) || null;
    } catch (error) {
      console.error('[PortraitDAL.getSetupStatus] 错误:', error);
      throw error;
    }
  }

  /**
   * 初始化或获取健康档案设置状态
   * 由于 user_profile 表已存在，这个方法只负责获取状态
   */
  static async initializeSetupStatus(userId: number): Promise<HealthProfileSetupRecord> {
    const existing = await this.getSetupStatus(userId);
    if (!existing) {
      throw new Error('用户档案不存在，请先创建用户档案');
    }
    return existing;
  }

  /**
   * 更新健康档案设置状态
   * 注意：此方法已废弃，user_profile 表由其他业务逻辑管理
   * 此方法现在只返回最新的档案状态
   */
  static async updateSetupStatus(
    userId: number,
    status: Partial<HealthProfileSetupRecord>
  ): Promise<HealthProfileSetupRecord> {
    // 这个方法已废弃，不执行更新操作
    console.log('[PortraitDAL.updateSetupStatus] 已废弃，改为查询 user_profile 最新状态');
    
    const result = await this.getSetupStatus(userId);
    if (!result) {
      throw new Error('用户档案不存在');
    }
    return result;
  }

  /**
   * 更新用户健康档案信息
   * 直接更新 user_profile 表中的字段
   */
  static async updateUserProfile(
    userId: number,
    profileData: Partial<UserProfileData>
  ): Promise<UserProfileData> {
    const updates: string[] = [];
    const values: any[] = [];

    // 动态构建 UPDATE 语句
    if (profileData.gender !== undefined) {
      updates.push('gender = ?');
      values.push(profileData.gender || null);
    }
    if (profileData.birthday !== undefined) {
      updates.push('birthday = ?');
      values.push(profileData.birthday || null);
    }
    if (profileData.age !== undefined) {
      updates.push('age = ?');
      values.push(profileData.age || null);
    }
    if (profileData.heightCm !== undefined) {
      updates.push('height_cm = ?');
      values.push(profileData.heightCm || null);
    }
    if (profileData.currentWeightKg !== undefined) {
      updates.push('current_weight_kg = ?');
      values.push(profileData.currentWeightKg || null);
    }
    if (profileData.targetWeightKg !== undefined) {
      updates.push('target_weight_kg = ?');
      values.push(profileData.targetWeightKg || null);
    }
    if (profileData.goalType !== undefined) {
      updates.push('goal_type = ?');
      values.push(profileData.goalType || null);
    }
    if (profileData.dietaryPreferences !== undefined) {
      updates.push('dietary_preferences = ?');
      values.push(profileData.dietaryPreferences || null);
    }
    if (profileData.allergies !== undefined) {
      updates.push('allergies = ?');
      values.push(profileData.allergies || null);
    }
    if (profileData.workRestHabit !== undefined) {
      updates.push('work_rest_habit = ?');
      values.push(profileData.workRestHabit || null);
    }
    if (profileData.activityLevel !== undefined) {
      updates.push('activity_level = ?');
      values.push(profileData.activityLevel || null);
    }
    if (profileData.healthGoals !== undefined) {
      updates.push('health_goals = ?');
      values.push(profileData.healthGoals || null);
    }

    if (updates.length === 0) {
      throw new Error('没有字段需要更新');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    const query = `UPDATE user_profile SET ${updates.join(', ')} WHERE user_id = ?`;
    values.push(userId);

    try {
      console.log('[PortraitDAL.updateUserProfile] 更新用户档案:', userId);
      await pool.query(query, values);

      // 查询更新后的数据
      const result = await this.getUserProfile(userId);
      if (!result) {
        throw new Error('Failed to retrieve updated user profile');
      }
      return result;
    } catch (error) {
      console.error('[PortraitDAL.updateUserProfile] 错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户健康档案完整信息
   */
  static async getUserProfile(userId: number): Promise<UserProfileData | null> {
    const query = `
      SELECT 
        id, user_id as userId, gender, birthday, age,
        height_cm as heightCm, current_weight_kg as currentWeightKg,
        target_weight_kg as targetWeightKg, goal_type as goalType,
        dietary_preferences as dietaryPreferences, allergies,
        work_rest_habit as workRestHabit, activity_level as activityLevel,
        health_goals as healthGoals, created_at as createdAt, updated_at as updatedAt
      FROM user_profile
      WHERE user_id = ?
    `;

    try {
      const [rows] = await pool.query(query, [userId]);
      return ((rows as any[])[0]) || null;
    } catch (error) {
      console.error('[PortraitDAL.getUserProfile] 错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户最近的 checkin 数据（运动、饮食、睡眠）
   * 用于健康画像的刷新和分析
   */
  static async getLatestCheckinData(userId: number, days: number = 7): Promise<any> {
    try {
      console.log('[PortraitDAL.getLatestCheckinData] 获取最近', days, '天的 checkin 数据，用户:', userId);

      // 获取最近 N 天的运动打卡数据
      const exerciseQuery = `
        SELECT 
          id, activity_type, start_time, end_time, duration_min, intensity,
          calories_burned, suggestion, evaluation, created_at
        FROM checkin_exercise_record
        WHERE user_id = ? AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY created_at DESC
      `;

      const mealQuery = `
        SELECT 
          id, meal_type, food_name, calories, protein_g, fat_g, 
          carbohydrate_g, fiber_g, sugar_g, meal_time, created_at
        FROM checkin_meal_record
        WHERE user_id = ? AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY created_at DESC
      `;

      const sleepQuery = `
        SELECT 
          id, sleep_start_time, wake_up_time, sleep_duration_hours, 
          sleep_quality_score, sleep_feeling, suggestion, evaluation, created_at
        FROM checkin_sleep_record
        WHERE user_id = ? AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY created_at DESC
      `;

      // 获取用户档案（包括 BMI 计算所需的身高体重）
      const profileQuery = `
        SELECT current_weight_kg, height_cm
        FROM user_profile
        WHERE user_id = ?
      `;

      const [exerciseData] = await pool.query(exerciseQuery, [userId, days]);
      const [mealData] = await pool.query(mealQuery, [userId, days]);
      const [sleepData] = await pool.query(sleepQuery, [userId, days]);
      const [profileData] = await pool.query(profileQuery, [userId]);

      // 计算 BMI
      let bmi = 0;
      if ((profileData as any[])[0]) {
        const profile = (profileData as any[])[0];
        if (profile.current_weight_kg && profile.height_cm) {
          const heightM = profile.height_cm / 100;
          bmi = profile.current_weight_kg / (heightM * heightM);
          bmi = Math.round(bmi * 100) / 100;
        }
      }

      return {
        exerciseData: (exerciseData as any[]) || [],
        mealData: (mealData as any[]) || [],
        sleepData: (sleepData as any[]) || [],
        bmi
      };
    } catch (error) {
      console.error('[PortraitDAL.getLatestCheckinData] 错误:', error);
      throw error;
    }
  }
}
