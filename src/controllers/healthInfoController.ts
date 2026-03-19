import pool from '../config/db.js';
import { sendError, sendResult } from '../util/response.js';
import { Request, Response } from 'express';
import env from '../config/env.js';

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
    // interface HealthInfo {gender: string,birthday: string,height?: number,currentWeight?: number,targetWeight?: number,dietPreferences: string[],dietOther: boolean,dietOtherText: string,healthGoals: string[],goalOther: boolean,goalOtherText: string,allergies: string,sleepHabit: string,activityLevel: string }
    const userId = req.user.userId;
    const { gender, birthday, height, currentWeight, targetWeight, dietPreferences, dietOther, dietOtherText, healthGoals, goalOther, goalOtherText, allergies, sleepHabit, activityLevel } = req.body;

    // 检查必填字段
    if (!gender || !birthday || !dietPreferences || !healthGoals || !allergies || !sleepHabit || !activityLevel) {
        return sendError(res, '请填写所有必填字段', 400);
    }

    try {
        await pool.execute(
            `INSERT INTO user_health_info (user_id, gender, birthday, height, current_weight, target_weight, diet_preferences, diet_other, diet_other_text, health_goals, goal_other, goal_other_text, allergies, sleep_habit, activity_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, gender, birthday, height, currentWeight, targetWeight, JSON.stringify(dietPreferences), dietOther, dietOtherText, JSON.stringify(healthGoals), goalOther, goalOtherText, allergies, sleepHabit, activityLevel]
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
    const { gender, birthday, height, currentWeight, targetWeight, dietPreferences, dietOther, dietOtherText, healthGoals, goalOther, goalOtherText, allergies, sleepHabit, activityLevel } = req.body;

    // 检查必填字段
    if (!gender || !birthday || !dietPreferences || !healthGoals || !allergies || !sleepHabit || !activityLevel) {
        return sendError(res, '请填写所有必填字段', 400);
    }

    try {
        await pool.execute(
            `UPDATE user_health_info SET gender = ?, birthday = ?, height = ?, current_weight = ?, target_weight = ?, diet_preferences = ?, diet_other = ?, diet_other_text = ?, health_goals = ?, goal_other = ?, goal_other_text = ?, allergies = ?, sleep_habit = ?, activity_level = ? WHERE user_id = ?`,
            [gender, birthday, height, currentWeight, targetWeight, JSON.stringify(dietPreferences), dietOther, dietOtherText, JSON.stringify(healthGoals), goalOther, goalOtherText, allergies, sleepHabit, activityLevel, userId]
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
        'SELECT * FROM user_health_info WHERE user_id = ? LIMIT 1',
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