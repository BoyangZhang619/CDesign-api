/**
 * 健康画像相关的 TypeScript 类型定义
 */

// ============ API 请求/响应类型 ============

/**
 * 健康画像数据（API 响应）
 */
export interface PortraitData {
  // 三大维度评分
  exerciseScore: number;      // 0-100，运动评分
  mealScore: number;          // 0-100，饮食评分
  sleepScore: number;         // 0-100，睡眠评分
  
  // 身体指标
  bmi: number;                // 浮点数，体质指数
  bmiStatus: BMIStatus;       // BMI 状态
  cardioLevel: string;        // 心肺功能等级描述
  cardioStatus: CardioStatus; // 心肺功能状态
  metabolism: number;         // 0-100，代谢指数
  metabolismStatus: MetabolismStatus; // 代谢状态
  sleepQuality: string;       // 睡眠质量描述
  sleepQualityStatus: SleepQualityStatus; // 睡眠质量状态
  
  // 雷达图数据
  radarData?: RadarData;
  
  // 个性化建议
  recommendations: Recommendation[];
  
  // 进度时间轴
  timeline: TimelineEvent[];
}

/**
 * 雷达图数据
 */
export interface RadarData {
  exercise: number;           // 0-100，运动
  meal: number;               // 0-100，饮食
  sleep: number;              // 0-100，睡眠
  cardio: number;             // 0-100，心肺功能
  metabolism: number;         // 0-100，代谢指数
  stressManagement: number;   // 0-100，压力管理
}

/**
 * 个性化建议
 */
export interface Recommendation {
  icon: string;               // Emoji 字符
  title: string;              // 建议标题
  description: string;        // 详细描述
  priority: Priority;         // 优先级
  sourceType?: string;        // 建议来源（如 'exercise', 'meal', 'sleep' 等）
}

/**
 * 进度时间轴事件
 */
export interface TimelineEvent {
  date: string;               // 日期字符串（如 "2024年3月"）
  title: string;              // 事件标题
  description: string;        // 事件描述
  status: TimelineStatus;     // 事件状态
  eventType?: string;         // 事件类型
}

// ============ 枚举类型 ============

/**
 * BMI 状态
 */
export type BMIStatus = 'underweight' | 'normal' | 'overweight' | 'obese';

/**
 * 心肺功能状态
 */
export type CardioStatus = 'excellent' | 'good' | 'normal' | 'poor';

/**
 * 代谢状态
 */
export type MetabolismStatus = 'high' | 'normal' | 'low';

/**
 * 睡眠质量状态
 */
export type SleepQualityStatus = 'excellent' | 'good' | 'normal' | 'poor';

/**
 * 建议优先级
 */
export type Priority = 'high' | 'medium' | 'low';

/**
 * 时间轴事件状态
 */
export type TimelineStatus = 'completed' | 'in-progress' | 'pending';

/**
 * 事件类型
 */
export type TimelineEventType = 
  | 'profile_init'       // 档案初始化
  | 'exercise_milestone' // 运动里程碑
  | 'meal_milestone'     // 饮食里程碑
  | 'sleep_milestone'    // 睡眠里程碑
  | 'overall_achievement'// 综合成就
  | 'streak'             // 连续打卡
  | 'custom';            // 自定义事件

// ============ 数据库模型 ============

/**
 * 健康画像数据库记录
 */
export interface PortraitRecord {
  id: number;
  userId: number;
  exerciseScore: number;
  mealScore: number;
  sleepScore: number;
  overallScore: number;
  bmi: number;
  bmiStatus: BMIStatus;
  cardioLevel: string;
  cardioStatus: CardioStatus;
  metabolism: number;
  metabolismStatus: MetabolismStatus;
  sleepQuality: string;
  sleepQualityStatus: SleepQualityStatus;
  radarData: RadarData | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 健康建议数据库记录
 */
export interface RecommendationRecord {
  id: number;
  userId: number;
  icon: string;
  title: string;
  description: string;
  priority: Priority;
  sourceType?: string;
  sourceScore?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 时间轴事件数据库记录
 */
export interface TimelineRecord {
  id: number;
  userId: number;
  eventDate: Date;
  title: string;
  description: string;
  status: TimelineStatus;
  eventType?: TimelineEventType;
  relatedScoreType?: string;
  relatedScoreValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 健康档案设置状态数据库记录
 */
export interface HealthProfileSetupRecord {
  id: number;
  userId: number;
  isCompleted: boolean;
  completedAt: Date | null;
  basicInfoCompleted: boolean;
  healthExamCompleted: boolean;
  healthGoalsCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============ API 响应包装类型 ============

/**
 * 标准 API 响应
 */
export interface ApiResponse<T> {
  code: number;
  msg: string;
  success: boolean;
  data?: T;
}

/**
 * 健康档案完成状态响应
 */
export interface SetupStatusResponse {
  completed: boolean;
  lastUpdated?: string;
}

/**
 * 历史画像数据响应
 */
export interface HistoryPortraitResponse {
  date: string;
  exerciseScore: number;
  mealScore: number;
  sleepScore: number;
  bmi: number;
  [key: string]: any;
}
