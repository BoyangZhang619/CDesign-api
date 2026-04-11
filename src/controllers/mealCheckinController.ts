import pool from "../config/db.js";
import { sendError, sendResult } from "../util/response.js";
import { Request, Response } from "express";
import { insertEmptyDailyCheckin } from "./dailyCheckinController.js";
import { QueryResult } from "mysql2";
import { commonChat } from "./aiController.js";
import { getUserIdFromReq, getUserById } from "./sharedMethods.js";
import { get } from "http";
import { getCurrentTimeString } from '../util/dateTime.js';

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
        const [result] = await pool.query(
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
        sendResult(res, response);

        // 后台异步调用AI计算营养数据
        calculateNutritionDataAsync(userId, mealRecordId, meal_type, food_source, food_name, food_detail);

        return res;
    } catch (error) {
        return sendError(res, '插入打卡记录时出错: ' + error);
    }
}

// 异步计算营养数据
async function calculateNutritionDataAsync(userId: number, mealRecordId: number, meal_type: string, food_source: string, food_name: string, food_detail: string) {
    try {
        // 构建AI请求内容
        const prompt = `请根据以下食物信息计算营养成分：
食物名称: ${food_name}
食物详情: ${food_detail}
进食来源: ${food_source}
进食时段: ${meal_type}

请返回以下格式的数据(仅返回数字，单位为：热量kcal,蛋白质g,脂肪g,碳水g,纤维g,糖g,如果所有数据都为零，则强制使热量值为1)：
格式: 热量|蛋白质|脂肪|碳水|纤维|糖
示例: 500|20|15|60|5|10`;

        // 调用AI服务
        const aiResult = await commonChat({
            user_content: prompt,
            model: 'qwen3.5-flash',
            response_type: 'text'
        });

        if (!aiResult.ok) {
            console.error(`AI调用失败 (mealRecordId: ${mealRecordId}):`, aiResult.content);
            return;
        }

        // 解析AI返回的营养数据
        const nutritionData = parseNutritionData(aiResult.content);

        // 更新数据库中的营养信息
        if (nutritionData) {
            await pool.query(
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
        } else {
            console.warn(`无法解析营养数据 (mealRecordId: ${mealRecordId}), AI返回:`, aiResult.content);
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
        const [rows] = await pool.query(
            'SELECT * FROM checkin_meal_record WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE())',
            [userId, userId]
        );
        const result = {
            records: rows as any[],
            checkin_date: getCurrentTimeString().split('T')[0],
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
        const [rows] = await pool.query(
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
            meal_water: (rows as any[]).reduce((sum, record) => sum + (record.water_g || 0), 0),
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
        const [rows] = await pool.query(
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
        const prompt = `请基于以下营养摄入数据进行AI分析总结：
    热量: ${(summaryData as any).meal_calories} kcal
    蛋白质: ${(summaryData as any).meal_protein} g
    脂肪: ${(summaryData as any).meal_fat} g
    碳水: ${(summaryData as any).meal_carbohydrate} g
    纤维: ${(summaryData as any).meal_fiber} g
    糖: ${(summaryData as any).meal_sugar} g

    请提供以下方面的AI分析总结(仅返回总结内容，不需要标题)：
    1.这是当天得到的营养摄入数据，请分析并评价这些数据。`;

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
                        'UPDATE checkin_ai_summary SET meal_ai_summary = ? WHERE daily_checkin_id = ?',
                        [aiResult.content, dailyCheckinId]
                    );
                } else {
                    await pool.query(
                        'INSERT INTO checkin_ai_summary (daily_checkin_id, meal_ai_summary) VALUES (?, ?)',
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
            [rows] = await pool.query(
                'SELECT * FROM checkin_meal_record WHERE user_id = ? AND daily_checkin_id = (SELECT id FROM daily_checkin WHERE user_id = ? AND checkin_date = CURDATE()) LIMIT ? OFFSET ?',
                [userId, userId, limit, offset]
            );
        } else {
            [rows] = await pool.query(
                'SELECT * FROM checkin_meal_record WHERE user_id = ? LIMIT ? OFFSET ?',
                [userId, limit, offset]
            );
        }

        const result = {
            records: rows as any[],
            checkin_date: getCurrentTimeString().split('T')[0],
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
    getSummaryResult
}