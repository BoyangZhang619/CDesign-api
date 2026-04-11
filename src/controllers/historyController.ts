import { Request, Response } from 'express';
import pool from '../config/db.js';
import { getUserIdFromReq } from './sharedMethods.js';
import { sendError, sendResult } from '../util/response.js';
import { getCurrentTimeString } from '../util/dateTime.js';

interface HistoryQueryParams {
    type?: string; // 'meal' | 'exercise' | 'sleep' | '' (empty for all)
    startDate?: string; // YYYY-MM-DD 格式
    endDate?: string;   // YYYY-MM-DD 格式
    search?: string; // 搜索文本
    sort?: string; // 'newest' | 'oldest' | 'type'
    page?: string | number; // 分页页码，从 1 开始
    pageSize?: string | number; // 每页记录数
}

interface HistoryRecord {
    id: number;
    user_id: number;
    type: 'meal' | 'exercise' | 'sleep';
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

interface HistoryResponse {
    records: HistoryRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// 获取用户历史记录（支持分页、排序、搜索）
async function getHistory(req: Request, res: Response): Promise<Response> {
    const userId = getUserIdFromReq(req);
    try {
        const {
            type = '',
            startDate = '',
            endDate = '',
            search = '',
            sort = 'newest',
            page = '1',
            pageSize = '10'
        } = req.query as HistoryQueryParams;

        // 参数验证和转换
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string) || 10));
        const offset = (pageNum - 1) * pageSizeNum;

        // 构建记录查询
        const records = await getHistoryRecords(
            userId,
            type as string,
            startDate as string,
            endDate as string,
            search as string,
            sort as string,
            offset,
            pageSizeNum
        );

        // 获取总数
        const total = await getHistoryRecordsCount(
            userId,
            type as string,
            startDate as string,
            endDate as string,
            search as string
        );

        const totalPages = Math.ceil(total / pageSizeNum);

        const response: HistoryResponse = {
            records,
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages
        };

        return sendResult(res, response);
    } catch (error) {
        console.error('Error fetching user history:', error);
        return sendError(res, '获取历史记录失败: ' + (error as any).message);
    }
}

// 获取历史记录（带分页和排序）
async function getHistoryRecords(
    userId: number,
    type: string,
    startDate: string,
    endDate: string,
    search: string,
    sort: string,
    offset: number,
    limit: number
): Promise<HistoryRecord[]> {
    const records: HistoryRecord[] = [];
    const types = type ? [type] : ['meal', 'exercise', 'sleep'];

    for (const recordType of types) {
        const typeRecords = await getRecordsByType(userId, recordType, startDate, endDate, search);
        
        // 添加 type 字段
        const withType = typeRecords.map(r => ({
            ...r,
            type: recordType,
            // 标准化时间字段为 created_at
            created_at: r.created_at || r.start_time || r.sleep_start_time || r.meal_time || getCurrentTimeString()
        }));
        
        records.push(...withType);
    }

    // 排序
    if (sort === 'oldest') {
        records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sort === 'type') {
        records.sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    } else {
        // 'newest' 为默认排序
        records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // 分页
    return records.slice(offset, offset + limit);
}

// 获取历史记录总数
async function getHistoryRecordsCount(
    userId: number,
    type: string,
    startDate: string,
    endDate: string,
    search: string
): Promise<number> {
    const types = type ? [type] : ['meal', 'exercise', 'sleep'];
    let total = 0;

    for (const recordType of types) {
        const count = await getRecordsCountByType(userId, recordType, startDate, endDate, search);
        total += count;
    }

    return total;
}

// 根据类型获取记录
async function getRecordsByType(
    userId: number,
    type: string,
    startDate: string,
    endDate: string,
    search: string
): Promise<any[]> {
    let query = '';
    const params: any[] = [userId];

    if (type === 'meal') {
        query = `
                SELECT *
                FROM checkin_meal_record
                WHERE user_id = ?
        `;
        
        if (search) {
            query += ' AND (food_name LIKE ? OR food_detail LIKE ? OR food_source LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (startDate) {
            query += ' AND DATE(created_at) >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND DATE(created_at) <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY created_at DESC';
    } else if (type === 'exercise') {
        query = `
            SELECT * FROM checkin_exercise_record
            WHERE user_id = ?
        `;
        
        if (search) {
            query += ' AND (activity_type LIKE ? OR note LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (startDate) {
            query += ' AND DATE(start_time) >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND DATE(start_time) <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY start_time DESC';
    } else if (type === 'sleep') {
        query = `
            SELECT *
            FROM checkin_sleep_record
            WHERE user_id = ?
        `;
        
        if (search) {
            query += ' AND (sleep_feeling LIKE ? OR note LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (startDate) {
            query += ' AND DATE(sleep_start_time) >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND DATE(sleep_start_time) <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY sleep_start_time DESC';
    }

    const [rows] = await pool.query(query, params);
    return rows as any[];
}

// 获取记录总数
async function getRecordsCountByType(
    userId: number,
    type: string,
    startDate: string,
    endDate: string,
    search: string
): Promise<number> {
    let query = '';
    const params: any[] = [userId];

    if (type === 'meal') {
        query = 'SELECT COUNT(*) as count FROM checkin_meal_record WHERE user_id = ?';
        
        if (search) {
            query += ' AND (food_name LIKE ? OR food_detail LIKE ? OR food_source LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
    } else if (type === 'exercise') {
        query = 'SELECT COUNT(*) as count FROM checkin_exercise_record WHERE user_id = ?';
        
        if (search) {
            query += ' AND (activity_type LIKE ? OR note LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
    } else if (type === 'sleep') {
        query = 'SELECT COUNT(*) as count FROM checkin_sleep_record WHERE user_id = ?';
        
        if (search) {
            query += ' AND (sleep_feeling LIKE ? OR note LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
    }

    if (startDate) {
        const dateField = type === 'exercise' ? 'start_time' : (type === 'sleep' ? 'sleep_start_time' : 'created_at');
        query += ` AND DATE(${dateField}) >= ?`;
        params.push(startDate);
    }

    if (endDate) {
        const dateField = type === 'exercise' ? 'start_time' : (type === 'sleep' ? 'sleep_start_time' : 'created_at');
        query += ` AND DATE(${dateField}) <= ?`;
        params.push(endDate);
    }

    const [rows] = await pool.query(query, params);
    const result = (rows as any[])[0];
    return result?.count || 0;
}

export {
    getHistory
};