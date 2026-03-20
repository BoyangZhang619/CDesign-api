import pool from '../config/db.js';
import { sendError, sendResult } from '../util/response.js';
import { Request, Response } from 'express';

// 返回基本信息
function getBasicInfo(req: Request): any[] {
    return [
        { label: '用户ID', value: req.user.userId },
        { label: '当前日期', value: new Date().toISOString().split('T')[0] },
        { label: '请求携带的参数', value: req.body }
    ];
}

// 检测当前日期是否存在
async function detectDailyCheckin(req: Request, res: Response, sendResponse: boolean = true): Promise<Boolean | Response> {
    const [userId, today] = getBasicInfo(req).map(info => info.value);

    try {
        const [rows] = await pool.execute('SELECT * FROM daily_checkin WHERE user_id = ? AND checkin_date = ?', [userId, today]);
        if ((rows as any[]).length > 0) {
            return sendResponse ? sendResult(res, { checkedIn: true }) : true;
        } else {
            return sendResponse ? sendResult(res, { checkedIn: false }) : false;
        }
    } catch (error) {
        console.error('Error detecting daily check-in:', error);
        return sendResponse ? sendError(res, 'Error detecting daily check-in') : false;
    }
}

// 删除当前日期的打卡记录
async function deleteDailyCheckin(req: Request, res: Response): Promise<Response> {
    const [userId, today] = getBasicInfo(req).values();
    try {
        await pool.execute('DELETE FROM daily_checkin WHERE user_id = ? AND checkin_date = ?', [userId, today]);
    } catch (error) {
        console.error('Error deleting daily check-in:', error);
        return sendError(res, 'Error deleting daily check-in');
    }
    return sendResult(res, { success: true });
}

// 插入当前日期的打卡记录
async function insertDailyCheckin(req: Request, res: Response): Promise<Response> {
    const [userId, today, body] = getBasicInfo(req).values();
    // total_calories和total_steps由前端提取数据向ai api请求后返回，延迟处理
    const {
        breakfast,
        lunch,
        dinner,
        midnight_snack,
        water_intake_ml,
        exercise_duration_min,
        sleep_start_time,
        sleep_duration_hours,
        body_weight_kg,
        energy_level,
        note,
        completion_rate,
        mood,
        sleep_quality,
    } = body;
    const hasCheckedIn = await detectDailyCheckin(req, res, false);
    if (hasCheckedIn) {
        return sendError(res, 'Already checked in today');
    }
    try {
        await pool.execute('INSERT INTO daily_checkin (user_id, checkin_date, breakfast, lunch, dinner, midnight_snack, water_intake_ml, exercise_duration_min, sleep_start_time, sleep_duration_hours, body_weight_kg, energy_level, note, completion_rate, mood, sleep_quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [userId, today, breakfast, lunch, dinner, midnight_snack, water_intake_ml, exercise_duration_min, sleep_start_time, sleep_duration_hours, body_weight_kg, energy_level, note, completion_rate, mood, sleep_quality]);
    } catch (error) {
        console.error('Error inserting daily check-in:', error);
        return sendError(res, 'Error inserting daily check-in');
    }
    return sendResult(res, { success: true });
}

// 更新当前日期的打卡记录（如果已经存在则更新，否则插入）
async function updateDailyCheckin(req: Request, res: Response): Promise<Response> {
    const [userId, today, body] = getBasicInfo(req).values();
    const {
        breakfast,
        lunch,
        dinner,
        midnight_snack,
        water_intake_ml,
        exercise_duration_min,
        sleep_start_time,
        sleep_duration_hours,
        body_weight_kg,
        energy_level,
        note,
        completion_rate,
        mood,
        sleep_quality,
    } = body;

    try {
        const [rows] = await pool.execute('SELECT * FROM daily_checkin WHERE user_id = ? AND checkin_date = ?', [userId, today]);
        if ((rows as any[]).length > 0) {
            // 如果记录已存在，则更新
            await pool.execute('UPDATE daily_checkin SET breakfast = ?, lunch = ?, dinner = ?, midnight_snack = ?, water_intake_ml = ?, exercise_duration_min = ?, sleep_start_time = ?, sleep_duration_hours = ?, body_weight_kg = ?, energy_level = ?, note = ?, completion_rate = ?, mood = ?, sleep_quality = ? WHERE user_id = ? AND checkin_date = ?', [breakfast, lunch, dinner, midnight_snack, water_intake_ml, exercise_duration_min, sleep_start_time, sleep_duration_hours, body_weight_kg, energy_level, note, completion_rate, mood, sleep_quality, userId, today]);
        } else {
            // 如果记录不存在，则插入
            await insertDailyCheckin(req, res);
        }
    } catch (error) {
        console.error('Error updating daily check-in:', error);
        return sendError(res, 'Error updating daily check-in');
    }
    return sendResult(res, { success: true });
}

export {
    detectDailyCheckin,
    deleteDailyCheckin,
    insertDailyCheckin,
    updateDailyCheckin
}