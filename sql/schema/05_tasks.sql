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
  `status` ENUM('pending','completed','overdue') NOT NULL DEFAULT 'pending' COMMENT '状态',
  `priority` ENUM('high','medium','low') NOT NULL DEFAULT 'medium' COMMENT '优先级',
  `due_date` DATE NOT NULL COMMENT '截止日期',
  `due_time` TIME DEFAULT NULL COMMENT '截止时间',
  `is_daily` TINYINT(1) DEFAULT 0 COMMENT '是否每日任务',
  `completed_date` DATE DEFAULT NULL COMMENT '完成日期',
  `category_icon` VARCHAR(10) DEFAULT NULL COMMENT '分类图标 Emoji',
  `ai_suggestion_reason` TEXT COMMENT 'AI 建议理由',
  `checkin_type` ENUM('exercise','meal','sleep') DEFAULT NULL COMMENT '打卡类型',
  `checkin_recurrence` ENUM('tomorrow','everyday','workday','weekend') DEFAULT NULL COMMENT '打卡重复规律',
  `checkin_preset` VARCHAR(50) DEFAULT NULL COMMENT '关联的打卡预设',
  `preset_type` VARCHAR(50) DEFAULT NULL COMMENT '预设类型',
  `date_type` ENUM('tomorrow','workday','weekend','everyday') DEFAULT 'tomorrow' COMMENT '日期类型',
  `ai_prompt` TEXT COMMENT 'AI 提示词',
  `ai_suggestion` TEXT COMMENT 'AI 建议内容',
  `ai_suggestion_id` BIGINT DEFAULT NULL COMMENT 'AI 建议消息ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_user_due_date` (`user_id`, `due_date`),
  KEY `idx_user_type` (`user_id`, `type`),
  CONSTRAINT `fk_task_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TodoList 任务';

-- ── task_completion_records: 任务完成历史 ──
DROP TABLE IF EXISTS `task_completion_records`;
CREATE TABLE `task_completion_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `task_id` BIGINT NOT NULL COMMENT '关联 tasks.id',
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `task_title` VARCHAR(255) DEFAULT NULL COMMENT '任务标题（冗余）',
  `task_type` VARCHAR(50) DEFAULT NULL COMMENT '任务类型（冗余）',
  `task_priority` VARCHAR(20) DEFAULT NULL COMMENT '任务优先级（冗余）',
  `category` VARCHAR(50) DEFAULT NULL COMMENT '分类',
  `completion_date` DATE NOT NULL COMMENT '完成日期',
  `completion_time` TIME DEFAULT NULL COMMENT '完成时间',
  `completion_status` VARCHAR(20) DEFAULT 'completed' COMMENT '完成状态',
  `due_date` DATE DEFAULT NULL COMMENT '原截止日期（冗余）',
  `category_icon` VARCHAR(10) DEFAULT NULL COMMENT '分类图标（冗余）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_date` (`user_id`, `completion_date`),
  KEY `idx_completion_date` (`completion_date`),
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
