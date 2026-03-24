import pool from "../config/db.js";
import { sendError, sendResult } from "../util/response.js";
import { Request, Response } from "express";
import { insertEmptyDailyCheckin } from "./dailyCheckinController.js";
import { QueryResult } from "mysql2";
import { commonChat } from "./aiController.js";
import { getUserIdFromReq } from "./sharedMethods.js";
import { getCurrentTimeString } from '../util/dateTime.js';

// 验证运动时间合理性
function validateExerciseTime(startTime: string, endTime: string): { valid: boolean; message: string } {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
        return { valid: false, message: '结束时间必须晚于开始时间' };
    }

    const durationMs = end.getTime() - start.getTime();
    const durationMin = durationMs / (1000 * 60);

    if (durationMin < 1) {
        return { valid: false, message: '运动时长至少需要1分钟' };
    }

    if (durationMin > 1440) {
        return { valid: false, message: '运动时长不能超过24小时' };
    }

    return { valid: true, message: '时间合理' };
}

// 计算运动时长（分钟）
function calculateExerciseDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    const durationMin = Math.round(durationMs / (1000 * 60));
    return durationMin;
}

// 运动类型和强度的有效值
const validActivityTypes = ['跑步', '步行', '力量训练', '球类', '游泳', '骑车', '瑜伽', '其他'];
const validIntensities = ['low', 'medium', 'high'];

// 插入新的运动打卡记录
async function insertExerciseRecord(req: Request, res: Response): Promise<Response> {
    try {
        const todayCheckin = await insertEmptyDailyCheckin(req, res);
        if (todayCheckin == null) {
            return sendError(res, '无法插入运动记录，因为无法获取或创建当天的打卡数据');
        }

        const body = req.body;
        const {
            activity_type,
            start_time,
            end_time,
            intensity,
            note,
            ai_recognition_flag = false
        } = body;

        // 验证必填字段
        if (!activity_type || !start_time || !end_time) {
            return sendError(res, '运动类型、开始时间和结束时间为必填项');
        }

        // 验证运动类型
        if (!validActivityTypes.includes(activity_type)) {
            return sendError(res, `运动类型必须是以下之一: ${validActivityTypes.join(', ')}`);
        }

        // 验证强度
        if (intensity && !validIntensities.includes(intensity)) {
            return sendError(res, `强度必须是以下之一: ${validIntensities.join(', ')}`);
        }

        // 验证时间合理性
        const validation = validateExerciseTime(start_time, end_time);
        if (!validation.valid) {
            return sendError(res, validation.message);
        }

        const userId = getUserIdFromReq(req);
        const dailyCheckinId = (todayCheckin as any)?.id;

        // 计算运动时长
        const durationMin = calculateExerciseDuration(start_time, end_time);

        // 先插入记录到数据库，AI生成字段先为空
        const [result] = await pool.execute(
            'INSERT INTO checkin_exercise_record (user_id, daily_checkin_id, activity_type, start_time, end_time, duration_min, intensity, note, ai_recognition_flag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                userId ?? null,
                dailyCheckinId ?? null,
                activity_type ?? null,
                start_time,
                end_time,
                durationMin,
                intensity ?? null,
                note ?? null,
                ai_recognition_flag ? 1 : 0
            ]
        );

        const exerciseRecordId = (result as any).insertId;

        // 立即返回给前端
        const response = {
            exerciseRecordId,
            duration_min: durationMin,
            message: '运动记录已保存',
            status: 'pending_ai_analysis'
        };
        sendResult(res, response);

        // 后台异步调用AI生成热量、建议和评价
        generateExerciseAnalysisAsync(userId, exerciseRecordId, activity_type, durationMin, intensity, note);

        return res;
    } catch (error) {
        return sendError(res, '插入运动记录时出错: ' + error);
    }
}

// 异步生成运动分析数据（AI调用）
async function generateExerciseAnalysisAsync(
    userId: number,
    exerciseRecordId: number,
    activityType: string,
    durationMin: number,
    intensity: string | null,
    note: string | null
) {
    try {
        // 构建AI请求内容
        const prompt = `请根据以下运动信息计算消耗热量并给出建议：
运动类型: ${activityType}
运动时长: ${durationMin}分钟
运动强度: ${intensity ?? '未记录'}
备注: ${note ?? '未记录'}

请返回以下格式的数据（用|分隔,如果输入的结果都为零，则强制使热量值为1）：
格式: 消耗热量(kcal)|建议(简要文本，最多50字)|评价(简要文本，最多100字)
示例: 250|保持规律运动习惯，建议逐步增加运动强度|运动时长充足，强度适中，效果显著`;

        // 调用AI服务
        const aiResult = await commonChat({
            user_content: prompt,
            model: 'qwen3.5-flash',
            response_type: 'text'
        });

        if (!aiResult.ok) {
            console.error(`AI调用失败 (exerciseRecordId: ${exerciseRecordId}):`, aiResult.content);
            return;
        }

        // 解析AI返回的数据
        const analysisData = parseExerciseAnalysis(aiResult.content);

        // 更新数据库中的AI生成字段
        if (analysisData) {
            await pool.execute(
                'UPDATE checkin_exercise_record SET calories_burned = ?, suggestion = ?, evaluation = ? WHERE id = ? AND user_id = ?',
                [
                    analysisData.caloriesBurned,
                    analysisData.suggestion,
                    analysisData.evaluation,
                    exerciseRecordId,
                    userId
                ]
            );
            console.log(`已更新exercise记录 ${exerciseRecordId} 的AI分析数据:`, analysisData);
        } else {
            console.warn(`无法解析运动分析数据 (exerciseRecordId: ${exerciseRecordId}), AI返回:`, aiResult.content);
        }
    } catch (error) {
        console.error(`生成运动分析失败 (exerciseRecordId: ${exerciseRecordId}):`, error);
    }
}

// 解析AI返回的运动分析数据
function parseExerciseAnalysis(aiResponse: string): any {
    try {
        // 期望格式: "消耗热量|建议|评价"
        const parts = aiResponse.split('|');

        if (parts.length < 3) {
            console.warn('AI响应格式不完整:', aiResponse);
            return null;
        }

        const caloriesStr = parts[0].trim();
        const suggestion = parts[1].trim();
        const evaluation = parts.slice(2).join('|').trim();

        // 解析消耗热量
        const caloriesMatch = caloriesStr.match(/\d+(?:\.\d+)?/);
        if (!caloriesMatch) {
            console.warn('无法从AI响应中提取热量:', caloriesStr);
            return null;
        }

        const caloriesBurned = parseFloat(caloriesMatch[0]);

        return {
            caloriesBurned,
            suggestion: suggestion.substring(0, 255),
            evaluation: evaluation
        };
    } catch (error) {
        console.error('解析运动分析数据失败:', error);
        return null;
    }
}

// 获取当前日期的所有运动记录
async function getExerciseRecords(req: Request, res: Response): Promise<Response> {
    const todayCheckin = await insertEmptyDailyCheckin(req, res);
    if (todayCheckin === null) {
        return sendError(res, '无法获取运动记录，因为无法获取或创建当天的打卡数据');
    }

    try {
        const userId = getUserIdFromReq(req);
        const [rows] = await pool.execute(
            'SELECT * FROM checkin_exercise_record WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE()) ORDER BY start_time DESC',
            [userId, userId]
        );

        const result = {
            records: rows as any[],
            checkin_date: getCurrentTimeString().split('T')[0],
            message: (rows as any[]).length > 0 ? '获取运动记录成功' : '今天还没有运动记录'
        };
        return sendResult(res, result);
    } catch (error) {
        return sendError(res, '获取运动记录时出错: ' + error);
    }
}

// 更新运动记录
async function updateExerciseRecord(req: Request, res: Response): Promise<Response> {
    try {
        const exerciseRecordId = Array.isArray(req.params.exerciseRecordId)
            ? req.params.exerciseRecordId[0]
            : req.params.exerciseRecordId;
        const body = req.body;
        const {
            activity_type,
            start_time,
            end_time,
            intensity,
            note
        } = body;

        const userId = getUserIdFromReq(req);

        // 如果修改了运动时间，需要重新计算时长并触发AI重新分析
        if (start_time || end_time) {
            // 获取原记录
            const [originalRecords] = await pool.execute(
                'SELECT start_time, end_time, activity_type, intensity, note FROM checkin_exercise_record WHERE id = ? AND user_id = ?',
                [exerciseRecordId, userId]
            );

            if ((originalRecords as any[]).length === 0) {
                return sendError(res, '运动记录不存在');
            }

            const original = (originalRecords as any[])[0];
            const newStartTime = start_time || original.start_time;
            const newEndTime = end_time || original.end_time;
            const newActivityType = activity_type || original.activity_type;
            const newIntensity = intensity ?? original.intensity;
            const newNote = note ?? original.note;

            // 验证新时间
            const validation = validateExerciseTime(newStartTime, newEndTime);
            if (!validation.valid) {
                return sendError(res, validation.message);
            }

            const newDurationMin = calculateExerciseDuration(newStartTime, newEndTime);

            // 更新记录，并清空AI生成的字段以便重新计算
            await pool.execute(
                'UPDATE checkin_exercise_record SET activity_type = ?, start_time = ?, end_time = ?, duration_min = ?, intensity = ?, note = ?, calories_burned = NULL, suggestion = NULL, evaluation = NULL WHERE id = ? AND user_id = ?',
                [
                    newActivityType,
                    newStartTime,
                    newEndTime,
                    newDurationMin,
                    newIntensity,
                    newNote,
                    exerciseRecordId,
                    userId
                ]
            );

            // 异步重新生成AI分析
            generateExerciseAnalysisAsync(userId, parseInt(exerciseRecordId), newActivityType, newDurationMin, newIntensity, newNote);
        } else {
            // 只更新其他字段
            await pool.execute(
                'UPDATE checkin_exercise_record SET activity_type = ?, intensity = ?, note = ? WHERE id = ? AND user_id = ?',
                [
                    activity_type ?? null,
                    intensity ?? null,
                    note ?? null,
                    exerciseRecordId,
                    userId
                ]
            );
        }

        return sendResult(res, {
            exerciseRecordId,
            message: '运动记录已更新'
        });
    } catch (error) {
        return sendError(res, '更新运动记录时出错: ' + error);
    }
}

// 删除运动记录
async function deleteExerciseRecord(req: Request, res: Response): Promise<Response> {
    try {
        const exerciseRecordId = Array.isArray(req.params.exerciseRecordId)
            ? req.params.exerciseRecordId[0]
            : req.params.exerciseRecordId;
        const userId = getUserIdFromReq(req);

        const result = await pool.execute(
            'DELETE FROM checkin_exercise_record WHERE id = ? AND user_id = ?',
            [exerciseRecordId, userId]
        );

        if ((result as any)[0].affectedRows === 0) {
            return sendError(res, '运动记录不存在或无权删除');
        }

        return sendResult(res, {
            message: '运动记录已删除'
        });
    } catch (error) {
        return sendError(res, '删除运动记录时出错: ' + error);
    }
}

// 获取运动统计（近7天或30天）
async function getExerciseStatistics(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);
        const { days = 7 } = req.query;

        const [rows] = await pool.execute(
            `SELECT 
                COUNT(*) as record_count,
                SUM(duration_min) as total_duration_min,
                AVG(duration_min) as avg_duration_min,
                SUM(calories_burned) as total_calories_burned,
                AVG(calories_burned) as avg_calories_burned,
                COUNT(DISTINCT activity_type) as activity_type_count
            FROM checkin_exercise_record 
            WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [userId, days]
        );

        const statistics = (rows as any[])[0];

        return sendResult(res, {
            days,
            statistics: {
                record_count: statistics.record_count || 0,
                total_duration_min: statistics.total_duration_min || 0,
                avg_duration_min: statistics.avg_duration_min ? parseInt(statistics.avg_duration_min) : 0,
                total_calories_burned: statistics.total_calories_burned ? parseFloat(statistics.total_calories_burned).toFixed(2) : 0,
                avg_calories_burned: statistics.avg_calories_burned ? parseFloat(statistics.avg_calories_burned).toFixed(2) : 0,
                activity_type_count: statistics.activity_type_count || 0
            }
        });
    } catch (error) {
        return sendError(res, '获取运动统计时出错: ' + error);
    }
}

// 按活动类型获取统计
async function getExerciseStatisticsByType(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);
        const { days = 7 } = req.query;

        const [rows] = await pool.execute(
            `SELECT 
                activity_type,
                COUNT(*) as count,
                SUM(duration_min) as total_duration_min,
                AVG(duration_min) as avg_duration_min,
                SUM(calories_burned) as total_calories_burned
            FROM checkin_exercise_record 
            WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY activity_type
            ORDER BY total_duration_min DESC`,
            [userId, days]
        );

        return sendResult(res, {
            days,
            statistics: (rows as any[]).map(stat => ({
                activity_type: stat.activity_type,
                count: stat.count,
                total_duration_min: stat.total_duration_min || 0,
                avg_duration_min: stat.avg_duration_min ? parseInt(stat.avg_duration_min) : 0,
                total_calories_burned: stat.total_calories_burned ? parseFloat(stat.total_calories_burned).toFixed(2) : 0
            }))
        });
    } catch (error) {
        return sendError(res, '获取运动类型统计时出错: ' + error);
    }
}

async function getSummaryResult(req: Request, res: Response): Promise<object> {
    try {
        const userId = getUserIdFromReq(req);
        const [rows] = await pool.execute(
            'SELECT * FROM checkin_exercise_record WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())',
            [userId, userId]
        );
        
        const result = {
            records: rows as any[],
            exercise_duration_time: (rows as any[]).reduce((sum, record) => sum + (record.duration_min || 0), 0),
            exercise_calories_burned: (rows as any[]).reduce((sum, record) => sum + (record.calories_burned || 0), 0),
            checkin_date: getCurrentTimeString().split('T')[0],
            message: (rows as any[]).length > 0 ? '获取打卡记录成功' : '今天还没有打卡记录'
        };
        return result;
    } catch (error) {
        throw new Error('获取打卡记录时出错: ' + error);
    }
}

async function getSummary(req: Request, res: Response): Promise<Response> {
    try {
        const request = await getSummaryResult(req, res);
        calculateAISummary(request, getUserIdFromReq(req));
        return sendResult(res, request);
    } catch (error) {
        return sendError(res, '获取打卡记录时出错: ' + error);
    }
}

async function getAISummary(req: Request, res: Response): Promise<Response> {
    const userId = getUserIdFromReq(req);
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM checkin_ai_summary WHERE daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())',
            [userId]
        );
        const result = {
            records: rows as any[],
            checkin_date: getCurrentTimeString().split('T')[0],
            message: (rows as any[]).length > 0 ? '获取AI分析总结成功' : '今天还没有AI分析总结'
        };
        return sendResult(res, result);
    } catch (error) {
        return sendError(res, '获取AI分析总结时出错: ' + error);
    }
}

async function calculateAISummary(summaryData: object,userId: number) {
    // 在这里实现AI分析总结的计算逻辑
    try {
        const prompt = `请基于以下运动数据进行AI分析总结：

    请提供以下方面的AI分析总结(仅返回总结内容，不需要标题)：
    1.这是当天得到的运动数据，请分析并评价这些数据。`;

        const aiResult = await commonChat({
            user_content: prompt,
            model: 'qwen3.5-flash',
            response_type: 'text'
        });

        if (aiResult.ok) {
            const dailyCheckinId = (await pool.execute(
                'SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE()',
                [userId]
            ))[0][0]?.id;

            if (dailyCheckinId) {
                const [existingRows] = await pool.execute(
                    'SELECT id FROM checkin_ai_summary WHERE daily_checkin_id = ?',
                    [dailyCheckinId]
                );

                if ((existingRows as any[]).length > 0) {
                    await pool.execute(
                        'UPDATE checkin_ai_summary SET exercise_ai_summary = ? WHERE daily_checkin_id = ?',
                        [aiResult.content, dailyCheckinId]
                    );
                } else {
                    await pool.execute(
                        'INSERT INTO checkin_ai_summary (daily_checkin_id, exercise_ai_summary) VALUES (?, ?)',
                        [dailyCheckinId, aiResult.content]
                    );
                }
            }
        } else {
            console.error('AI分析总结失败:', aiResult.content);
        }
    } catch (error) {
        console.error('计算AI分析总结失败:', error);
    }
}

export {
    insertExerciseRecord,
    getExerciseRecords,
    updateExerciseRecord,
    deleteExerciseRecord,
    getExerciseStatistics,
    getExerciseStatisticsByType,
    getSummary,
    getAISummary,
    getSummaryResult
}