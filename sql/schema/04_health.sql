-- ============================================================
-- Schema 04: 健康画像与分析
-- 表: health_portrait, health_profile_setup, health_recommendations, health_timeline
-- ============================================================

-- ── health_portrait: 健康画像评分 ──
DROP TABLE IF EXISTS `health_portrait`;
CREATE TABLE `health_portrait` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `exercise_score` INT NOT NULL DEFAULT 0 COMMENT '运动评分 (0-100)',
  `meal_score` INT NOT NULL DEFAULT 0 COMMENT '饮食评分 (0-100)',
  `sleep_score` INT NOT NULL DEFAULT 0 COMMENT '睡眠评分 (0-100)',
  `overall_score` INT NOT NULL DEFAULT 0 COMMENT '综合评分 (0-100)',
  `bmi` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'BMI 指数',
  `bmi_status` VARCHAR(50) NOT NULL DEFAULT 'normal' COMMENT 'BMI 状态: underweight|normal|overweight|obese',
  `cardio_level` VARCHAR(100) NOT NULL DEFAULT '未评估' COMMENT '心肺功能描述',
  `cardio_status` VARCHAR(50) NOT NULL DEFAULT 'normal' COMMENT '心肺状态: excellent|good|normal|poor',
  `metabolism` INT NOT NULL DEFAULT 0 COMMENT '代谢评估 (0-100)',
  `metabolism_status` VARCHAR(50) NOT NULL DEFAULT 'normal' COMMENT '代谢状态: high|normal|low',
  `sleep_quality` VARCHAR(100) NOT NULL DEFAULT '未评估' COMMENT '睡眠质量描述',
  `sleep_quality_status` VARCHAR(50) NOT NULL DEFAULT 'normal' COMMENT '睡眠质量状态: excellent|good|normal|poor',
  `radar_data` JSON DEFAULT NULL COMMENT '雷达图数据: {exercise, meal, sleep, cardio, metabolism, stressManagement}',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康画像';

-- ── health_profile_setup: 健康档案引导状态 ──
DROP TABLE IF EXISTS `health_profile_setup`;
CREATE TABLE `health_profile_setup` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已完成全部引导',
  `completed_at` TIMESTAMP NULL DEFAULT NULL COMMENT '完成时间',
  `basic_info_completed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '基本信息是否完成',
  `health_exam_completed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '健康检查信息是否完成',
  `health_goals_completed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '健康目标设定是否完成',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康档案引导完成状态';

-- ── health_recommendations: 个性化健康建议 ──
DROP TABLE IF EXISTS `health_recommendations`;
CREATE TABLE `health_recommendations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `icon` VARCHAR(10) NOT NULL DEFAULT '💡' COMMENT 'Emoji 图标',
  `title` VARCHAR(100) NOT NULL COMMENT '建议标题',
  `description` TEXT NOT NULL COMMENT '建议详情',
  `priority` VARCHAR(50) NOT NULL DEFAULT 'medium' COMMENT '优先级: high|medium|low',
  `source_type` VARCHAR(50) DEFAULT NULL COMMENT '来源维度: exercise|meal|sleep|cardio|stress|water',
  `source_score` INT DEFAULT NULL COMMENT '相关维度评分',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='个性化健康建议';

-- ── health_timeline: 健康时间线 ──
DROP TABLE IF EXISTS `health_timeline`;
CREATE TABLE `health_timeline` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `event_date` DATE NOT NULL COMMENT '事件日期',
  `title` VARCHAR(100) NOT NULL COMMENT '事件标题',
  `description` TEXT NOT NULL COMMENT '事件描述',
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT '状态: completed|in_progress|pending',
  `event_type` VARCHAR(50) DEFAULT NULL COMMENT '事件类型: profile_init|exercise_milestone|meal_milestone|sleep_milestone|overall_achievement|streak|custom',
  `related_score_type` VARCHAR(50) DEFAULT NULL COMMENT '关联评分类型: exercise|meal|sleep|overall',
  `related_score_value` INT DEFAULT NULL COMMENT '关联评分值',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_event_date` (`event_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康时间线';

