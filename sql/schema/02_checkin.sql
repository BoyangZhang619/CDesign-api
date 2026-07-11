-- ============================================================
-- Schema 02: 打卡系统 (V2)
-- 表: daily_checkin, checkin_meal_record, checkin_exercise_record,
--     checkin_sleep_record, checkin_records, checkin_ai_summary
-- ============================================================

-- ── daily_checkin: 每日打卡中枢表 ──
DROP TABLE IF EXISTS `daily_checkin`;
CREATE TABLE `daily_checkin` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `checkin_date` DATE NOT NULL COMMENT '打卡日期',
  `total_calories_intake` DECIMAL(10,2) DEFAULT NULL COMMENT '当日总摄入热量(kcal)',
  `total_calories_burned` DECIMAL(10,2) DEFAULT NULL COMMENT '当日总消耗热量(kcal)',
  `water_intake_ml` INT DEFAULT NULL COMMENT '饮水量(ml)',
  `exercise_duration_min` INT DEFAULT NULL COMMENT '运动总时长(分钟)',
  `sleep_start_time` DATETIME DEFAULT NULL COMMENT '入睡时间',
  `sleep_duration_hours` DECIMAL(4,2) DEFAULT NULL COMMENT '睡眠时长(小时)',
  `body_weight_kg` DECIMAL(5,2) DEFAULT NULL COMMENT '当日体重(kg)',
  `energy_level` INT DEFAULT NULL COMMENT '精力水平 1-5 或 1-10',
  `habit_tags` JSON DEFAULT NULL COMMENT '习惯标签 JSON',
  `note` VARCHAR(500) DEFAULT NULL COMMENT '用户备注',
  `completion_rate` DECIMAL(5,2) DEFAULT NULL COMMENT '当日打卡完成率(%)',
  `ai_analysis_summary` VARCHAR(500) DEFAULT NULL COMMENT 'AI 综合分析摘要',
  `breakfast` TEXT DEFAULT NULL COMMENT '早餐内容',
  `lunch` TEXT DEFAULT NULL COMMENT '午餐内容',
  `dinner` TEXT DEFAULT NULL COMMENT '晚餐内容',
  `midnight_snack` TEXT DEFAULT NULL COMMENT '夜宵内容',
  `mood` TINYINT DEFAULT NULL COMMENT '心情 1-5',
  `mood_level` TINYINT DEFAULT NULL COMMENT '心情等级 1-5',
  `sleep_quality` TINYINT DEFAULT NULL COMMENT '睡眠质量 1-5',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `checkin_date`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_checkin_date` (`checkin_date`),
  CONSTRAINT `fk_daily_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日打卡中枢表';

-- ── checkin_meal_record: 饮食打卡记录 ──
DROP TABLE IF EXISTS `checkin_meal_record`;
CREATE TABLE `checkin_meal_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `daily_checkin_id` BIGINT NOT NULL COMMENT '关联 daily_checkin.id',
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `meal_type` VARCHAR(32) DEFAULT NULL COMMENT '餐段: breakfast/lunch/dinner/snack',
  `food_source` VARCHAR(32) DEFAULT NULL COMMENT '来源: canteen/takeout/dormitory/other',
  `food_name` VARCHAR(128) DEFAULT NULL COMMENT '食物名称',
  `food_detail` VARCHAR(500) DEFAULT NULL COMMENT '食物详情 JSON',
  `calories` DECIMAL(10,2) DEFAULT NULL COMMENT '热量(kcal)',
  `protein_g` DECIMAL(10,2) DEFAULT NULL COMMENT '蛋白质(g)',
  `fat_g` DECIMAL(10,2) DEFAULT NULL COMMENT '脂肪(g)',
  `carbohydrate_g` DECIMAL(10,2) DEFAULT NULL COMMENT '碳水(g)',
  `fiber_g` DECIMAL(10,2) DEFAULT NULL COMMENT '膳食纤维(g)',
  `sugar_g` DECIMAL(10,2) DEFAULT NULL COMMENT '糖(g)',
  `meal_time` DATETIME DEFAULT NULL COMMENT '用餐时间',
  `ai_recognition_flag` TINYINT DEFAULT NULL COMMENT '是否AI识别',
  `image_id` BIGINT DEFAULT NULL COMMENT '关联的食物图片ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_daily_checkin_id` (`daily_checkin_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_meal_daily` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_meal_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='饮食打卡记录';

-- ── checkin_exercise_record: 运动打卡记录 ──
DROP TABLE IF EXISTS `checkin_exercise_record`;
CREATE TABLE `checkin_exercise_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `daily_checkin_id` BIGINT NOT NULL COMMENT '关联 daily_checkin.id',
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `activity_type` VARCHAR(64) DEFAULT NULL COMMENT '运动类型: running/swimming/gym/yoga/cycling/etc',
  `duration_min` INT DEFAULT NULL COMMENT '时长(分钟)',
  `intensity` VARCHAR(32) DEFAULT NULL COMMENT '强度: low/medium/high',
  `calories_burned` DECIMAL(10,2) DEFAULT NULL COMMENT '消耗热量(kcal, AI估算)',
  `start_time` DATETIME DEFAULT NULL COMMENT '开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
  `note` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `ai_recognition_flag` TINYINT DEFAULT NULL COMMENT '是否AI识别',
  `suggestion` TEXT COMMENT 'AI运动建议',
  `evaluation` TEXT COMMENT 'AI运动评价',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_daily_checkin_id` (`daily_checkin_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_exercise_daily` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exercise_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='运动打卡记录';

-- ── checkin_sleep_record: 睡眠打卡记录 ──
DROP TABLE IF EXISTS `checkin_sleep_record`;
CREATE TABLE `checkin_sleep_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `daily_checkin_id` BIGINT NOT NULL COMMENT '关联 daily_checkin.id',
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `sleep_start_time` DATETIME DEFAULT NULL COMMENT '入睡时间',
  `wake_up_time` DATETIME DEFAULT NULL COMMENT '醒来时间',
  `sleep_duration_hours` DECIMAL(4,2) DEFAULT NULL COMMENT '睡眠时长(小时)',
  `sleep_quality_score` INT DEFAULT NULL COMMENT 'AI 睡眠质量评分 0-100',
  `is_nap` TINYINT DEFAULT 0 COMMENT '是否为午睡 0=否 1=是',
  `wake_up_times` INT DEFAULT 0 COMMENT '醒来次数',
  `sleep_feeling` VARCHAR(255) DEFAULT NULL COMMENT '睡眠感受',
  `suggestion` TEXT COMMENT 'AI 睡眠建议',
  `evaluation` TEXT COMMENT 'AI 睡眠评价',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_daily_checkin_id` (`daily_checkin_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_sleep_daily` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sleep_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='睡眠打卡记录';

-- ── checkin_records: 任务关联的打卡记录（Todolist 使用） ──
DROP TABLE IF EXISTS `checkin_records`;
CREATE TABLE `checkin_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `checkin_type` ENUM('daily', 'meal', 'exercise', 'sleep') NOT NULL COMMENT '打卡类型',
  `subtype` VARCHAR(32) DEFAULT NULL COMMENT '子类型: breakfast/lunch/dinner/snack/night/nap/running/gym/...',
  `checkin_date` DATE NOT NULL COMMENT '打卡日期',
  `notes` TEXT COMMENT '用户备注',
  `completed` TINYINT(1) DEFAULT 0 COMMENT '是否完成（Todolist 使用）',
  `ai_summary_id` BIGINT DEFAULT NULL COMMENT 'AI 总结ID（预留）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`, `checkin_date`),
  KEY `idx_user_type` (`user_id`, `checkin_type`),
  CONSTRAINT `fk_checkin_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='打卡记录（Todolist 关联使用）';

-- ── checkin_ai_summary: AI 打卡分析总结 ──
DROP TABLE IF EXISTS `checkin_ai_summary`;
CREATE TABLE `checkin_ai_summary` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `daily_checkin_id` BIGINT DEFAULT NULL COMMENT '关联 daily_checkin.id',
  `total_ai_summary` TEXT COMMENT '当日综合 AI 总结',
  `meal_ai_summary` TEXT COMMENT '饮食 AI 总结',
  `exercise_ai_summary` TEXT COMMENT '运动 AI 总结',
  `sleep_ai_summary` TEXT COMMENT '睡眠 AI 总结',
  `is_meal_summary_updated` TINYINT(1) DEFAULT 0 COMMENT '饮食总结是否需要更新',
  `is_exercise_summary_updated` TINYINT(1) DEFAULT 0 COMMENT '运动总结是否需要更新',
  `is_sleep_summary_updated` TINYINT(1) DEFAULT 0 COMMENT '睡眠总结是否需要更新',
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_daily_checkin` (`daily_checkin_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_ai_summary_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_summary_daily` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AI 打卡分析总结';

