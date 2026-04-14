/**
 * TodoList 业务逻辑层
 */

import { TodoListDAL } from './todoListDAL.js';
import { getCurrentDateString, getDateString } from '../util/dateTime.js';
import type {
  Task,
  TaskStatistics,
  CheckinType,
  TaskType,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQueryParams,
  SyncCheckinRequest,
  AISuggestionsRequest
} from '../types/todolist.js';

export class TodoListService {
  /**
   * 创建任务
   */
  static async createTask(userId: number, taskData: CreateTaskRequest): Promise<Task> {
    // 验证输入
    if (!taskData.title || taskData.title.trim().length === 0) {
      throw new Error('任务标题不能为空');
    }

    if (taskData.title.length > 100) {
      throw new Error('任务标题长度不能超过 100 个字符');
    }

    if (taskData.description && taskData.description.length > 500) {
      throw new Error('任务描述长度不能超过 500 个字符');
    }

    // 验证日期格式
    if (!this.isValidDate(taskData.due_date)) {
      taskData.due_date = getCurrentDateString();
    }

    if (taskData.due_time && !this.isValidTime(taskData.due_time)) {
      taskData.due_time = '00:00';
    }

    return TodoListDAL.createTask(userId, taskData);
  }

  /**
   * 获取用户任务列表
   */
  static async getUserTasks(userId: number, params: TaskQueryParams): Promise<{ tasks: Task[]; total: number }> {
    console.log('📝 [TodoListService.getUserTasks] 接收参数:', { userId, params });
    const result = await TodoListDAL.getUserTasks(userId, params);
    console.log(`✅ [TodoListService.getUserTasks] 返回 ${result.tasks.length} 条任务`);
    return result;
  }

  /**
   * 获取指定日期的任务（用于月度视图）
   */
  static async getTasksByDate(userId: number, dateStr: string): Promise<Task[]> {
    console.log(`📝 [TodoListService.getTasksByDate] 接收参数: userId=${userId}, dateStr=${dateStr}`);
    const tasks = await TodoListDAL.getUserCertainDayTasks(userId, dateStr);
    console.log(`✅ [TodoListService.getTasksByDate] 返回 ${tasks.length} 条任务`);
    return tasks;
  }

  /**
   * 获取任务详情
   */
  static async getTask(userId: number, taskId: number): Promise<Task | null> {
    return TodoListDAL.getTaskById(userId, taskId);
  }

  /**
   * 更新任务
   */
  static async updateTask(userId: number, taskId: number, updateData: UpdateTaskRequest): Promise<Task | null> {
    const task = await TodoListDAL.getTaskById(userId, taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    // 验证输入
    if (updateData.title && updateData.title.length > 100) {
      throw new Error('任务标题长度不能超过 100 个字符');
    }

    if (updateData.description && updateData.description.length > 500) {
      throw new Error('任务描述长度不能超过 500 个字符');
    }

    if (updateData.due_date && !this.isValidDate(updateData.due_date)) {
      updateData.due_date = getCurrentDateString();
    }

    if (updateData.due_time && !this.isValidTime(updateData.due_time)) {
      updateData.due_time = '00:00';
    }

    return TodoListDAL.updateTask(userId, taskId, updateData);
  }

  /**
   * 删除任务
   */
  static async deleteTask(userId: number, taskId: number): Promise<boolean> {
    const task = await TodoListDAL.getTaskById(userId, taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    return TodoListDAL.deleteTask(userId, taskId);
  }

  /**
   * 标记任务为完成
   */
  static async completeTask(userId: number, taskId: number, completedDate?: string): Promise<Task | null> {
    const task = await TodoListDAL.getTaskById(userId, taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    const actualDate = completedDate || getCurrentDateString();
    const dateType = (task as any).date_type || 'tomorrow';

    // 对于"tomorrow"类型任务：检查是否已完成
    // 对于循环任务（everyday/workday/weekend）：检查今天是否已完成过
    if (dateType === 'tomorrow') {
      if (task.status === 'completed') {
        throw new Error('任务已完成');
      }
    } else {
      // 循环任务：检查 completed_date 是否为今天
      if (task.completed_date) {
        let completedDateOnly = '';
        const completedDateValue = task.completed_date as any;
        if (typeof completedDateValue === 'string') {
          completedDateOnly = completedDateValue.split('T')[0];
        } else {
          // 如果是其他类型（比如 Date 对象），转换为字符串
          completedDateOnly = getDateString(new Date(completedDateValue));
        }
        if (completedDateOnly === actualDate) {
          throw new Error('今天已完成过此循环任务');
        }
      }
    }

    if (completedDate && !this.isValidDate(completedDate)) {
      throw new Error('完成日期格式错误，应为 YYYY-MM-DD');
    }

    await TodoListDAL.completeTask(userId, taskId, completedDate);
    return TodoListDAL.getTaskById(userId, taskId);
  }

  /**
   * 标记任务为未完成
   */
  static async uncompleteTask(userId: number, taskId: number): Promise<Task | null> {
    const task = await TodoListDAL.getTaskById(userId, taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status === 'pending') {
      throw new Error('任务已是待完成状态');
    }

    await TodoListDAL.uncompleteTask(userId, taskId);
    return TodoListDAL.getTaskById(userId, taskId);
  }

  /**
   * 获取任务统计信息
   */
  static async getTaskStatistics(userId: number, date?: string): Promise<TaskStatistics> {
    if (date && !this.isValidDate(date)) {
      throw new Error('日期格式错误，应为 YYYY-MM-DD');
    }

    return TodoListDAL.getTaskStatistics(userId, date);
  }

  /**
   * 同步打卡
   */
  static async syncCheckin(userId: number, data: SyncCheckinRequest): Promise<Task | null> {
    const checkinDate = data.checkin_date || getCurrentDateString();

    if (!this.isValidDate(checkinDate)) {
      throw new Error('打卡日期格式错误，应为 YYYY-MM-DD');
    }

    const checkinType = data.type;
    const isCompleted = data.completed;

    // 获取或创建打卡记录
    const checkinRecord = await TodoListDAL.getOrCreateCheckinRecord(userId, checkinType, checkinDate);

    // 获取对应的任务
    let task = await TodoListDAL.getCheckinTaskByTypeAndDate(userId, checkinType, checkinDate);

    if (isCompleted) {
      // 标记打卡为已完成
      await TodoListDAL.updateCheckinRecord(checkinRecord.id, true);

      // 如果任务不存在，创建新任务并标记为已完成
      if (!task) {
        const newTaskData: CreateTaskRequest = {
          title: `${this.getCheckinTitle(checkinType)}打卡`,
          type: `checkin_${checkinType}` as TaskType,
          priority: 'medium' as any,
          due_date: checkinDate,
          is_daily: true,
          category_icon: this.getCheckinIcon(checkinType),
          checkin_type: checkinType,
          checkin_recurrence: 'everyday' as any
        };

        task = await TodoListDAL.createTask(userId, newTaskData);
        await TodoListDAL.completeTask(userId, task.id, checkinDate);
        task = await TodoListDAL.getTaskById(userId, task.id);
      } else if (task.status !== 'completed') {
        // 如果任务存在但未完成，标记为已完成
        await TodoListDAL.completeTask(userId, task.id, checkinDate);
        task = await TodoListDAL.getTaskById(userId, task.id);
      }
    } else {
      // 标记打卡为未完成
      await TodoListDAL.updateCheckinRecord(checkinRecord.id, false);

      // 如果任务存在，删除该任务
      if (task) {
        await TodoListDAL.deleteTask(userId, task.id);
        task = null;
      }
    }

    return task;
  }

  /**
   * 生成 AI 建议（模拟实现）
   */
  static async generateAISuggestions(userId: number, request?: AISuggestionsRequest): Promise<Task[]> {
    // 这里是模拟实现，实际应该调用 OpenAI API
    // 获取用户的打卡情况和历史数据
    const checkinTasks = await TodoListDAL.getCheckinTasks(userId);
    const currentDate = getCurrentDateString();

    const suggestions: CreateTaskRequest[] = [];

    // 示例建议 1：运动建议
    if (checkinTasks.filter(t => t.checkin_type === 'exercise').length === 0) {
      suggestions.push({
        title: '午间散步 30 分钟',
        description: '离开办公室进行短暂散步，提高工作效率和身体活动量',
        type: 'ai_suggested' as TaskType,
        priority: 'medium' as any,
        due_date: currentDate,
        category_icon: '🚶',
        ai_prompt: '根据你的运动目标，建议每天进行中等强度活动'
      });
    }

    // 示例建议 2：饮食建议
    if (checkinTasks.filter(t => t.checkin_type === 'meal').length === 0) {
      suggestions.push({
        title: '晚餐摄入更多蛋白质',
        description: '增加蛋白质摄入以支持肌肉增长和恢复',
        type: 'ai_suggested' as TaskType,
        priority: 'low' as any,
        due_date: currentDate,
        category_icon: '🥗',
        ai_prompt: '结合你的健身计划，蛋白质摄入很重要'
      });
    }

    // 示例建议 3：睡眠建议
    if (checkinTasks.filter(t => t.checkin_type === 'sleep').length === 0) {
      suggestions.push({
        title: '早睡早起，保证 8 小时睡眠',
        description: '规律的睡眠时间有助于身体恢复和工作效率',
        type: 'ai_suggested' as TaskType,
        priority: 'high' as any,
        due_date: currentDate,
        category_icon: '😴',
        ai_prompt: '充足的睡眠对健康至关重要'
      });
    }

    // 创建建议任务
    const createdSuggestions: Task[] = [];
    for (const suggestion of suggestions) {
      const task = await TodoListDAL.createTask(userId, suggestion);
      createdSuggestions.push(task);
    }

    return createdSuggestions;
  }

  /**
   * 接受 AI 建议（将任务类型改为 custom）
   */
  static async acceptSuggestion(userId: number, taskId: number): Promise<Task | null> {
    const task = await TodoListDAL.getTaskById(userId, taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.type !== 'ai_suggested') {
      throw new Error('该任务不是 AI 建议任务');
    }

    return TodoListDAL.updateTask(userId, taskId, { category_icon: task.category_icon || '✏️' });
  }

  /**
   * 驳回 AI 建议
   */
  static async rejectSuggestion(userId: number, taskId: number): Promise<boolean> {
    const task = await TodoListDAL.getTaskById(userId, taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.type !== 'ai_suggested') {
      throw new Error('该任务不是 AI 建议任务');
    }

    return TodoListDAL.deleteTask(userId, taskId);
  }

  /**
   * 检查并更新逾期任务
   */
  static async checkAndUpdateOverdueTasks(): Promise<number> {
    return TodoListDAL.updateOverdueTasks();
  }

  // =====================================================
  // 辅助方法
  // =====================================================

  private static isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private static isValidTime(timeString: string): boolean {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeString);
  }

  private static getCheckinTitle(checkinType: CheckinType): string {
    switch (checkinType) {
      case 'exercise':
        return '运动';
      case 'meal':
        return '饮食';
      case 'sleep':
        return '睡眠';
      default:
        return '打卡';
    }
  }

  private static getCheckinIcon(checkinType: CheckinType): string {
    switch (checkinType) {
      case 'exercise':
        return '🏃';
      case 'meal':
        return '🍽️';
      case 'sleep':
        return '😴';
      default:
        return '✅';
    }
  }
}
