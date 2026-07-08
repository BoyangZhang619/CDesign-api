/**
 * 任务完成历史记录数据访问层
 * 从 task_completion_records 表获取数据
 */

import { dbQuery } from '../config/db.js'

export interface TaskCompletionRecord {
  id: number;
  user_id: number;
  task_id: number | null;
  task_title: string;
  task_type: 'checkin_exercise' | 'checkin_meal' | 'checkin_sleep' | 'custom' | 'ai_suggested';
  category: 'diet' | 'exercise' | 'sleep' | 'custom';
  preset_type: string | null;
  task_priority: 'high' | 'medium' | 'low';
  completion_date: string; // YYYY-MM-DD
  completion_time: string; // datetime
  due_date: string | null; // YYYY-MM-DD
  category_icon: string | null;
  completion_status: 'on_time' | 'late' | 'early';
  created_at: string; // datetime
}

export interface TaskCompletionQueryParams {
  type?: string; // 任务类型过滤：'checkin_exercise' | 'checkin_meal' | 'checkin_sleep' | 'custom' | 'ai_suggested'
  category?: string; // 分类过滤：'diet' | 'exercise' | 'sleep' | 'custom'
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  priority?: string; // 优先级过滤：'high' | 'medium' | 'low'
  completionStatus?: string; // 完成状态过滤：'on_time' | 'late' | 'early'
  search?: string; // 任务标题搜索
  sort?: string; // 排序方式：'newest' | 'oldest' | 'priority'
  page?: number;
  limit?: number;
}

export class TaskCompletionHistoryDAL {
  /**
   * 获取用户的任务完成记录列表
   */
  static async getTaskCompletionRecords(
    userId: number,
    params: TaskCompletionQueryParams
  ): Promise<{ records: TaskCompletionRecord[]; total: number }> {
    const {
      type,
      category,
      startDate,
      endDate,
      priority,
      completionStatus,
      search,
      sort = 'newest',
      page = 1,
      limit = 20
    } = params;

    const offset = (page - 1) * limit;

    // 构建 WHERE 子句
    let whereClause = 'WHERE user_id = ?';
    const queryParams: any[] = [userId];

    if (type) {
      whereClause += ' AND task_type = ?';
      queryParams.push(type);
    }

    if (category) {
      whereClause += ' AND category = ?';
      queryParams.push(category);
    }

    if (priority) {
      whereClause += ' AND task_priority = ?';
      queryParams.push(priority);
    }

    if (completionStatus) {
      whereClause += ' AND completion_status = ?';
      queryParams.push(completionStatus);
    }

    if (search) {
      whereClause += ' AND task_title LIKE ?';
      queryParams.push(`%${search}%`);
    }

    if (startDate) {
      whereClause += ' AND completion_date >= ?';
      queryParams.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND completion_date <= ?';
      queryParams.push(endDate);
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM task_completion_records ${whereClause}`;
    const [countResult] = (await dbQuery(countQuery, queryParams)) as any;
    const total = countResult[0]?.total || 0;

    // 构建排序语句
    let orderBy = 'ORDER BY completion_time DESC'; // 默认最新优先
    if (sort === 'oldest') {
      orderBy = 'ORDER BY completion_time ASC';
    } else if (sort === 'priority') {
      orderBy = `ORDER BY 
        CASE task_priority 
          WHEN 'high' THEN 0 
          WHEN 'medium' THEN 1 
          WHEN 'low' THEN 2 
        END ASC, 
        completion_time DESC`;
    }

    // 获取数据
    const dataQuery = `
      SELECT * FROM task_completion_records 
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const finalParams = [...queryParams, limit, offset];

    console.log('📋 [TaskCompletionHistoryDAL] 查询条件:', {
      userId,
      type,
      category,
      startDate,
      endDate,
      priority,
      completionStatus,
      search,
      sort,
      page,
      limit
    });

    console.log('📊 SQL 查询语句:', dataQuery);
    console.log('📊 SQL 参数:', finalParams);

    const [rows] = (await dbQuery(dataQuery, finalParams)) as any;

    console.log(`✅ 查询结果: 返回 ${rows.length} 条记录，总数: ${total}`);
    console.log('📝 任务完成记录:', rows);

    return { records: rows as TaskCompletionRecord[], total };
  }

  /**
   * 获取单个任务完成记录
   */
  static async getTaskCompletionRecord(
    userId: number,
    recordId: number
  ): Promise<TaskCompletionRecord | null> {
    const query = `
      SELECT * FROM task_completion_records 
      WHERE id = ? AND user_id = ?
    `;

    const [rows] = (await dbQuery(query, [recordId, userId])) as any;

    if (!rows[0]) {
      return null;
    }

    console.log('✅ [TaskCompletionHistoryDAL] 获取记录:', rows[0]);
    return rows[0] as TaskCompletionRecord;
  }

  /**
   * 获取统计信息
   */
  static async getTaskCompletionStatistics(userId: number): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_completed,
        COUNT(DISTINCT DATE(completion_date)) as days_with_completion,
        COUNT(CASE WHEN completion_status = 'on_time' THEN 1 END) as on_time_count,
        COUNT(CASE WHEN completion_status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN completion_status = 'early' THEN 1 END) as early_count,
        SUM(CASE WHEN task_type = 'checkin_exercise' THEN 1 ELSE 0 END) as exercise_count,
        SUM(CASE WHEN task_type = 'checkin_meal' THEN 1 ELSE 0 END) as meal_count,
        SUM(CASE WHEN task_type = 'checkin_sleep' THEN 1 ELSE 0 END) as sleep_count,
        SUM(CASE WHEN task_type = 'custom' THEN 1 ELSE 0 END) as custom_count,
        SUM(CASE WHEN task_type = 'ai_suggested' THEN 1 ELSE 0 END) as ai_suggested_count
      FROM task_completion_records
      WHERE user_id = ?
    `;

    const [rows] = (await dbQuery(query, [userId])) as any;

    console.log('✅ [TaskCompletionHistoryDAL] 统计信息:', rows[0]);
    return rows[0] || {};
  }

  /**
   * 获取按日期的完成情况汇总
   */
  static async getCompletionByDate(
    userId: number,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    let query = `
      SELECT 
        DATE(completion_date) as date,
        COUNT(*) as count,
        SUM(CASE WHEN completion_status = 'on_time' THEN 1 ELSE 0 END) as on_time,
        SUM(CASE WHEN completion_status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN completion_status = 'early' THEN 1 ELSE 0 END) as early
      FROM task_completion_records
      WHERE user_id = ?
    `;

    const params: any[] = [userId];

    if (startDate) {
      query += ' AND completion_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND completion_date <= ?';
      params.push(endDate);
    }

    query += ' GROUP BY DATE(completion_date) ORDER BY date DESC';

    const [rows] = (await dbQuery(query, params)) as any;

    console.log('✅ [TaskCompletionHistoryDAL] 按日期汇总:', rows);
    return rows;
  }
}
