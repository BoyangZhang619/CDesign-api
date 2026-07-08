import { QueryResult } from 'mysql2';
import { dbQuery } from '../config/db.js'
import { sendError, sendResult } from '../util/response.js';
import { Request, Response } from 'express';
import { getUserIdFromReq } from './sharedMethods.js';
import { AIChatService } from '../services/aiChatService.js';
import { getSummaryResult as getMealSummaryResult } from './mealCheckinController.js';
import { getSummaryResult as getSleepSummaryResult } from './sleepCheckinController.js';
import { getSummaryResult as getExerciseSummaryResult } from './exerciseCheckinController.js';
import { getCurrentDateTimeString,getCurrentDateString } from '../util/dateTime.js';

// 返回基本信息
function getBasicInfo(req: Request): any[] {
    return [
        { label: '用户ID', value: getUserIdFromReq(req) },
        { label: '当前日期', value: getCurrentDateString() },
        { label: '请求携带的参数', value: req.body }
    ];
}

// 检测当前日期是否存在
async function detectDailyCheckin(req: Request, res: Response, sendResponse: boolean = true): Promise<Boolean | Response> {
    const [userId, today] = getBasicInfo(req).map(info => info.value);
    try {
        const [rows] = await dbQuery('SELECT * FROM daily_checkin WHERE user_id = ? AND checkin_date = ?', [userId, today]);
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

// 获取当前日期的打卡记录
async function getDailyCheckin(req: Request, res: Response): Promise<Response> {
    const [userId, today] = getBasicInfo(req).map(info => info.value);

    try {
        const [rows] = await dbQuery('SELECT * FROM daily_checkin WHERE user_id = ? AND checkin_date = ?', [userId, today]);
        if ((rows as any[]).length > 0) {
            return sendResult(res, { checkinData: rows[0] });
        } else {
            return sendResult(res, { checkinData: null });
        }
    } catch (error) {
        console.error('Error getting daily check-in:', error);
        return sendError(res, 'Error getting daily check-in');
    }
}

// 删除当前日期的打卡记录
async function deleteDailyCheckin(req: Request, res: Response): Promise<Response> {
    const [userId, today] = getBasicInfo(req).values();
    try {
        await dbQuery('DELETE FROM daily_checkin WHERE user_id = ? AND checkin_date = ?', [userId, today]);
        return sendResult(res, { success: true });
    } catch (error) {
        console.error('Error deleting daily check-in:', error);
        return sendError(res, 'Error deleting daily check-in');
    }
}

// 插入当前日期的打卡记录
async function insertDailyCheckin(req: Request, res: Response): Promise<Response> {
    const [userId, today, body] = getBasicInfo(req).map(info => info.value);
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
        await dbQuery('INSERT INTO daily_checkin (user_id, checkin_date, breakfast, lunch, dinner, midnight_snack, water_intake_ml, exercise_duration_min, sleep_start_time, sleep_duration_hours, body_weight_kg, energy_level, note, completion_rate, mood, sleep_quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            userId ?? null,
            today ?? null,
            breakfast ?? null,
            lunch ?? null,
            dinner ?? null,
            midnight_snack ?? null,
            water_intake_ml ?? null,
            exercise_duration_min ?? null,
            sleep_start_time ?? null,
            sleep_duration_hours ?? null,
            body_weight_kg ?? null,
            energy_level ?? null,
            note ?? null,
            completion_rate ?? null,
            mood ?? null,
            sleep_quality ?? null
        ]);
        return sendResult(res, { success: true });
    } catch (error) {
        console.error('Error inserting daily check-in:', error);
        return sendError(res, 'Error inserting daily check-in');
    }
}

// 更新当前日期的打卡记录（如果已经存在则更新，否则插入）
async function updateDailyCheckin(req: Request, res: Response): Promise<Response> {
    const [userId, today, body] = getBasicInfo(req).map(info => info.value);
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
        const [rows] = await dbQuery('SELECT * FROM daily_checkin WHERE user_id = ? AND checkin_date = ?', [userId, today]);
        if ((rows as any[]).length > 0) {
            // 如果记录已存在，则更新
            await dbQuery('UPDATE daily_checkin SET breakfast = ?, lunch = ?, dinner = ?, midnight_snack = ?, water_intake_ml = ?, exercise_duration_min = ?, sleep_start_time = ?, sleep_duration_hours = ?, body_weight_kg = ?, energy_level = ?, note = ?, completion_rate = ?, mood = ?, sleep_quality = ? WHERE user_id = ? AND checkin_date = ?', [
                breakfast ?? null,
                lunch ?? null,
                dinner ?? null,
                midnight_snack ?? null,
                water_intake_ml ?? null,
                exercise_duration_min ?? null,
                sleep_start_time ?? null,
                sleep_duration_hours ?? null,
                body_weight_kg ?? null,
                energy_level ?? null,
                note ?? null,
                completion_rate ?? null,
                mood ?? null,
                sleep_quality ?? null,
                userId,
                today
            ]);
        } else {
            // 如果记录不存在，则插入
            await dbQuery('INSERT INTO daily_checkin (user_id, checkin_date, breakfast, lunch, dinner, midnight_snack, water_intake_ml, exercise_duration_min, sleep_start_time, sleep_duration_hours, body_weight_kg, energy_level, note, completion_rate, mood, sleep_quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                userId ?? null,
                today ?? null,
                breakfast ?? null,
                lunch ?? null,
                dinner ?? null,
                midnight_snack ?? null,
                water_intake_ml ?? null,
                exercise_duration_min ?? null,
                sleep_start_time ?? null,
                sleep_duration_hours ?? null,
                body_weight_kg ?? null,
                energy_level ?? null,
                note ?? null,
                completion_rate ?? null,
                mood ?? null,
                sleep_quality ?? null
            ]);
        }
        return sendResult(res, { success: true });
    } catch (error) {
        console.error('Error updating daily check-in:', error);
        return sendError(res, 'Error updating daily check-in');
    }
}

// 插入空的当前日期的打卡记录（如果已经存在则不操作）
async function insertEmptyDailyCheckin(req: Request, res: Response): Promise<any> {
    console.log('Inserting empty daily check-in, request info:', getBasicInfo(req));
    const [userId, today] = getBasicInfo(req).map(info => info.value);
    const hasCheckedIn = await detectDailyCheckin(req, res, false);
    if (hasCheckedIn) {
        const [rows] = await dbQuery('SELECT * FROM daily_checkin WHERE user_id = ? AND checkin_date = ?', [userId, today]);
        console.log('Found existing daily check-in:', rows);
        return rows[0];
    }
    try {
        await dbQuery('INSERT IGNORE INTO daily_checkin (user_id, checkin_date) VALUES (?, ?)', [userId, today]);
        const [rows] = await dbQuery('SELECT * FROM daily_checkin WHERE user_id = ? AND checkin_date = ?', [userId, today]);
        console.log('Inserted empty daily check-in, retrieved record:', rows);
        return rows[0];
    } catch (error) {
        console.error('Error inserting empty daily check-in:', error);
        return null;
    }
}

// 获取AI分析总结
async function getAISummary(req: Request, res: Response): Promise<Response> {
    const userId = getUserIdFromReq(req);
    try {
        const mealData = await getMealSummaryResult(req, res);
        const sleepData = await getSleepSummaryResult(req, res);
        const exerciseData = await getExerciseSummaryResult(req, res);
        const summaryData = {
            meal: mealData,
            sleep: sleepData,
            exercise: exerciseData
        };
        const [rows] = await dbQuery(
            'SELECT * FROM checkin_ai_summary WHERE daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())',
            [userId]
        );
        calculateAISummary(summaryData, userId);
        // 同步处理AI生成，异步返回
        const result = {
            records: rows as any[],
            checkin_date: getCurrentDateTimeString().split('T')[0],
            message: (rows as any[]).length > 0 ? '获取AI分析总结成功' : '今天还没有AI分析总结'
        };
        return sendResult(res, result);
    } catch (error) {
        return sendError(res, '获取AI分析总结时出错: ' + error);
    }
}

async function calculateAISummary(summaryData: object, userId: number) {
    // 使用 AIChatService 来处理 AI 分析总结
    try {
        const prompt = `[用户的总体状态信息处理与分析]请基于以下当日健康数据（睡眠，运动，饮食）进行AI分析总结：
    ${JSON.stringify(summaryData, null, 2)}
    请提供以下方面的AI分析总结(仅返回总结内容，不需要标题，不要与内容无关的评价)：
    1.这是当天得到的睡眠，运动，饮食数据，请分析并评价这些数据。`;

        // 创建一个临时会话用于单次 AI 调用
        const sessionData = {
            title: `Daily Summary ${getCurrentDateString()}`,
            description: '每日健康数据分析总结',
            ai_model: 'dashscope'
        };

        const session = await AIChatService.createSession(userId, sessionData);
        
        // 发送消息并获取 AI 响应
        const aiResult = await AIChatService.sendMessage(userId, session.id, prompt);

        if (aiResult && aiResult.aiMessage) {
            const dailyCheckinId = (await dbQuery(
                'SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE()',
                [userId]
            ))[0][0]?.id;

            if (dailyCheckinId) {
                const [existingRows] = await dbQuery(
                    'SELECT id FROM checkin_ai_summary WHERE daily_checkin_id = ?',
                    [dailyCheckinId]
                );

                if ((existingRows as any[]).length > 0) {
                    await dbQuery(
                        'UPDATE checkin_ai_summary SET total_ai_summary = ? WHERE daily_checkin_id = ?',
                        [aiResult.aiMessage.content, dailyCheckinId]
                    );
                } else {
                    await dbQuery(
                        'INSERT INTO checkin_ai_summary (daily_checkin_id, total_ai_summary) VALUES (?, ?)',
                        [dailyCheckinId, aiResult.aiMessage.content]
                    );
                }
            }
        } else {
            console.error('AI分析总结失败: 无有效响应');
        }
    } catch (error) {
        console.error('计算AI分析总结失败:', error);
    }
}

export {
    getDailyCheckin,
    detectDailyCheckin,
    deleteDailyCheckin,
    insertDailyCheckin,
    updateDailyCheckin,
    insertEmptyDailyCheckin,
    getAISummary
}