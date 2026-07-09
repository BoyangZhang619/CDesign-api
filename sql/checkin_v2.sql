-- ============================================================
-- 打卡系统 V2 — 3NF 规范化设计
-- 替代旧表: checkin_meal_record, checkin_exercise_record,
--            checkin_sleep_record, checkin_records, daily_checkin
-- ============================================================

-- 1. 打卡主记录表
DROP TABLE IF EXISTS `checkin_records`;
CREATE TABLE `checkin_records` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `checkin_type`  ENUM('daily','meal','exercise','sleep') NOT NULL COMMENT '打卡大类',
  `subtype`       VARCHAR(32)  DEFAULT NULL COMMENT '子类型: breakfast/lunch/dinner/snack/night/nap/running/gym/...',
  `checkin_date`  DATE         NOT NULL COMMENT '打卡日期',
  `notes`         TEXT         DEFAULT NULL COMMENT '用户备注',
  `ai_summary_id` BIGINT       DEFAULT NULL COMMENT 'AI总结ID(预留)',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`checkin_date`),
  KEY `idx_user_type` (`user_id`,`checkin_type`),
  CONSTRAINT `fk_checkin_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打卡主记录表';

-- 2. 饮食打卡详情
DROP TABLE IF EXISTS `checkin_meal`;
CREATE TABLE `checkin_meal` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `record_id`     BIGINT       NOT NULL,
  `meal_period`   ENUM('breakfast','lunch','dinner','snack','late_night','other') NOT NULL DEFAULT 'other' COMMENT '餐段',
  `food_name`     VARCHAR(128) NOT NULL DEFAULT '' COMMENT '食物名称',
  `food_source`   ENUM('canteen','takeout','homemade','restaurant','other') DEFAULT 'other' COMMENT '来源',
  `calories`      DECIMAL(8,1) DEFAULT 0 COMMENT '热量(kcal)',
  `protein_g`     DECIMAL(6,1) DEFAULT 0,
  `fat_g`         DECIMAL(6,1) DEFAULT 0,
  `carb_g`        DECIMAL(6,1) DEFAULT 0,
  `fiber_g`       DECIMAL(6,1) DEFAULT 0,
  `sugar_g`       DECIMAL(6,1) DEFAULT 0,
  `water_ml`      INT          DEFAULT 0 COMMENT '饮水量(ml)',
  PRIMARY KEY (`id`),
  KEY `idx_record` (`record_id`),
  CONSTRAINT `fk_meal_record` FOREIGN KEY (`record_id`) REFERENCES `checkin_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饮食打卡详情';

-- 3. 运动打卡详情
DROP TABLE IF EXISTS `checkin_exercise`;
CREATE TABLE `checkin_exercise` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT,
  `record_id`       BIGINT       NOT NULL,
  `activity_type`   VARCHAR(32)  NOT NULL DEFAULT 'other' COMMENT 'running/swimming/gym/yoga/cycling/walking/basketball/football/badminton/climbing/other',
  `duration_min`    INT          DEFAULT 0 COMMENT '时长(分钟)',
  `intensity`       ENUM('light','medium','heavy','extreme') DEFAULT 'medium',
  `calories_burned` DECIMAL(8,1) DEFAULT 0,
  `distance_km`     DECIMAL(6,2) DEFAULT NULL COMMENT '距离(km)',
  `heart_rate_avg`  INT          DEFAULT NULL,
  `heart_rate_max`  INT          DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_record` (`record_id`),
  CONSTRAINT `fk_exercise_record` FOREIGN KEY (`record_id`) REFERENCES `checkin_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运动打卡详情';

-- 4. 睡眠打卡详情
DROP TABLE IF EXISTS `checkin_sleep`;
CREATE TABLE `checkin_sleep` (
  `id`             BIGINT       NOT NULL AUTO_INCREMENT,
  `record_id`      BIGINT       NOT NULL,
  `sleep_type`     ENUM('night','nap','back_sleep','other') NOT NULL DEFAULT 'night' COMMENT 'night=晚间睡眠 nap=午觉 back_sleep=回笼觉',
  `start_time`     DATETIME     NOT NULL,
  `end_time`       DATETIME     NOT NULL,
  `duration_hours` DECIMAL(4,1) DEFAULT 0 COMMENT '时长(小时)',
  `quality`        TINYINT      DEFAULT 3 COMMENT '自评质量 1-5',
  `wake_count`     INT          DEFAULT 0 COMMENT '中途醒来次数',
  `dream_notes`    TEXT         DEFAULT NULL COMMENT '梦境记录',
  PRIMARY KEY (`id`),
  KEY `idx_record` (`record_id`),
  CONSTRAINT `fk_sleep_record` FOREIGN KEY (`record_id`) REFERENCES `checkin_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='睡眠打卡详情';

-- 5. 日常打卡详情
DROP TABLE IF EXISTS `checkin_daily`;
CREATE TABLE `checkin_daily` (
  `id`                BIGINT       NOT NULL AUTO_INCREMENT,
  `record_id`         BIGINT       NOT NULL,
  `activity_category` ENUM('study','work','leisure','social','rest','chores','exercise','other') DEFAULT 'other' COMMENT '活动分类',
  `mood`              TINYINT      DEFAULT NULL COMMENT '心情 1-5',
  `energy`            TINYINT      DEFAULT NULL COMMENT '精力 1-5',
  `description`       TEXT         DEFAULT NULL COMMENT '描述',
  `water_ml`          INT          DEFAULT 0 COMMENT '饮水(ml)',
  PRIMARY KEY (`id`),
  KEY `idx_record` (`record_id`),
  CONSTRAINT `fk_daily_record` FOREIGN KEY (`record_id`) REFERENCES `checkin_records`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日常打卡详情';

-- 6. AI 总结 (预留)
DROP TABLE IF EXISTS `checkin_ai_summary`;
CREATE TABLE `checkin_ai_summary` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT       NOT NULL,
  `record_id`    BIGINT       DEFAULT NULL,
  `summary_type` ENUM('daily','meal','exercise','sleep') NOT NULL,
  `ai_content`   TEXT         NOT NULL COMMENT 'AI生成内容',
  `generated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_record` (`record_id`),
  CONSTRAINT `fk_ai_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ai_record` FOREIGN KEY (`record_id`) REFERENCES `checkin_records`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI打卡总结(预留)';
