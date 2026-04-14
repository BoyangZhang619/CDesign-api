/**
 * TodoList 数据库访问层
 */

import pool from '../config/db.js';
import { getCurrentDateString, getCurrentDateTimeString, getDateTimeString } from '../util/dateTime.js';
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
     * 计算任务的 due_date 基于 date_type
     * - tomorrow: 明天
     * - workday: 下一个工作日
     * - weekend: 下一个周末（周六或周日）
     * - everyday: 今天
     */
    private static calculateDueDate(dateType: string): string {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dateType === 'tomorrow') {
            // 明天
            return this.formatDate(tomorrow);
        } else if (dateType === 'everyday') {
            // 每天 - 从今天开始
            return this.formatDate(today);
        } else if (dateType === 'workday') {
            // 下一个工作日
            let date = new Date(tomorrow);
            while (date.getDay() === 0 || date.getDay() === 6) {
                date.setDate(date.getDate() + 1);
            }
            return this.formatDate(date);
        } else if (dateType === 'weekend') {
            // 下一个周末（周六或周日）
            let date = new Date(tomorrow);
            while (date.getDay() !== 0 && date.getDay() !== 6) {
                date.setDate(date.getDate() + 1);
            }
            return this.formatDate(date);
        }
        return this.formatDate(tomorrow); // 默认明天
    }

    /**
     * 格式化日期为 YYYY-MM-DD
     */
    private static formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 创建任务
     */
    static async createTask(userId: number, taskData: CreateTaskRequest): Promise<Task> {
        // 计算 due_date
        const calculatedDueDate = this.calculateDueDate(taskData.date_type || 'tomorrow');
        
        // "tomorrow" 类型时，设置 due_time 为次日（24:00 表示次日00:00）
        let dueTime = taskData.due_time || null;
        if ((taskData.date_type || 'tomorrow') === 'tomorrow' && !dueTime) {
            dueTime = '00:00'; // 默认明天 00:00
        }

        const query = `
      INSERT INTO tasks (
        user_id, title, description, type, category, status, priority, 
        due_date, due_time, is_daily, category_icon,
        ai_suggestion_reason, checkin_type, checkin_recurrence, 
        checkin_preset, preset_type, date_type, ai_prompt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            userId,
            taskData.title,
            taskData.description || null,
            taskData.type,
            taskData.category || 'custom',
            'pending', // 所有类型初始状态都是 pending
            taskData.priority,
            calculatedDueDate,
            dueTime,
            taskData.is_daily || false,
            taskData.category_icon || null,
            null,
            taskData.checkin_type || null,
            taskData.checkin_recurrence || null,
            taskData.checkin_preset || null,
            taskData.preset_type || null,
            taskData.date_type || 'tomorrow',
            taskData.ai_prompt || null
        ];

        const [result] = await pool.query(query, values) as any;
        return this.getTaskById(userId, result.insertId) as Promise<Task>;
    }

    /**
     * 根据 ID 获取任务
     * 对于非"tomorrow"类型的循环任务，检查今天是否有完成记录
     * 如果有，设置 status 为 'completed'
     */
    static async getTaskById(userId: number, taskId: number): Promise<Task | null> {
        console.log('Fetching task with ID:', taskId, 'for user ID:', userId);
        const query = 'SELECT * FROM tasks WHERE id = ? AND user_id = ?';
        const [rows] = await pool.query(query, [taskId, userId]) as any;
        
        if (!rows[0]) {
            return null;
        }

        const task = rows[0];
        const dateType = task.date_type || 'tomorrow';
        
        // 对于非"tomorrow"类型的循环任务，检查今天是否有完成记录
        if (dateType !== 'tomorrow') {
            const today = getCurrentDateString();
            const checkQuery = `
                SELECT COUNT(*) as count FROM task_completion_records 
                WHERE task_id = ? AND user_id = ? AND DATE(completion_date) = ?
            `;
            const [checkResult] = await pool.query(checkQuery, [taskId, userId, today]) as any;
            
            if (checkResult[0].count > 0) {
                // 今天已有完成记录，标记为已完成
                task.status = 'completed';
                console.log(`✅ 任务 ${taskId} 今天已完成过，设置 status = 'completed'`);
            }
        }
        
        return task;
    }

    /**
     * 获取用户任务列表 - 智能过滤
     * 默认返回当天应该显示的任务：
     * 1. 当天期限的非"tomorrow"类型任务
     * 2. 当天期限的"tomorrow"类型任务
     * 3. 逾期的"tomorrow"类型任务
     */
    static async getUserTasks(userId: number, params: TaskQueryParams): Promise<{ tasks: Task[]; total: number }> {
        const { date, status, type, priority, search, page = 1, limit = 20 } = params;
        const offset = (page - 1) * limit;

        // 如果没有指定日期，使用当前东八区日期（重要：修复时区问题）
        const queryDate = date || getCurrentDateString();
        
        // 诊断：检查该用户是否有任何任务
        const diagnosticQuery = 'SELECT COUNT(*) as total FROM tasks WHERE user_id = ?';
        const [diagnosticResult] = await pool.query(diagnosticQuery, [userId]) as any;
        console.log(`🔍 [诊断] 用户 ${userId} 在数据库中的总任务数: ${diagnosticResult[0].total}`);
        
        // 诊断：检查该日期的任务
        const dateCheckQuery = 'SELECT COUNT(*) as total FROM tasks WHERE user_id = ? AND due_date = ?';
        const [dateCheckResult] = await pool.query(dateCheckQuery, [userId, queryDate]) as any;
        console.log(`🔍 [诊断] 用户 ${userId} 在日期 ${queryDate} 的任务数: ${dateCheckResult[0].total}`);
        
        // 诊断：打印所有任务
        const allTasksQuery = 'SELECT id, user_id, title, due_date, status FROM tasks WHERE user_id = ? LIMIT 10';
        const [allTasks] = await pool.query(allTasksQuery, [userId]) as any;
        console.log(`🔍 [诊断] 用户 ${userId} 的最近10个任务:`, allTasks);

        let whereClause = 'WHERE user_id = ?';
        let queryParams: any[] = [userId];

        // 构建智能过滤条件
        // 返回：所有当天的任务（完成和未完成）+ 逾期的"tomorrow"任务（未完成）
        let dateFilterClause = `
            (
                -- 条件1: 当天期限的所有任务（不管完成没完成）
                (due_date = ?)
                OR
                -- 条件2: 逾期的"tomorrow"类型任务（未完成）
                (due_date < ? AND date_type = 'tomorrow' AND status != 'completed')
            )
        `;

        whereClause += ' AND ' + dateFilterClause;
        queryParams.push(queryDate, queryDate);

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
        const [countResult] = await pool.query(countQuery, queryParams) as any;
        const total = countResult[0].total;

        // 获取任务列表
        const dataQuery = `
            SELECT * FROM tasks ${whereClause} 
            ORDER BY 
                CASE WHEN due_date < ? THEN 0 ELSE 1 END,  -- 逾期优先
                priority = 'high' DESC, 
                priority = 'medium' DESC, 
                due_date ASC, 
                created_at DESC 
            LIMIT ?, ?
        `;

        const finalParams = [...queryParams, queryDate, offset, limit];

        console.log('📋 getUserTasks 查询条件:', {
            queryDate,
            status,
            type,
            priority,
            search,
            offset,
            limit,
            userId
        });
        
        console.log('📊 SQL 查询语句:', dataQuery);
        console.log('📊 SQL 参数:', finalParams);

        const [rows] = await pool.query(dataQuery, finalParams) as any || [];
        
        console.log(`✅ 查询结果: 返回 ${rows.length} 条记录，总数: ${total}`);
        console.log('📝 任务数据:', rows);
        
        // 对于非"tomorrow"类型的循环任务，检查今天是否有完成记录
        const today = queryDate;
        const processedRows = [];
        
        for (const task of rows) {
            const dateType = task.date_type || 'tomorrow';
            if (dateType !== 'tomorrow') {
                const checkQuery = `
                    SELECT COUNT(*) as count FROM task_completion_records 
                    WHERE task_id = ? AND user_id = ? AND DATE(completion_date) = ?
                `;
                const [checkResult] = await pool.query(checkQuery, [task.id, userId, today]) as any;
                
                if (checkResult[0].count > 0) {
                    // 今天已有完成记录，标记为已完成
                    task.status = 'completed';
                    console.log(`✅ 任务 ${task.id} 今天已完成过，设置 status = 'completed'`);
                }
            }
            processedRows.push(task);
        }
        
        console.log(`✅ 获取任务 ${processedRows.length} 条，总计 ${total} 条`);
        return { tasks: processedRows, total: total };
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
        if (updateData.type !== undefined) {
            fields.push('type = ?');
            values.push(updateData.type);
        }
        if (updateData.category !== undefined) {
            fields.push('category = ?');
            values.push(updateData.category);
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
        if (updateData.preset_type !== undefined) {
            fields.push('preset_type = ?');
            values.push(updateData.preset_type);
        }
        if (updateData.date_type !== undefined) {
            fields.push('date_type = ?');
            values.push(updateData.date_type);
        }

        if (fields.length === 0) {
            return this.getTaskById(userId, taskId);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
        values.push(taskId, userId);

        await pool.query(query, values);
        return this.getTaskById(userId, taskId);
    }

    /**
     * 删除任务
     */
    static async deleteTask(userId: number, taskId: number): Promise<boolean> {
        const query = 'DELETE FROM tasks WHERE id = ? AND user_id = ?';
        const [result] = await pool.query(query, [taskId, userId]) as any;
        return result.affectedRows > 0;
    }

    /**
     * 标记任务为完成
     */
    static async completeTask(userId: number, taskId: number, completedDate?: string): Promise<boolean> {
        const actualDate = completedDate || getCurrentDateString();

        // 获取任务信息用于记录
        const task = await this.getTaskById(userId, taskId);
        console.log(`✅ 标记任务 ${taskId} 为完成，完成日期: ${actualDate}，任务信息:`, task);
        if (!task) {
            return false;
        }

        // 开始事务
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 根据 date_type 决定是否更新 status
            // - "tomorrow" 类型：完成后标记为 completed
            // - 其他类型（everyday/workday/weekend）：保持 pending（循环任务）
            const dateType = (task as any).date_type || 'tomorrow';
            let updateQuery: string;
            let updateParams: any[];

            if (dateType === 'tomorrow') {
                // "tomorrow" 类型：标记为已完成
                updateQuery = `
          UPDATE tasks 
          SET status = 'completed', completed_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `;
                updateParams = [actualDate, taskId, userId];
            } else {
                // 其他类型（everyday/workday/weekend）：只记录完成时间，保持 pending
                updateQuery = `
          UPDATE tasks 
          SET completed_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `;
                updateParams = [actualDate, taskId, userId];
            }

            await connection.query(updateQuery, updateParams);

            // 记录完成记录
            const completionStatus = this.calculateCompletionStatus(task.due_date, actualDate);
            const recordQuery = `
        INSERT INTO task_completion_records (
          user_id, task_id, task_title, task_type, task_priority, 
          completion_date, completion_time, due_date, category_icon, completion_status
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
      `;
            await connection.query(recordQuery, [
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
        // 获取任务信息
        const task = await this.getTaskById(userId, taskId);
        if (!task) {
            return false;
        }

        const dateType = (task as any).date_type || 'tomorrow';
        
        if (dateType === 'tomorrow') {
            // "tomorrow"类型：更新 status 为 pending
            const query = `
        UPDATE tasks 
        SET status = 'pending', completed_date = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `;
            const [result] = await pool.query(query, [taskId, userId]) as any;
            return result.affectedRows > 0;
        } else {
            // 循环任务：删除今天的完成记录，并清除 completed_date
            const today = getCurrentDateString();
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                
                // 1. 删除今天的完成记录
                const deleteQuery = `
          DELETE FROM task_completion_records 
          WHERE task_id = ? AND user_id = ? AND DATE(completion_date) = ?
        `;
                const [deleteResult] = await connection.query(deleteQuery, [taskId, userId, today]) as any;
                console.log(`✅ 删除任务 ${taskId} 今天的完成记录，影响行数: ${deleteResult.affectedRows}`);
                
                // 2. 更新 tasks 表中的 completed_date 为 NULL（清除今天的完成标记）
                const updateQuery = `
          UPDATE tasks 
          SET completed_date = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `;
                await connection.query(updateQuery, [taskId, userId]);
                console.log(`✅ 清除任务 ${taskId} 的 completed_date`);
                
                await connection.commit();
                return deleteResult.affectedRows > 0;
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }
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

        const query = [
            "SELECT",
            "COUNT(*) as total,",
            "SUM(IF(status = 'completed', 1, 0)) as `completed`,",
            "SUM(IF(status = 'pending', 1, 0)) as `pending`,",
            "SUM(IF(status = 'overdue', 1, 0)) as `overdue`,",
            // 按旧的 type 统计（兼容）
            "SUM(IF(type = 'checkin_exercise', 1, 0)) as `checkin_exercise`,",
            "SUM(IF(type = 'checkin_meal', 1, 0)) as `checkin_meal`,",
            "SUM(IF(type = 'checkin_sleep', 1, 0)) as `checkin_sleep`,",
            "SUM(IF(type = 'custom', 1, 0)) as `custom_count`,",
            "SUM(IF(type = 'ai_suggested', 1, 0)) as `ai_suggested`,",
            // 按优先级统计
            "SUM(IF(priority = 'high', 1, 0)) as `high_p`,",
            "SUM(IF(priority = 'medium', 1, 0)) as `medium_p`,",
            "SUM(IF(priority = 'low', 1, 0)) as `low_p`",
            `FROM tasks ${whereClause}`
        ].join(" ");

        const [rows] = await pool.query(query, queryParams) as any;
        console.log("📊 Task Statistics Query Result:", rows);
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
                high: stats.high_p || 0,
                medium: stats.medium_p || 0,
                low: stats.low_p || 0
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
        const [rows] = await pool.query(getQuery, [userId, checkinType, checkinDate]) as any;

        if (rows.length > 0) {
            return rows[0];
        }

        // 创建新记录
        const createQuery = `
      INSERT INTO checkin_records (user_id, checkin_type, checkin_date, completed)
      VALUES (?, ?, ?, FALSE)
    `;
        const [result] = await pool.query(createQuery, [userId, checkinType, checkinDate]) as any;

        return {
            id: result.insertId,
            user_id: userId,
            checkin_type: checkinType,
            checkin_date: checkinDate,
            completed: false,
            created_at: getCurrentDateTimeString(),
            updated_at: getCurrentDateTimeString()
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
        const [result] = await pool.query(query, [completed, recordId]) as any;
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
        const [result] = await pool.query(query) as any;
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

        const [rows] = await pool.query(query, queryParams) as any;
        return rows;
    }

    /**
     * 计算完成状态（提前/准时/迟到）
     */
    private static calculateCompletionStatus(dueDate: string, completionDate: string): string {
        // 处理日期格式 (YYYY-MM-DD) - 直接比较日期字符串，避免时区问题
        // 提取 YYYY-MM-DD 部分（如果包含时间）
        console.log(`📅 计算完成状态: dueDate = ${dueDate}, completionDate = ${completionDate}`);
        dueDate = getDateTimeString(new Date(new Date(dueDate).getTime() + (8) * 60 * 60 * 1000));
        const dueDateOnly = dueDate ? dueDate.split('T')[0] : null;
        const completionDateOnly = completionDate ? completionDate.split('T')[0] : null;
        console.log(dueDate,dueDateOnly,completionDate,completionDateOnly,"zby")

        if (!dueDateOnly || !completionDateOnly) {
            return 'on_time'; // 如果没有到期日期，认为准时完成
        }

        // 直接比较日期字符串（YYYY-MM-DD 格式自然排序就是时间顺序）
        if (completionDateOnly < dueDateOnly) {
            return 'early';
        } else if (completionDateOnly === dueDateOnly) {
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

        const [rows] = await pool.query(query, queryParams) as any;
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

        const [rows] = await pool.query(query, [userId, checkinType, date, date]) as any;
        return rows[0] || null;
    }
}
