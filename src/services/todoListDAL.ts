/**
 * TodoList 数据库访问层
 */

import pool from '../config/db.js';
import type {
    Task,
    TaskCompletionRecord,
    CheckinRecord,
    TaskStatistics,
    TaskStatus,
    TaskType,
    TaskPriority,
    CheckinType,
    CreateTaskRequest,
    UpdateTaskRequest,
    TaskQueryParams
} from '../types/todolist.js';

export class TodoListDAL {
    /**
     * 创建任务
     */
    static async createTask(userId: number, taskData: CreateTaskRequest): Promise<Task> {
        const query = `
      INSERT INTO tasks (
        user_id, title, description, type, status, priority, 
        due_date, due_time, is_daily, category_icon,
        ai_suggestion_reason, checkin_type, checkin_recurrence, 
        checkin_preset, ai_prompt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            userId,
            taskData.title,
            taskData.description || null,
            taskData.type,
            'pending',
            taskData.priority,
            taskData.due_date,
            taskData.due_time || null,
            taskData.is_daily || false,
            taskData.category_icon || null,
            null,
            taskData.checkin_type || null,
            taskData.checkin_recurrence || null,
            taskData.checkin_preset || null,
            taskData.ai_prompt || null
        ];

        const [result] = await pool.execute(query, values) as any;
        return this.getTaskById(userId, result.insertId) as Promise<Task>;
    }

    /**
     * 根据 ID 获取任务
     */
    static async getTaskById(userId: number, taskId: number): Promise<Task | null> {
        console.log('Fetching task with ID:', taskId, 'for user ID:', userId);
        const query = 'SELECT * FROM tasks WHERE id = ? AND user_id = ?';
        const [rows] = await pool.execute(query, [taskId, userId]) as any;
        return rows[0] || null;
    }

    /**
     * 获取用户任务列表
     */
    static async getUserTasks(userId: number, params: TaskQueryParams): Promise<{ tasks: Task[]; total: number }> {
        const { date, status, type, priority, search, page = 1, limit = 20 } = params;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE user_id = ?';
        let queryParams: any[] = [userId];

        if (date) {
            whereClause += ' AND due_date = ?';
            queryParams.push(date);
        }

        if (status) {
            whereClause += ' AND status = ?';
            queryParams.push(status);
        }

        if (type) {
            whereClause += ' AND type = ?';
            queryParams.push(type);
        }

        if (priority) {
            whereClause += ' AND priority = ?';
            queryParams.push(priority);
        }

        if (search) {
            whereClause += ' AND (title LIKE ? OR description LIKE ?)';
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }
        // 获取总数
        const countQuery = `SELECT COUNT(*) as total FROM tasks ${whereClause}`;
        const [countResult] = await pool.execute(countQuery, queryParams) as any;
        const total = countResult[0].total;
        // 获取任务列表
        const dataQuery = `SELECT * FROM tasks ${whereClause} ORDER BY priority = 'high' DESC, priority = 'medium' DESC, due_date ASC, created_at DESC LIMIT ?, ?`;
        console.log(dataQuery);
        // 1. 显式构建参数数组，确保它是纯净的
        const finalParams = [...queryParams, offset, limit];

        // 2. 深度打印，看清楚每一个值的具体内容和索引
        console.log("--- 调试参数详情 ---");
        console.log("SQL语句中的问号数量:", (dataQuery.match(/\?/g) || []).length);
        console.log("参数数组长度:", finalParams.length);
        finalParams.forEach((val, i) => {
            console.log(`参数[${i}] 内容:`, val, ` 类型:`, typeof val);
        });

        // 3. 执行时使用这个显式数组
        const [rows] = await pool.query(dataQuery, finalParams) as any || [];
        console.log("11111111111111111111", rows);
        return { tasks: rows, total: total };
    }

    /**
     * 更新任务
     */
    static async updateTask(userId: number, taskId: number, updateData: UpdateTaskRequest): Promise<Task | null> {
        const fields: string[] = [];
        const values: any[] = [];

        if (updateData.title !== undefined) {
            fields.push('title = ?');
            values.push(updateData.title);
        }
        if (updateData.description !== undefined) {
            fields.push('description = ?');
            values.push(updateData.description);
        }
        if (updateData.priority !== undefined) {
            fields.push('priority = ?');
            values.push(updateData.priority);
        }
        if (updateData.due_date !== undefined) {
            fields.push('due_date = ?');
            values.push(updateData.due_date);
        }
        if (updateData.due_time !== undefined) {
            fields.push('due_time = ?');
            values.push(updateData.due_time);
        }
        if (updateData.is_daily !== undefined) {
            fields.push('is_daily = ?');
            values.push(updateData.is_daily);
        }
        if (updateData.category_icon !== undefined) {
            fields.push('category_icon = ?');
            values.push(updateData.category_icon);
        }
        if (updateData.checkin_preset !== undefined) {
            fields.push('checkin_preset = ?');
            values.push(updateData.checkin_preset);
        }

        if (fields.length === 0) {
            return this.getTaskById(userId, taskId);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
        values.push(taskId, userId);

        await pool.execute(query, values);
        return this.getTaskById(userId, taskId);
    }

    /**
     * 删除任务
     */
    static async deleteTask(userId: number, taskId: number): Promise<boolean> {
        const query = 'DELETE FROM tasks WHERE id = ? AND user_id = ?';
        const [result] = await pool.execute(query, [taskId, userId]) as any;
        return result.affectedRows > 0;
    }

    /**
     * 标记任务为完成
     */
    static async completeTask(userId: number, taskId: number, completedDate?: string): Promise<boolean> {
        const actualDate = completedDate || new Date().toISOString().split('T')[0];

        // 获取任务信息用于记录
        const task = await this.getTaskById(userId, taskId);
        if (!task) {
            return false;
        }

        // 开始事务
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 更新任务状态
            const updateQuery = `
        UPDATE tasks 
        SET status = 'completed', completed_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;
            await connection.execute(updateQuery, [actualDate, taskId, userId]);

            // 记录完成记录
            const completionStatus = this.calculateCompletionStatus(task.due_date, actualDate);
            const recordQuery = `
        INSERT INTO task_completion_records (
          user_id, task_id, task_title, task_type, task_priority, 
          completion_date, completion_time, due_date, category_icon, completion_status
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
      `;
            await connection.execute(recordQuery, [
                userId,
                taskId,
                task.title,
                task.type,
                task.priority,
                actualDate,
                task.due_date,
                task.category_icon,
                completionStatus
            ]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 标记任务为未完成
     */
    static async uncompleteTask(userId: number, taskId: number): Promise<boolean> {
        const query = `
      UPDATE tasks 
      SET status = 'pending', completed_date = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;
        const [result] = await pool.execute(query, [taskId, userId]) as any;
        return result.affectedRows > 0;
    }

    /**
     * 获取任务统计信息
     */
    static async getTaskStatistics(userId: number, date?: string): Promise<TaskStatistics> {
        let whereClause = 'WHERE user_id = ?';
        const queryParams: any[] = [userId];

        if (date) {
            whereClause += ' AND due_date = ?';
            queryParams.push(date);
        }

        const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN type = 'checkin_exercise' THEN 1 ELSE 0 END) as checkin_exercise,
        SUM(CASE WHEN type = 'checkin_meal' THEN 1 ELSE 0 END) as checkin_meal,
        SUM(CASE WHEN type = 'checkin_sleep' THEN 1 ELSE 0 END) as checkin_sleep,
        SUM(CASE WHEN type = 'custom' THEN 1 ELSE 0 END) as custom_count,
        SUM(CASE WHEN type = 'ai_suggested' THEN 1 ELSE 0 END) as ai_suggested,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
        SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority
      FROM tasks ${whereClause}
    `;

        const [rows] = await pool.execute(query, queryParams) as any;
        const stats = rows[0];

        const total = stats.total || 0;
        const completed = stats.completed || 0;

        return {
            total,
            completed,
            pending: stats.pending || 0,
            overdue: stats.overdue || 0,
            completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
            byType: {
                checkin_exercise: stats.checkin_exercise || 0,
                checkin_meal: stats.checkin_meal || 0,
                checkin_sleep: stats.checkin_sleep || 0,
                custom: stats.custom_count || 0,
                ai_suggested: stats.ai_suggested || 0
            },
            byPriority: {
                high: stats.high_priority || 0,
                medium: stats.medium_priority || 0,
                low: stats.low_priority || 0
            }
        };
    }

    /**
     * 获取或创建打卡记录
     */
    static async getOrCreateCheckinRecord(
        userId: number,
        checkinType: CheckinType,
        checkinDate: string
    ): Promise<CheckinRecord> {
        // 尝试获取
        const getQuery = `
      SELECT * FROM checkin_records 
      WHERE user_id = ? AND checkin_type = ? AND checkin_date = ?
    `;
        const [rows] = await pool.execute(getQuery, [userId, checkinType, checkinDate]) as any;

        if (rows.length > 0) {
            return rows[0];
        }

        // 创建新记录
        const createQuery = `
      INSERT INTO checkin_records (user_id, checkin_type, checkin_date, completed)
      VALUES (?, ?, ?, FALSE)
    `;
        const [result] = await pool.execute(createQuery, [userId, checkinType, checkinDate]) as any;

        return {
            id: result.insertId,
            user_id: userId,
            checkin_type: checkinType,
            checkin_date: checkinDate,
            completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    /**
     * 更新打卡记录
     */
    static async updateCheckinRecord(recordId: number, completed: boolean): Promise<boolean> {
        const query = `
      UPDATE checkin_records 
      SET completed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
        const [result] = await pool.execute(query, [completed, recordId]) as any;
        return result.affectedRows > 0;
    }

    /**
     * 检测并更新逾期任务
     */
    static async updateOverdueTasks(): Promise<number> {
        const query = `
      UPDATE tasks 
      SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'pending' AND due_date < CURDATE()
    `;
        const [result] = await pool.execute(query) as any;
        return result.affectedRows;
    }

    /**
     * 获取完成记录
     */
    static async getCompletionRecords(
        userId: number,
        startDate?: string,
        endDate?: string,
        taskType?: TaskType
    ): Promise<TaskCompletionRecord[]> {
        let whereClause = 'WHERE user_id = ?';
        const queryParams: any[] = [userId];

        if (startDate) {
            whereClause += ' AND completion_date >= ?';
            queryParams.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND completion_date <= ?';
            queryParams.push(endDate);
        }

        if (taskType) {
            whereClause += ' AND task_type = ?';
            queryParams.push(taskType);
        }

        const query = `
      SELECT * FROM task_completion_records ${whereClause}
      ORDER BY completion_date DESC, completion_time DESC
    `;

        const [rows] = await pool.execute(query, queryParams) as any;
        return rows;
    }

    /**
     * 计算完成状态（提前/准时/迟到）
     */
    private static calculateCompletionStatus(dueDate: string, completionDate: string): string {
        const due = new Date(dueDate).getTime();
        const completed = new Date(completionDate).getTime();

        if (completed < due) {
            return 'early';
        } else if (completed === due) {
            return 'on_time';
        } else {
            return 'late';
        }
    }

    /**
     * 获取用户打卡任务列表
     */
    static async getCheckinTasks(userId: number, checkinType?: CheckinType): Promise<Task[]> {
        let query = 'SELECT * FROM tasks WHERE user_id = ? AND type LIKE "%checkin%"';
        const queryParams: any[] = [userId];

        if (checkinType) {
            query += ' AND checkin_type = ?';
            queryParams.push(checkinType);
        }

        query += ' ORDER BY due_date DESC';

        const [rows] = await pool.execute(query, queryParams) as any;
        return rows;
    }

    /**
     * 根据打卡类型和日期获取对应的任务
     */
    static async getCheckinTaskByTypeAndDate(
        userId: number,
        checkinType: CheckinType,
        date: string
    ): Promise<Task | null> {
        const query = `
      SELECT * FROM tasks 
      WHERE user_id = ? AND type LIKE "%checkin%" 
      AND checkin_type = ? AND due_date <= ? AND due_date > DATE_SUB(?, INTERVAL 1 DAY)
      ORDER BY due_date DESC LIMIT 1
    `;

        const [rows] = await pool.execute(query, [userId, checkinType, date, date]) as any;
        return rows[0] || null;
    }
}
