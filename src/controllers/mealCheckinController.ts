import { dbQuery } from '../config/db.js'
import { sendError, sendResult } from "../util/response.js";
import { Request, Response } from "express";
import { insertEmptyDailyCheckin } from "./dailyCheckinController.js";
import { QueryResult } from "mysql2";
import { AIChatService } from "../services/aiChatService.js";
import { getUserIdFromReq, getUserById } from "./sharedMethods.js";
import { get } from "http";
import { getCurrentDateTimeString } from '../util/dateTime.js';
import { getAISummary as getTotalAISummary } from "./dailyCheckinController.js";

// 插入新的当前日期的打卡记录
async function insertCheckInRecord(req: Request, res: Response): Promise<Response> {
    try {
        const todayCheckin = await insertEmptyDailyCheckin(req, res);
        console.log(todayCheckin);
        if (todayCheckin == null) {
            return sendError(res, '无法插入打卡记录，因为无法获取或创建当天的打卡数据');
        }
        const body = req.body;
        const {
            meal_type = '未知',
            food_source = '未知',
            food_name = '未知',
            food_detail = '未知',
            calories,
            protein_g,
            fat_g,
            carbohydrate_g,
            fiber_g,
            sugar_g,
            meal_time = '未知',
            ai_recognition_flag,
            image_id
        } = body;
        const userId = getUserIdFromReq(req);
        const dailyCheckinId = (todayCheckin as any)?.id;
        console.log(userId, dailyCheckinId, meal_type, food_source, food_name, food_detail, calories, protein_g, fat_g, carbohydrate_g, fiber_g, sugar_g, meal_time, ai_recognition_flag, image_id);

        // 先插入记录到数据库
        const [result] = await dbQuery(
            'INSERT INTO checkin_meal_record (user_id, daily_checkin_id, meal_type, food_source, food_name, food_detail, calories, protein_g, fat_g, carbohydrate_g, fiber_g, sugar_g, meal_time, ai_recognition_flag, image_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId ?? null, dailyCheckinId ?? null, meal_type ?? null, food_source ?? null, food_name ?? null, food_detail ?? null, calories ?? null, protein_g ?? null, fat_g ?? null, carbohydrate_g ?? null, fiber_g ?? null, sugar_g ?? null, meal_time ?? null, ai_recognition_flag ?? null, image_id ?? null]
        );

        const mealRecordId = (result as any).insertId;

        // 立即返回给前端
        const response = {
            mealRecordId,
            message: '打卡记录已保存',
            status: 'pending_ai_analysis'
        };

        await getTotalAISummary(req, res).then(() => {
            calculateNutritionDataAsync(userId, mealRecordId, meal_type, food_source, food_name, food_detail);
        });
        sendResult(res, response);

        return res;
    } catch (error) {
        return sendError(res, '插入打卡记录时出错: ' + error);
    }
}

// 异步计算营养数据
async function calculateNutritionDataAsync(userId: number, mealRecordId: number, meal_type: string, food_source: string, food_name: string, food_detail: string) {
    try {
        // 构建AI请求内容
        const prompt = `[饮食健康信息的的数据内容处理与分析]请根据以下食物信息计算营养成分：
食物名称: ${food_name}
食物详情: ${food_detail}
进食来源: ${food_source}
进食时段: ${meal_type}

请返回以下格式的数据(仅返回数字，单位为：热量(kcal),蛋白质(g),脂肪(g),碳水(g),纤维(g),糖(g),如果用户输入所得结果的所有数据都为零（只要用户输入了食物，即使没有关于该数据的其他信息，也要根据改内容来得出对应的数据，只有其输出完全未提到饮食才给空），则强制使热量值为1，不必复述信息，不得额外输出内容，若备注内容无相关性请忽略)：
格式: 热量|蛋白质|脂肪|碳水|纤维|糖
示例: 500|20|15|60|5|10`;

        // 调用AI服务
        const sessionData = {
            title: `Nutrition Analysis ${getCurrentDateTimeString()}`,
            description: '食物营养成分计算',
            tags: 'system',
            ai_model: 'dashscope'
        };

        const session = await AIChatService.createSession(userId, sessionData);
        const aiResult = await AIChatService.sendMessage(userId, session.id, prompt);

        if (!aiResult?.aiMessage) {
            console.error(`AI调用失败 (mealRecordId: ${mealRecordId}):`, '无有效响应');
            return;
        }

        // 解析AI返回的营养数据
        const nutritionData = parseNutritionData(aiResult.aiMessage.content);

        // 更新数据库中的营养信息
        if (nutritionData) {
            await dbQuery(
                'UPDATE checkin_meal_record SET calories = ?, protein_g = ?, fat_g = ?, carbohydrate_g = ?, fiber_g = ?, sugar_g = ? WHERE id = ? AND user_id = ?',
                [
                    nutritionData.calories,
                    nutritionData.protein_g,
                    nutritionData.fat_g,
                    nutritionData.carbohydrate_g,
                    nutritionData.fiber_g,
                    nutritionData.sugar_g,
                    mealRecordId,
                    userId
                ]
            );
            console.log(`已更新meal记录 ${mealRecordId} 的营养数据:`, nutritionData);

            // 触发更新饮食总结（异步，不阻塞）
            updateMealAISummary(userId).catch(err =>
                console.error('更新饮食AI总结失败:', err)
            );

        } else {
            console.warn(`无法解析营养数据 (mealRecordId: ${mealRecordId}), AI返回:`, aiResult.aiMessage?.content);
        }
    } catch (error) {
        console.error(`计算营养数据失败 (mealRecordId: ${mealRecordId}):`, error);
    }
}

// 解析AI返回的营养数据
function parseNutritionData(aiResponse: string): any {
    try {
        // 处理 "热量|蛋白质|脂肪|碳水|纤维|糖" 格式
        // 先尝试匹配 "数字|数字|数字|数字|数字|数字" 的格式
        const pipeFormatMatch = aiResponse.match(/(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)/);

        if (pipeFormatMatch) {
            return {
                calories: parseFloat(pipeFormatMatch[1]),
                protein_g: parseFloat(pipeFormatMatch[2]),
                fat_g: parseFloat(pipeFormatMatch[3]),
                carbohydrate_g: parseFloat(pipeFormatMatch[4]),
                fiber_g: parseFloat(pipeFormatMatch[5]),
                sugar_g: parseFloat(pipeFormatMatch[6])
            };
        }

        // 如果没有找到管道格式，尝试提取任何连续的数字
        const numbers = aiResponse.match(/\d+(?:\.\d+)?/g);
        if (numbers && numbers.length >= 6) {
            return {
                calories: parseFloat(numbers[0]),
                protein_g: parseFloat(numbers[1]),
                fat_g: parseFloat(numbers[2]),
                carbohydrate_g: parseFloat(numbers[3]),
                fiber_g: parseFloat(numbers[4]),
                sugar_g: parseFloat(numbers[5])
            };
        }

        return null;
    } catch (error) {
        console.error('解析营养数据失败:', error);
        return null;
    }
}

// 获取当前日期的所有打卡记录
async function getCheckInRecords(req: Request, res: Response): Promise<Response> {
    const todayCheckin = await insertEmptyDailyCheckin(req, res);
    if (todayCheckin === null) {
        return sendError(res, '无法插入打卡记录，因为无法获取或创建当天的打卡数据');
    }
    try {
        const userId = getUserIdFromReq(req);
        const [rows] = await dbQuery(
            'SELECT * FROM checkin_meal_record WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())',
            [userId, userId]
        );
        const result = {
            records: rows as any[],
            checkin_date: getCurrentDateTimeString().split('T')[0],
            message: (rows as any[]).length > 0 ? '获取打卡记录成功' : '今天还没有打卡记录'
        };
        return sendResult(res, result);
    } catch (error) {
        return sendError(res, '获取打卡记录时出错: ' + error);
    }
}

async function getSummaryResult(req: Request, res: Response): Promise<object> {
    try {
        const userId = getUserIdFromReq(req);
        const [rows] = await dbQuery(
            'SELECT * FROM checkin_meal_record WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())',
            [userId, userId]
        );
        const result = {
            records: rows as any[],
            meal_breakfast_type: (rows as any[]).find(record => record.meal_type.toLowerCase() === 'breakfast' || record.meal_type === '早餐')?.food_name || '无',
            meal_lunch_type: (rows as any[]).find(record => record.meal_type.toLowerCase() === 'lunch' || record.meal_type === '午餐')?.food_name || '无',
            meal_dinner_type: (rows as any[]).find(record => record.meal_type.toLowerCase() === 'dinner' || record.meal_type === '晚餐')?.food_name || '无',
            meal_snack_type: (rows as any[]).find(record => record.meal_type.toLowerCase() === 'snack' || record.meal_type === '零食')?.food_name || '无',
            meal_calories: (rows as any[]).reduce((sum, record) => sum + (record.calories || 0), 0),
            meal_protein: (rows as any[]).reduce((sum, record) => sum + (record.protein_g || 0), 0),
            meal_fat: (rows as any[]).reduce((sum, record) => sum + (record.fat_g || 0), 0),
            meal_carbohydrate: (rows as any[]).reduce((sum, record) => sum + (record.carbohydrate_g || 0), 0),
            meal_fiber: (rows as any[]).reduce((sum, record) => sum + (record.fiber_g || 0), 0),
            meal_sugar: (rows as any[]).reduce((sum, record) => sum + (record.sugar_g || 0), 0),
            meal_water: 0, // V2: 饮水量在 daily_checkin.water_intake_ml，不在 checkin_meal_record
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

/**
 * 更新当日饮食 AI 总结
 */
async function updateMealAISummary(userId: number) {
    try {
        // 获取当日所有饮食记录
        const [rows] = await dbQuery(
            `SELECT * FROM checkin_meal_record 
             WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())
             ORDER BY meal_time DESC`,
            [userId, userId]
        );

        if ((rows as any[]).length === 0) {
            return;
        }

        const summaryData = {
            records: rows as any[],
            total_calories: (rows as any[]).reduce((sum, record) => sum + (record.calories || 0), 0),
            total_protein: (rows as any[]).reduce((sum, record) => sum + (record.protein_g || 0), 0),
            checkin_date: getCurrentDateTimeString().split('T')[0],
            message: '饮食打卡已完成'
        };

        // 调用 calculateAISummary 更新 AI 总结
        await calculateAISummary(summaryData, userId);
    } catch (error) {
        console.error('更新饮食AI总结失败:', error);
    }
}

async function getAISummary(req: Request, res: Response): Promise<Response> {
    const userId = getUserIdFromReq(req);
    try {
        const [rows] = await dbQuery(
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

async function calculateAISummary(summaryData: object, userId: number) {
    // 使用 AIChatService 处理 AI 分析总结
    try {
        // 从 summaryData 获取当日打卡的详细记录
        const records = (summaryData as any).records || [];

        // 构建更详细的营养数据统计和食物列表
        const mealBreakdownList = records
            .map((record: any) => {
                const mealTimeLabel = record.meal_type?.toLowerCase() === 'breakfast' || record.meal_type === '早餐' ? '早餐' :
                    record.meal_type?.toLowerCase() === 'lunch' || record.meal_type === '午餐' ? '午餐' :
                        record.meal_type?.toLowerCase() === 'dinner' || record.meal_type === '晚餐' ? '晚餐' :
                            record.meal_type || '其他';
                return `${mealTimeLabel}: ${record.food_name || '未知食物'} (${record.calories || 0} kcal, 蛋白质${record.protein_g || 0}g)`;
            })
            .join('\n');

        const totalCalories = (summaryData as any).meal_calories || 0;
        const totalProtein = (summaryData as any).meal_protein || 0;
        const totalFat = (summaryData as any).meal_fat || 0;
        const totalCarbs = (summaryData as any).meal_carbohydrate || 0;
        const totalFiber = (summaryData as any).meal_fiber || 0;
        const totalSugar = (summaryData as any).meal_sugar || 0;

        const prompt = `[饮食健康信息的的数据内容处理与分析]

            ## 当日进食详情：
            ${mealBreakdownList || '暂无进食记录'}

            ## 今日营养摄入统计：
            - 总热量：${totalCalories} kcal
            - 蛋白质：${totalProtein}g
            - 脂肪：${totalFat}g
            - 碳水化合物：${totalCarbs}g
            - 膳食纤维：${totalFiber}g
            - 糖类：${totalSugar}g

            ## 分析要求：
            请基于上述当日饮食数据进行专业且客观的分析总结，包括以下几个方面（仅返回分析内容，不需要标题）：

            1. 营养均衡评价：根据摄入的各营养素比例，评估今日饮食是否均衡
            2. 热量摄入评价：评估${totalCalories}卡的热量摄入水平（参考成人日常需求1800-2400卡）
            3. 蛋白质充足性：${totalProtein}g蛋白质是否满足日常需求（参考50-65g/天）
            4. 建议和改进：针对当日饮食给出具体的改善建议

            请确保回答简洁专业，适合健康管理应用展示。`;

        const sessionData = {
            title: `Meal Summary ${getCurrentDateTimeString()}`,
            description: '饮食数据AI总结',
            tags: 'system',
            ai_model: 'dashscope'
        };

        const session = await AIChatService.createSession(userId, sessionData);
        const aiResult = await AIChatService.sendMessage(userId, session.id, prompt);

        if (aiResult?.aiMessage) {
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
                        'UPDATE checkin_ai_summary SET meal_ai_summary = ? WHERE daily_checkin_id = ?',
                        [aiResult.aiMessage.content, dailyCheckinId]
                    );
                } else {
                    await dbQuery(
                        'INSERT INTO checkin_ai_summary (daily_checkin_id, meal_ai_summary) VALUES (?, ?)',
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

/**
 * 获取当日所有类型的 AI 总结（运动、饮食、睡眠、整体）
 */
async function getAllDailyAISummary(req: Request, res: Response): Promise<Response> {
    const userId = getUserIdFromReq(req);
    try {
        const [rows] = await dbQuery(
            `SELECT 
                id,
                daily_checkin_id,
                meal_ai_summary,
                exercise_ai_summary,
                sleep_ai_summary,
                total_ai_summary,
                is_meal_summary_updated,
                is_exercise_summary_updated,
                is_sleep_summary_updated,
                is_total_summary_updated
            FROM checkin_ai_summary 
            WHERE daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())`,
            [userId]
        );

        if ((rows as any[]).length === 0) {
            return sendResult(res, {
                data: null,
                checkin_date: getCurrentDateTimeString().split('T')[0],
                message: '今天还没有AI分析总结'
            });
        }

        const summary = (rows as any[])[0];
        return sendResult(res, {
            data: {
                id: summary.id,
                daily_checkin_id: summary.daily_checkin_id,
                meal_ai_summary: summary.meal_ai_summary,
                exercise_ai_summary: summary.exercise_ai_summary,
                sleep_ai_summary: summary.sleep_ai_summary,
                total_ai_summary: summary.total_ai_summary,
                updated_flags: {
                    meal: summary.is_meal_summary_updated === 1,
                    exercise: summary.is_exercise_summary_updated === 1,
                    sleep: summary.is_sleep_summary_updated === 1,
                    total: summary.is_total_summary_updated === 1
                }
            },
            checkin_date: getCurrentDateTimeString().split('T')[0],
            message: '获取AI分析总结成功'
        });
    } catch (error) {
        return sendError(res, '获取AI分析总结时出错: ' + error);
    }
}

// 通过limit 和 offset获取当天打卡记录
async function getCheckInRecordsWithPagination(req: Request, res: Response): Promise<Response> {
    const todayCheckin = await insertEmptyDailyCheckin(req, res);
    if (todayCheckin === null) {
        return sendError(res, '无法插入打卡记录，因为无法获取或创建当天的打卡数据');
    }
    try {
        const userId = req.user.id;
        const { limit = 10, offset = 0 } = req.query;
        const isToday = req.body.isToday;
        let rows: QueryResult;
        if (isToday) {
            [rows] = await dbQuery(
                'SELECT * FROM checkin_meal_record WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE()) LIMIT ? OFFSET ?',
                [userId, userId, limit, offset]
            );
        } else {
            [rows] = await dbQuery(
                'SELECT * FROM checkin_meal_record WHERE user_id = ? LIMIT ? OFFSET ?',
                [userId, limit, offset]
            );
        }

        const result = {
            records: rows as any[],
            checkin_date: getCurrentDateTimeString().split('T')[0],
            message: (rows as any[]).length > 0 ? '获取打卡记录成功' : isToday ? '今天还没有打卡记录' : '没有找到打卡记录'
        };
        return sendResult(res, result);
    } catch (error) {
        return sendError(res, '获取打卡记录时出错: ' + error);
    }
}


export {
    insertCheckInRecord,
    getCheckInRecords,
    getCheckInRecordsWithPagination,
    getAISummary,
    getSummary,
    getSummaryResult,
    getAllDailyAISummary
}