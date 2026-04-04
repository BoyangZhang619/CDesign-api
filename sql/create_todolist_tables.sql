-- =====================================================
-- TodoList 任务管理系统数据库表结构
-- =====================================================

-- 1. 任务表（主表）
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `title` VARCHAR(100) NOT NULL COMMENT '任务标题',
  `description` TEXT COMMENT '任务描述',
  `type` ENUM('checkin_exercise', 'checkin_meal', 'checkin_sleep', 'custom', 'ai_suggested') NOT NULL DEFAULT 'custom' COMMENT '任务类型',
  `status` ENUM('pending', 'completed', 'overdue') NOT NULL DEFAULT 'pending' COMMENT '任务状态',
  `priority` ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium' COMMENT '优先级',
  `due_date` DATE NOT NULL COMMENT '截止日期',
  `due_time` TIME COMMENT '截止时间',
  `is_daily` BOOLEAN DEFAULT FALSE COMMENT '是否为日常任务',
  `completed_date` DATE COMMENT '完成日期',
  `category_icon` VARCHAR(10) COMMENT '分类图标（emoji）',
  `ai_suggestion_reason` TEXT COMMENT 'AI建议原因',
  `checkin_type` ENUM('exercise', 'meal', 'sleep') COMMENT '打卡类型',
  `checkin_recurrence` ENUM('tomorrow', 'everyday', 'workday', 'weekend') COMMENT '打卡重复方式',
  `checkin_preset` VARCHAR(50) COMMENT '打卡预设选项',
  `ai_prompt` TEXT COMMENT 'AI提示词',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_user_due_date` (`user_id`, `due_date`),
  KEY `idx_user_type` (`user_id`, `type`),
  KEY `idx_user_created_at` (`user_id`, `created_at`),
  KEY `idx_status_due_date` (`status`, `due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务表';

-- 2. 任务完成记录表（历史记录）
CREATE TABLE IF NOT EXISTS `task_completion_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `task_id` BIGINT UNSIGNED COMMENT '任务ID（可为NULL，用于删除的任务）',
  `task_title` VARCHAR(100) NOT NULL COMMENT '任务标题（快照）',
  `task_type` ENUM('checkin_exercise', 'checkin_meal', 'checkin_sleep', 'custom', 'ai_suggested') NOT NULL COMMENT '任务类型',
  `task_priority` ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium' COMMENT '优先级',
  `completion_date` DATE NOT NULL COMMENT '完成日期',
  `completion_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '完成时间',
  `due_date` DATE COMMENT '原始截止日期',
  `category_icon` VARCHAR(10) COMMENT '分类图标',
  `completion_status` ENUM('on_time', 'late', 'early') NOT NULL DEFAULT 'on_time' COMMENT '完成状态（准时/迟到/提前）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_completion_date` (`user_id`, `completion_date`),
  KEY `idx_user_task_type` (`user_id`, `task_type`),
  KEY `idx_completion_date` (`completion_date`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务完成记录表';

-- 3. 打卡记录表（用于同步打卡状态）
CREATE TABLE IF NOT EXISTS `checkin_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `checkin_type` ENUM('exercise', 'meal', 'sleep') NOT NULL COMMENT '打卡类型',
  `checkin_date` DATE NOT NULL COMMENT '打卡日期',
  `completed` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已完成',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_type_date` (`user_id`, `checkin_type`, `checkin_date`),
  KEY `idx_user_checkin_type` (`user_id`, `checkin_type`),
  KEY `idx_checkin_date` (`checkin_date`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡记录表';

-- 4. 任务统计表（用于快速查询统计信息，可选）
CREATE TABLE IF NOT EXISTS `task_statistics` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '统计ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `statistic_date` DATE NOT NULL COMMENT '统计日期',
  `total` INT UNSIGNED DEFAULT 0 COMMENT '总任务数',
  `completed` INT UNSIGNED DEFAULT 0 COMMENT '已完成数',
  `pending` INT UNSIGNED DEFAULT 0 COMMENT '待完成数',
  `overdue` INT UNSIGNED DEFAULT 0 COMMENT '逾期数',
  `completion_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '完成率',
  `checkin_exercise_count` INT UNSIGNED DEFAULT 0 COMMENT '运动打卡数',
  `checkin_meal_count` INT UNSIGNED DEFAULT 0 COMMENT '饮食打卡数',
  `checkin_sleep_count` INT UNSIGNED DEFAULT 0 COMMENT '睡眠打卡数',
  `custom_count` INT UNSIGNED DEFAULT 0 COMMENT '自定义任务数',
  `ai_suggested_count` INT UNSIGNED DEFAULT 0 COMMENT 'AI建议任务数',
  `high_priority_count` INT UNSIGNED DEFAULT 0 COMMENT '高优先级数',
  `medium_priority_count` INT UNSIGNED DEFAULT 0 COMMENT '中优先级数',
  `low_priority_count` INT UNSIGNED DEFAULT 0 COMMENT '低优先级数',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `statistic_date`),
  KEY `idx_user_date` (`user_id`, `statistic_date`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务统计表';

-- =====================================================
-- 初始化数据和视图
-- =====================================================

-- 创建视图：任务完成统计视图（按日期）
CREATE OR REPLACE VIEW v_task_completion_stats_by_date AS
SELECT 
  user_id,
  completion_date,
  COUNT(*) as total_completed,
  SUM(CASE WHEN completion_status = 'on_time' THEN 1 ELSE 0 END) as on_time_count,
  SUM(CASE WHEN completion_status = 'late' THEN 1 ELSE 0 END) as late_count,
  SUM(CASE WHEN completion_status = 'early' THEN 1 ELSE 0 END) as early_count,
  COUNT(DISTINCT task_type) as unique_task_types
FROM task_completion_records
GROUP BY user_id, completion_date;

-- 创建视图：任务完成统计视图（按类型）
CREATE OR REPLACE VIEW v_task_completion_stats_by_type AS
SELECT 
  user_id,
  task_type,
  COUNT(*) as total_completed,
  COUNT(DISTINCT DATE(completion_time)) as days_with_completion
FROM task_completion_records
GROUP BY user_id, task_type;
