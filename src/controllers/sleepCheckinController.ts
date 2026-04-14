import pool from "../config/db.js";
import { sendError, sendResult } from "../util/response.js";
import { Request, Response } from "express";
import { insertEmptyDailyCheckin } from "./dailyCheckinController.js";
import { QueryResult } from "mysql2";
import { commonChat } from "./aiController.js";
import { getUserIdFromReq } from "./sharedMethods.js";
import { getCurrentDateTimeString } from '../util/dateTime.js';

// 计算睡眠时长（小时）
function calculateSleepDuration(sleepStartTime: string, wakeUpTime: string): number {
    const startTime = new Date(sleepStartTime).getTime();
    const endTime = new Date(wakeUpTime).getTime();
    const durationMs = endTime - startTime;
    const durationHours = durationMs / (1000 * 60 * 60);
    return Math.round(durationHours * 100) / 100; // 保留两位小数
}

// 验证睡眠时间合理性
function validateSleepTime(sleepStartTime: string, wakeUpTime: string): { valid: boolean; message: string } {
    const startTime = new Date(sleepStartTime);
    const endTime = new Date(wakeUpTime);

    if (startTime >= endTime) {
        return { valid: false, message: '起床时间必须晚于入睡时间' };
    }

    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > 24) {
        return { valid: false, message: '睡眠时长不能超过24小时' };
    }

    if (durationHours < 0.25) {
        return { valid: false, message: '睡眠时长至少需要15分钟' };
    }

    return { valid: true, message: '时间合理' };
}

// 插入新的睡眠打卡记录
async function insertSleepRecord(req: Request, res: Response): Promise<Response> {
    try {
        const todayCheckin = await insertEmptyDailyCheckin(req, res);
        if (todayCheckin == null) {
            return sendError(res, '无法插入睡眠记录，因为无法获取或创建当天的打卡数据');
        }

        const body = req.body;
        const {
            sleep_start_time,
            wake_up_time,
            is_nap = 0,
            wake_up_times,
            sleep_feeling
        } = body;

        // 验证必填字段
        if (!sleep_start_time || !wake_up_time) {
            return sendError(res, '入睡时间和起床时间为必填项');
        }

        // 验证时间合理性
        const validation = validateSleepTime(sleep_start_time, wake_up_time);
        if (!validation.valid) {
            return sendError(res, validation.message);
        }

        const userId = getUserIdFromReq(req);
        const dailyCheckinId = (todayCheckin as any)?.id;

        // 计算睡眠时长
        const sleepDurationHours = calculateSleepDuration(sleep_start_time, wake_up_time);

        // 先插入记录到数据库，AI生成字段先为空
        const [result] = await pool.query(
            'INSERT INTO checkin_sleep_record (user_id, daily_checkin_id, sleep_start_time, wake_up_time, sleep_duration_hours, is_nap, wake_up_times, sleep_feeling) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                userId ?? null,
                dailyCheckinId ?? null,
                sleep_start_time,
                wake_up_time,
                sleepDurationHours,
                is_nap,
                wake_up_times ?? null,
                sleep_feeling ?? null
            ]
        );

        const sleepRecordId = (result as any).insertId;

        // 立即返回给前端
        const response = {
            sleepRecordId,
            sleep_duration_hours: sleepDurationHours,
            message: '睡眠记录已保存',
            status: 'pending_ai_analysis'
        };
        sendResult(res, response);

        // 后台异步调用AI生成评分、建议和评价
        generateSleepAnalysisAsync(userId, sleepRecordId, sleepDurationHours, is_nap, wake_up_times, sleep_feeling);

        return res;
    } catch (error) {
        return sendError(res, '插入睡眠记录时出错: ' + error);
    }
}

// 异步生成睡眠分析数据（AI调用）
async function generateSleepAnalysisAsync(
    userId: number,
    sleepRecordId: number,
    sleepDurationHours: number,
    isNap: number,
    wakeUpTimes: number | null,
    sleepFeeling: string | null
) {
    try {
        // 构建AI请求内容
        const prompt = `请根据以下睡眠信息生成睡眠分析：
睡眠时长: ${sleepDurationHours}小时
睡眠类型: ${isNap === 1 ? '午睡' : '夜间睡眠'}
睡眠中苏醒次数: ${wakeUpTimes ?? '未记录'}次
个人感觉: ${sleepFeeling ?? '未记录'}

请返回以下格式的数据（用|分隔）：
格式: 睡眠质量评分(0-100)|建议(简要文本，最多50字)|评价(简要文本，最多100字)
示例: 75|建议保持规律的睡眠时间，避免过晚入睡|睡眠时长充足，质量良好，继续保持现有的睡眠习惯`;

        // 调用AI服务
        const aiResult = await commonChat({
            user_content: prompt,
            model: 'qwen3.5-flash',
            response_type: 'text'
        });

        if (!aiResult.ok) {
            console.error(`AI调用失败 (sleepRecordId: ${sleepRecordId}):`, aiResult.content);
            return;
        }

        // 解析AI返回的数据
        const analysisData = parseSleepAnalysis(aiResult.content);

        // 更新数据库中的AI生成字段
        if (analysisData) {
            await pool.query(
                'UPDATE checkin_sleep_record SET sleep_quality_score = ?, suggestion = ?, evaluation = ? WHERE id = ? AND user_id = ?',
                [
                    analysisData.sleepQualityScore,
                    analysisData.suggestion,
                    analysisData.evaluation,
                    sleepRecordId,
                    userId
                ]
            );
            console.log(`已更新sleep记录 ${sleepRecordId} 的AI分析数据:`, analysisData);
        } else {
            console.warn(`无法解析睡眠分析数据 (sleepRecordId: ${sleepRecordId}), AI返回:`, aiResult.content);
        }
    } catch (error) {
        console.error(`生成睡眠分析失败 (sleepRecordId: ${sleepRecordId}):`, error);
    }
}

// 解析AI返回的睡眠分析数据
function parseSleepAnalysis(aiResponse: string): any {
    try {
        // 期望格式: "质量评分|建议|评价"
        // 使用 | 分隔符，但需要处理建议和评价中可能包含 | 的情况
        const parts = aiResponse.split('|');

        if (parts.length < 3) {
            console.warn('AI响应格式不完整:', aiResponse);
            return null;
        }

        const scoreStr = parts[0].trim();
        const suggestion = parts[1].trim();
        const evaluation = parts.slice(2).join('|').trim(); // 评价可能包含 |

        // 解析睡眠质量评分
        const scoreMatch = scoreStr.match(/\d+/);
        if (!scoreMatch) {
            console.warn('无法从AI响应中提取评分:', scoreStr);
            return null;
        }

        const sleepQualityScore = Math.min(100, Math.max(0, parseInt(scoreMatch[0])));

        return {
            sleepQualityScore,
            suggestion: suggestion.substring(0, 255), // 数据库字段长度限制
            evaluation: evaluation
        };
    } catch (error) {
        console.error('解析睡眠分析数据失败:', error);
        return null;
    }
}

// 获取当前日期的所有睡眠记录
async function getSleepRecords(req: Request, res: Response): Promise<Response> {
    const todayCheckin = await insertEmptyDailyCheckin(req, res);
    if (todayCheckin === null) {
        return sendError(res, '无法获取睡眠记录，因为无法获取或创建当天的打卡数据');
    }

    try {
        const userId = getUserIdFromReq(req);
        const [rows] = await pool.query(
            'SELECT * FROM checkin_sleep_record WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE()) ORDER BY sleep_start_time DESC',
            [userId, userId]
        );

        const result = {
            records: rows as any[],
            checkin_date: getCurrentDateTimeString().split('T')[0],
            message: (rows as any[]).length > 0 ? '获取睡眠记录成功' : '今天还没有睡眠记录'
        };
        return sendResult(res, result);
    } catch (error) {
        return sendError(res, '获取睡眠记录时出错: ' + error);
    }
}

// 更新睡眠记录
async function updateSleepRecord(req: Request, res: Response): Promise<Response> {
    try {
        const sleepRecordId = Array.isArray(req.params.sleepRecordId) 
            ? req.params.sleepRecordId[0] 
            : req.params.sleepRecordId;
        const body = req.body;
        const {
            sleep_start_time,
            wake_up_time,
            is_nap,
            wake_up_times,
            sleep_feeling
        } = body;

        const userId = getUserIdFromReq(req);

        // 如果修改了睡眠时间，需要重新计算睡眠时长并触发AI重新分析
        if (sleep_start_time || wake_up_time) {
            // 获取原记录
            const [originalRecords] = await pool.query(
                'SELECT sleep_start_time, wake_up_time FROM checkin_sleep_record WHERE id = ? AND user_id = ?',
                [sleepRecordId, userId]
            );

            if ((originalRecords as any[]).length === 0) {
                return sendError(res, '睡眠记录不存在');
            }

            const original = (originalRecords as any[])[0];
            const newStartTime = sleep_start_time || original.sleep_start_time;
            const newWakeUpTime = wake_up_time || original.wake_up_time;

            // 验证新时间
            const validation = validateSleepTime(newStartTime, newWakeUpTime);
            if (!validation.valid) {
                return sendError(res, validation.message);
            }

            const newSleepDurationHours = calculateSleepDuration(newStartTime, newWakeUpTime);

            // 更新记录，并清空AI生成的字段以便重新计算
            await pool.query(
                'UPDATE checkin_sleep_record SET sleep_start_time = ?, wake_up_time = ?, sleep_duration_hours = ?, is_nap = ?, wake_up_times = ?, sleep_feeling = ?, sleep_quality_score = NULL, suggestion = NULL, evaluation = NULL WHERE id = ? AND user_id = ?',
                [
                    newStartTime,
                    newWakeUpTime,
                    newSleepDurationHours,
                    is_nap ?? 0,
                    wake_up_times ?? null,
                    sleep_feeling ?? null,
                    sleepRecordId,
                    userId
                ]
            );

            // 异步重新生成AI分析
            generateSleepAnalysisAsync(userId, parseInt(sleepRecordId), newSleepDurationHours, is_nap ?? 0, wake_up_times, sleep_feeling);
        } else {
            // 只更新其他字段
            await pool.query(
                'UPDATE checkin_sleep_record SET is_nap = ?, wake_up_times = ?, sleep_feeling = ? WHERE id = ? AND user_id = ?',
                [
                    is_nap ?? 0,
                    wake_up_times ?? null,
                    sleep_feeling ?? null,
                    sleepRecordId,
                    userId
                ]
            );
        }

        return sendResult(res, {
            sleepRecordId,
            message: '睡眠记录已更新'
        });
    } catch (error) {
        return sendError(res, '更新睡眠记录时出错: ' + error);
    }
}

// 删除睡眠记录
async function deleteSleepRecord(req: Request, res: Response): Promise<Response> {
    try {
        const sleepRecordId = Array.isArray(req.params.sleepRecordId) 
            ? req.params.sleepRecordId[0] 
            : req.params.sleepRecordId;
        const userId = getUserIdFromReq(req);

        const result = await pool.query(
            'DELETE FROM checkin_sleep_record WHERE id = ? AND user_id = ?',
            [sleepRecordId, userId]
        );

        if ((result as any)[0].affectedRows === 0) {
            return sendError(res, '睡眠记录不存在或无权删除');
        }

        return sendResult(res, {
            message: '睡眠记录已删除'
        });
    } catch (error) {
        return sendError(res, '删除睡眠记录时出错: ' + error);
    }
}

// 获取睡眠统计（近7天或30天）
async function getSleepStatistics(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);
        const days = parseInt(req.query.days as string) || 7;

        const [rows] = await pool.query(
            `SELECT 
                COUNT(*) as record_count,
                AVG(sleep_duration_hours) as avg_sleep_duration,
                AVG(sleep_quality_score) as avg_quality_score,
                MAX(sleep_quality_score) as max_quality_score,
                MIN(sleep_quality_score) as min_quality_score,
                SUM(CASE WHEN is_nap = 0 THEN 1 ELSE 0 END) as night_sleep_count,
                SUM(CASE WHEN is_nap = 1 THEN 1 ELSE 0 END) as nap_count
            FROM checkin_sleep_record 
            WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [userId, days]
        );

        const statistics = (rows as any[])[0];

        return sendResult(res, {
            days,
            statistics: {
                record_count: statistics.record_count || 0,
                avg_sleep_duration: statistics.avg_sleep_duration ? parseFloat(statistics.avg_sleep_duration).toFixed(2) : 0,
                avg_quality_score: statistics.avg_quality_score ? parseInt(statistics.avg_quality_score) : 0,
                max_quality_score: statistics.max_quality_score || 0,
                min_quality_score: statistics.min_quality_score || 0,
                night_sleep_count: statistics.night_sleep_count || 0,
                nap_count: statistics.nap_count || 0
            }
        });
    } catch (error) {
        return sendError(res, '获取睡眠统计时出错: ' + error);
    }
}


async function getSummaryResult(req: Request, res: Response): Promise<object> {
    try {
        const userId = getUserIdFromReq(req);
        const [rows] = await pool.query(
            'SELECT * FROM checkin_sleep_record WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())',
            [userId, userId]
        );
        const result = {
            records: rows as any[],
            sleep_duration_time: (rows as any[]).reduce((sum, record) => sum + (record.sleep_duration_hours || 0), 0),
            sleep_start_time: (rows as any[]).reduce((sum, record) => sum + (record.start_time || 0), 0),
            sleep_wakeup_times: (rows as any[]).reduce((sum, record) => sum + (record.wake_up_times || 0), 0),
            checkin_date: getCurrentDateTimeString().split('T')[0],
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
        const [rows] = await pool.query(
            'SELECT * FROM checkin_ai_summary WHERE daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())',
            [userId]
        );
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

async function calculateAISummary(summaryData: object,userId: number) {
    // 在这里实现AI分析总结的计算逻辑
    try {
        const prompt = `请基于以下睡眠数据进行AI分析总结：
        ${JSON.stringify(summaryData, null, 2)}
    请提供以下方面的AI分析总结(仅返回总结内容，不需要标题)：
    1.这是当天得到的睡眠数据，请分析并评价这些数据。`;

        const aiResult = await commonChat({
            user_content: prompt,
            model: 'qwen3.5-flash',
            response_type: 'text'
        });

        if (aiResult.ok) {
            const dailyCheckinId = (await pool.query(
                'SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE()',
                [userId]
            ))[0][0]?.id;

            if (dailyCheckinId) {
                const [existingRows] = await pool.query(
                    'SELECT id FROM checkin_ai_summary WHERE daily_checkin_id = ?',
                    [dailyCheckinId]
                );

                if ((existingRows as any[]).length > 0) {
                    await pool.query(
                        'UPDATE checkin_ai_summary SET sleep_ai_summary = ? WHERE daily_checkin_id = ?',
                        [aiResult.content, dailyCheckinId]
                    );
                } else {
                    await pool.query(
                        'INSERT INTO checkin_ai_summary (daily_checkin_id, sleep_ai_summary) VALUES (?, ?)',
                        [dailyCheckinId, aiResult.content]
                    );
                }
                console.log(`已更新AI分析总结 (daily_checkin_id: ${dailyCheckinId})`);
            }
        } else {
            console.error('AI分析总结失败:', aiResult.content);
        }
    } catch (error) {
        console.error('计算AI分析总结失败:', error);
    }
}

export {
    insertSleepRecord,
    getSleepRecords,
    updateSleepRecord,
    deleteSleepRecord,
    getSleepStatistics,
    getSummary,
    getAISummary,
    getSummaryResult
}
