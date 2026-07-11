-- ============================================================
-- Migration 002: 修复生产级结构疏漏
-- 基于代码审计确保 schema 与实际业务逻辑一致
-- ============================================================

-- ── 1. checkin_ai_summary: 修复列名和FK以匹配代码实际使用 ──
-- 代码使用 daily_checkin_id (非 record_id), 每类型独立列 (非 summary_type+ai_content)
ALTER TABLE `checkin_ai_summary`
  DROP FOREIGN KEY IF EXISTS `fk_ai_record`,
  DROP COLUMN IF EXISTS `record_id`,
  DROP COLUMN IF EXISTS `summary_type`,
  DROP COLUMN IF EXISTS `ai_content`,
  CHANGE COLUMN `daily_checkin_id` `daily_checkin_id` BIGINT DEFAULT NULL COMMENT '关联 daily_checkin.id',
  ADD COLUMN IF NOT EXISTS `total_ai_summary` TEXT COMMENT '当日综合 AI 总结' AFTER `daily_checkin_id`,
  ADD COLUMN IF NOT EXISTS `meal_ai_summary` TEXT COMMENT '饮食 AI 总结' AFTER `total_ai_summary`,
  ADD COLUMN IF NOT EXISTS `exercise_ai_summary` TEXT COMMENT '运动 AI 总结' AFTER `meal_ai_summary`,
  ADD COLUMN IF NOT EXISTS `sleep_ai_summary` TEXT COMMENT '睡眠 AI 总结' AFTER `exercise_ai_summary`,
  ADD COLUMN IF NOT EXISTS `is_meal_summary_updated` TINYINT(1) DEFAULT 0 AFTER `sleep_ai_summary`,
  ADD COLUMN IF NOT EXISTS `is_exercise_summary_updated` TINYINT(1) DEFAULT 0 AFTER `is_meal_summary_updated`,
  ADD COLUMN IF NOT EXISTS `is_sleep_summary_updated` TINYINT(1) DEFAULT 0 AFTER `is_exercise_summary_updated`,
  ADD UNIQUE INDEX IF NOT EXISTS `uk_daily_checkin` (`daily_checkin_id`),
  ADD CONSTRAINT `fk_ai_summary_daily` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin`(`id`) ON DELETE SET NULL;

-- ── 2. ai_chat_sessions: 删除重复的唯一索引 (uuid + uk_uuid 重复) ──
ALTER TABLE `ai_chat_sessions`
  DROP INDEX IF EXISTS `uuid`;

-- ── 3. daily_checkin: 修复数据类型 ──
ALTER TABLE `daily_checkin`
  MODIFY COLUMN `sleep_start_time` DATETIME NULL COMMENT '入睡时间',
  MODIFY COLUMN `mood` TINYINT NULL COMMENT '心情 1-5',
  MODIFY COLUMN `sleep_quality` TINYINT NULL COMMENT '睡眠质量 1-5';

-- ── 4. checkin_sleep_record: 修复 wake_up_times 类型 ──
ALTER TABLE `checkin_sleep_record`
  MODIFY COLUMN `wake_up_times` INT DEFAULT 0 COMMENT '醒来次数';

-- ── 5. 补充缺失的 updated_at ──
ALTER TABLE `character_avatar`
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

-- ── 6. 查询性能优化索引 ──
ALTER TABLE `checkin_meal_record`
  ADD INDEX IF NOT EXISTS `idx_user_created` (`user_id`, `created_at`);

ALTER TABLE `checkin_exercise_record`
  ADD INDEX IF NOT EXISTS `idx_user_created` (`user_id`, `created_at`);

ALTER TABLE `checkin_sleep_record`
  ADD INDEX IF NOT EXISTS `idx_user_created` (`user_id`, `created_at`);
