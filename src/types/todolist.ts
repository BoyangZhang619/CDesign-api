/**
 * TodoList 类型定义
 */

// =====================================================
// 枚举类型
// =====================================================

export enum TaskType {
  CHECKIN_EXERCISE = 'checkin_exercise',
  CHECKIN_MEAL = 'checkin_meal',
  CHECKIN_SLEEP = 'checkin_sleep',
  CUSTOM = 'custom',
  AI_SUGGESTED = 'ai_suggested'
}

export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  OVERDUE = 'overdue'
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum CheckinType {
  EXERCISE = 'exercise',
  MEAL = 'meal',
  SLEEP = 'sleep'
}

export enum CheckinRecurrence {
  TOMORROW = 'tomorrow',
  EVERYDAY = 'everyday',
  WORKDAY = 'workday',
  WEEKEND = 'weekend'
}

export enum CompletionStatus {
  ON_TIME = 'on_time',
  LATE = 'late',
  EARLY = 'early'
}

// =====================================================
// 接口类型
// =====================================================

/**
 * Task 对象 - 任务表
 */
export interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  type: TaskType;
  category?: 'diet' | 'exercise' | 'sleep' | 'custom'; // 新增：任务类别
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string; // YYYY-MM-DD
  due_time?: string; // HH:mm
  is_daily: boolean;
  completed_date?: string; // YYYY-MM-DD
  category_icon?: string;
  ai_suggestion_reason?: string;
  checkin_type?: CheckinType;
  checkin_recurrence?: CheckinRecurrence;
  checkin_preset?: string;
  preset_type?: string; // 新增：预设类型
  date_type?: CheckinRecurrence; // 新增：日期类型
  ai_prompt?: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * TaskCompletionRecord 对象 - 任务完成记录表
 */
export interface TaskCompletionRecord {
  id: number;
  user_id: number;
  task_id?: number;
  task_title: string;
  task_type: TaskType;
  category?: 'diet' | 'exercise' | 'sleep' | 'custom'; // 新增：任务类别
  preset_type?: string; // 新增：预设类型
  task_priority: TaskPriority;
  completion_date: string; // YYYY-MM-DD
  completion_time: string; // ISO 8601
  due_date?: string; // YYYY-MM-DD
  category_icon?: string;
  completion_status: CompletionStatus;
  created_at: string; // ISO 8601
}

/**
 * CheckinRecord 对象 - 打卡记录表
 */
export interface CheckinRecord {
  id: number;
  user_id: number;
  checkin_type: CheckinType;
  checkin_date: string; // YYYY-MM-DD
  completed: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * TaskStatistics 对象 - 任务统计信息
 */
export interface TaskStatistics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completion_rate: number; // 0-100
  byType: {
    checkin_exercise: number;
    checkin_meal: number;
    checkin_sleep: number;
    custom: number;
    ai_suggested: number;
  };
  byCategory?: {
    diet: number;
    exercise: number;
    sleep: number;
    custom: number;
  };
  byCategoryCompleted?: {
    diet_completed: number;
    exercise_completed: number;
    sleep_completed: number;
    preset_completed: number;
  };
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * FilterOptions 对象 - 筛选选项
 */
export interface FilterOptions {
  status?: TaskStatus;
  dateRange?: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
  type?: TaskType;
  priority?: TaskPriority;
  search?: string;
}

/**
 * CreateTaskRequest 对象 - 创建任务请求
 */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  type: TaskType;
  category?: 'diet' | 'exercise' | 'sleep' | 'custom'; // 新增：任务类别
  priority: TaskPriority;
  due_date: string;
  due_time?: string;
  is_daily?: boolean;
  category_icon?: string;
  checkin_type?: CheckinType;
  checkin_recurrence?: CheckinRecurrence;
  checkin_preset?: string;
  preset_type?: string; // 新增：预设类型
  date_type?: CheckinRecurrence; // 新增：日期类型
  ai_prompt?: string;
}

/**
 * UpdateTaskRequest 对象 - 更新任务请求
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
  due_time?: string;
  is_daily?: boolean;
  category_icon?: string;
  checkin_preset?: string;
}

/**
 * CompleteTaskRequest 对象 - 完成任务请求
 */
export interface CompleteTaskRequest {
  completed_date?: string; // YYYY-MM-DD, 默认为当前日期
}

/**
 * SyncCheckinRequest 对象 - 同步打卡请求
 */
export interface SyncCheckinRequest {
  type: CheckinType;
  completed: boolean;
  checkin_date?: string; // YYYY-MM-DD, 默认为当前日期
}

/**
 * AI 建议请求
 */
export interface AISuggestionsRequest {
  userProfile?: {
    age?: number;
    healthGoals?: string[];
    workType?: string;
  };
}

/**
 * 分页请求
 */
export interface PaginationRequest {
  page?: number;
  limit?: number;
}

/**
 * 任务查询参数
 */
export interface TaskQueryParams extends PaginationRequest {
  date?: string; // YYYY-MM-DD
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  search?: string;
}

/**
 * API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
