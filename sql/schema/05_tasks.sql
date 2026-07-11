-- ============================================================
-- Schema 05: TodoList 与任务系统
-- 表: tasks, task_completion_records, task_statistics
-- ============================================================

-- ── tasks: 任务/TodoList ──
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `title` VARCHAR(255) NOT NULL COMMENT '任务标题',
  `description` TEXT COMMENT '任务描述',
  `type` VARCHAR(50) DEFAULT 'custom' COMMENT '任务类型: checkin_exercise/checkin_meal/checkin_sleep/custom',
  `category` VARCHAR(50) DEFAULT NULL COMMENT '分类: health/study/work/life',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending/completed/cancelled',
  `priority` VARCHAR(20) DEFAULT 'medium' COMMENT '优先级: high/medium/low',
  `due_date` DATE DEFAULT NULL COMMENT '截止日期',
  `is_daily` TINYINT(1) DEFAULT 0 COMMENT '是否每日任务',
  `recurrence` VARCHAR(50) DEFAULT NULL COMMENT '重复规则: daily/weekly/monthly/custom',
  `checkin_preset` VARCHAR(50) DEFAULT NULL COMMENT '关联的打卡预设',
  `ai_suggestion` TEXT COMMENT 'AI 建议内容',
  `ai_suggestion_id` BIGINT DEFAULT NULL COMMENT 'AI 建议消息ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_due_date` (`due_date`),
  CONSTRAINT `fk_task_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TodoList 任务';

-- ── task_completion_records: 任务完成历史 ──
DROP TABLE IF EXISTS `task_completion_records`;
CREATE TABLE `task_completion_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT NOT NULL COMMENT '关联 tasks.id',
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `completed_date` DATE NOT NULL COMMENT '完成日期',
  `completed_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '完成时间',
  `task_type` VARCHAR(50) DEFAULT NULL COMMENT '任务类型（冗余，加速查询）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_date` (`user_id`, `completed_date`),
  KEY `idx_completed_date` (`completed_date`),
  CONSTRAINT `fk_completion_task` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_completion_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务完成记录';

-- ── task_statistics: 任务统计数据缓存 ──
DROP TABLE IF EXISTS `task_statistics`;
CREATE TABLE `task_statistics` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `total_tasks` INT DEFAULT 0 COMMENT '总任务数',
  `completed_tasks` INT DEFAULT 0 COMMENT '已完成数',
  `completion_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '完成率(%)',
  `streak_days` INT DEFAULT 0 COMMENT '连续完成天数',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `stat_date`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务统计缓存';

