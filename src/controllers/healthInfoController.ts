import pool from '../config/db.js';
import { sendError, sendResult } from '../util/response.js';
import { Request, Response } from 'express';

// 检测是否需要输入健康信息
async function CheckHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    const [rows] = await pool.execute(
        'SELECT * FROM user_profile WHERE user_id = ? LIMIT 1',
        [userId]
    );

    if ((rows as any[]).length === 0) {
        return sendResult(res, {
            message: '用户未填写健康信息',
            needHealthInfo: true
        });
    }

    return sendResult(res, {
        message: '用户已填写健康信息',
        needHealthInfo: false
    });
}

// 插入健康信息

async function InsertHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    const { gender, birthday, height, currentWeight, targetWeight, dietPreferences, dietOtherText, healthGoals, goalOtherText, allergies, sleepHabit, activityLevel } = req.body;

    // 检查必填字段
    if (!gender || !birthday || !dietPreferences || !healthGoals || !allergies || !sleepHabit || !activityLevel) {
        return sendError(res, '请填写所有必填字段', 400);
    }

    try {
        await pool.execute(
            `INSERT INTO user_profile (user_id, gender, birthday, height_cm, current_weight_kg, target_weight_kg, dietary_preferences, diet_other_text, health_goals, goal_other_text, allergies, sleep_habit, activity_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, gender, birthday, height, currentWeight, targetWeight, JSON.stringify(dietPreferences), dietOtherText, JSON.stringify(healthGoals), goalOtherText, allergies, sleepHabit, activityLevel]
        );

        return sendResult(res, '健康信息插入成功');
    } catch (error) {
        console.error('插入健康信息时出错:', error);
        return sendError(res, '插入健康信息失败', 500);
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
        await pool.execute(
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
    const [rows] = await pool.execute(
        'SELECT * FROM user_profile WHERE user_id = ? LIMIT 1',
        [userId]
    );

    if ((rows as any[]).length === 0) {
        return sendResult(res, {
            message: '用户未填写健康信息',
            healthInfo: null
        });
    }

    return sendResult(res, {
        message: '用户已填写健康信息',
        healthInfo: rows[0]
    });
}

export {
    CheckHealthInfo,
    InsertHealthInfo,
    UpdateHealthInfo,
    GetHealthInfo
}