import pool from '../config/db.js';
import { sendError, sendResult } from '../util/response.js';
import { Request, Response } from 'express';

// 检测是否需要输入健康信息
async function CheckHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    const [rows] = await pool.query(
        'SELECT id, created_at, updated_at FROM user_profile WHERE user_id = ? LIMIT 1',
        [userId]
    );

    if ((rows as any[]).length === 0) {
        return sendResult(res, {
            message: '用户未填写健康信息',
            needHealthInfo: true,
            setup_date: null
        });
    }

    const healthProfile = (rows as any[])[0];
    return sendResult(res, {
        message: '用户已填写健康信息',
        needHealthInfo: false,
        setup_date: healthProfile.updated_at || healthProfile.created_at,
        is_completed: 1
    });
}

// 插入健康信息
async function InsertHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    const { gender, birthday, height, currentWeight, targetWeight, dietPreferences, dietOtherText, healthGoals, goalOtherText, allergies, sleepHabit, activityLevel } = req.body;

    // 检查必填字段 - 只检查关键字段
    if (!gender || !birthday || !sleepHabit || !activityLevel) {
        return sendError(res, '请完整填写所有字段', 400);
    }

    try {
        // 构建 dietary_preferences 字符串
        let dietaryPrefsStr = '';
        if (Array.isArray(dietPreferences) && dietPreferences.length > 0) {
            dietaryPrefsStr = dietPreferences.join(',');
        }

        // 构建 health_goals 字符串
        let healthGoalsStr = '';
        if (Array.isArray(healthGoals) && healthGoals.length > 0) {
            healthGoalsStr = healthGoals.join(',');
        }

        // 检查是否已存在健康档案
        const [existingRows] = await pool.query(
            'SELECT id FROM user_profile WHERE user_id = ? LIMIT 1',
            [userId]
        );

        if ((existingRows as any[]).length > 0) {
            // 更新现有记录
            await pool.query(
                `UPDATE user_profile SET 
                    gender = ?, 
                    birthday = ?, 
                    height_cm = ?, 
                    current_weight_kg = ?, 
                    target_weight_kg = ?, 
                    dietary_preferences = ?, 
                    diet_other_text = ?, 
                    health_goals = ?, 
                    goal_other_text = ?, 
                    allergies = ?, 
                    sleep_habit = ?, 
                    activity_level = ?,
                    updated_at = NOW()
                WHERE user_id = ?`,
                [gender, birthday, height || null, currentWeight || null, targetWeight || null, dietaryPrefsStr, dietOtherText || null, healthGoalsStr, goalOtherText || null, allergies || null, sleepHabit, activityLevel, userId]
            );
        } else {
            // 插入新记录
            await pool.query(
                `INSERT INTO user_profile (
                    user_id, gender, birthday, height_cm, current_weight_kg, target_weight_kg, 
                    dietary_preferences, diet_other_text, health_goals, goal_other_text, 
                    allergies, sleep_habit, activity_level, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [userId, gender, birthday, height || null, currentWeight || null, targetWeight || null, dietaryPrefsStr, dietOtherText || null, healthGoalsStr, goalOtherText || null, allergies || null, sleepHabit, activityLevel]
            );
        }

        return sendResult(res, '健康信息保存成功');
    } catch (error) {
        console.error('保存健康信息时出错:', error);
        return sendError(res, '保存健康信息失败', 500);
    }
}

// 更新健康信息
async function UpdateHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    const { gender, birthday, height, currentWeight, targetWeight, dietPreferences, dietOtherText, healthGoals, goalOtherText, allergies, sleepHabit, activityLevel } = req.body;

    // 检查必填字段
    if (!gender || !birthday || !dietPreferences || !healthGoals || !allergies || !sleepHabit || !activityLevel) {
        return sendError(res, '请填写所有必填字段', 400);
    }

    try {
        await pool.query(
            `UPDATE user_profile SET gender = ?, birthday = ?, height_cm = ?, current_weight_kg = ?, target_weight_kg = ?, diet_preferences = ?, diet_other_text = ?, health_goals = ?, goal_other_text = ?, allergies = ?, sleep_habit = ?, activity_level = ? WHERE user_id = ?`,
            [gender, birthday, height, currentWeight, targetWeight, JSON.stringify(dietPreferences), dietOtherText, JSON.stringify(healthGoals), goalOtherText, allergies, sleepHabit, activityLevel, userId]
        );

        return sendResult(res, '健康信息更新成功');
    } catch (error) {
        console.error('更新健康信息时出错:', error);
        return sendError(res, '更新健康信息失败', 500);
    }
}

// 获取健康信息
async function GetHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    const [rows] = await pool.query(
        'SELECT * FROM user_profile WHERE user_id = ? LIMIT 1',
        [userId]
    );

    if ((rows as any[]).length === 0) {
        return sendResult(res, {
            message: '用户未填写健康信息',
            healthInfo: null
        });
    }

    const healthInfo = (rows as any[])[0];
    
    // 将逗号分隔的字符串转换回数组
    if (healthInfo.dietary_preferences && typeof healthInfo.dietary_preferences === 'string') {
        healthInfo.dietary_preferences = healthInfo.dietary_preferences.split(',').filter((v: string) => v.trim());
    }
    if (healthInfo.health_goals && typeof healthInfo.health_goals === 'string') {
        healthInfo.health_goals = healthInfo.health_goals.split(',').filter((v: string) => v.trim());
    }

    return sendResult(res, {
        message: '用户已填写健康信息',
        healthInfo: healthInfo,
        is_completed: 1
    });
}

export {
    CheckHealthInfo,
    InsertHealthInfo,
    UpdateHealthInfo,
    GetHealthInfo
}