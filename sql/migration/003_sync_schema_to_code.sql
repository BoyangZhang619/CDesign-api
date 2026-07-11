-- ============================================================
-- Migration 003: 同步 schema 至与代码完全一致
-- 适用：已通过旧 schema 文件建库，需要补全代码引用的缺失列
-- ============================================================

-- ── refresh_tokens: 补 user_agent / ip_address ──
ALTER TABLE `refresh_tokens`
  ADD COLUMN IF NOT EXISTS `user_agent` VARCHAR(500) DEFAULT NULL COMMENT 'User-Agent',
  ADD COLUMN IF NOT EXISTS `ip_address` VARCHAR(64) DEFAULT NULL COMMENT 'IP 地址';

-- ── checkin_ai_summary: 补 is_total_summary_updated, user_id 改可空 ──
ALTER TABLE `checkin_ai_summary`
  ADD COLUMN IF NOT EXISTS `is_total_summary_updated` TINYINT(1) DEFAULT 0 COMMENT '综合总结是否需要更新',
  MODIFY COLUMN `user_id` BIGINT DEFAULT NULL COMMENT '关联 user_account.id（可空）';

-- ── tasks: 补缺失的业务列 ──
ALTER TABLE `tasks`
  ADD COLUMN IF NOT EXISTS `due_time` TIME DEFAULT NULL COMMENT '截止时间',
  ADD COLUMN IF NOT EXISTS `completed_date` DATE DEFAULT NULL COMMENT '完成日期',
  ADD COLUMN IF NOT EXISTS `category_icon` VARCHAR(10) DEFAULT NULL COMMENT '分类图标 Emoji',
  ADD COLUMN IF NOT EXISTS `ai_suggestion_reason` TEXT COMMENT 'AI 建议理由',
  ADD COLUMN IF NOT EXISTS `checkin_type` ENUM('exercise','meal','sleep') DEFAULT NULL COMMENT '打卡类型',
  ADD COLUMN IF NOT EXISTS `checkin_recurrence` ENUM('tomorrow','everyday','workday','weekend') DEFAULT NULL COMMENT '打卡重复规律',
  ADD COLUMN IF NOT EXISTS `preset_type` VARCHAR(50) DEFAULT NULL COMMENT '预设类型',
  ADD COLUMN IF NOT EXISTS `date_type` ENUM('tomorrow','workday','weekend','everyday') DEFAULT 'tomorrow' COMMENT '日期类型',
  ADD COLUMN IF NOT EXISTS `ai_prompt` TEXT COMMENT 'AI 提示词',
  MODIFY COLUMN `status` ENUM('pending','completed','overdue') NOT NULL DEFAULT 'pending',
  MODIFY COLUMN `priority` ENUM('high','medium','low') NOT NULL DEFAULT 'medium';

-- ── task_completion_records: 补冗余列 + 修改列名 ──
ALTER TABLE `task_completion_records`
  ADD COLUMN IF NOT EXISTS `task_title` VARCHAR(255) DEFAULT NULL COMMENT '任务标题（冗余）',
  ADD COLUMN IF NOT EXISTS `task_priority` VARCHAR(20) DEFAULT NULL COMMENT '任务优先级（冗余）',
  ADD COLUMN IF NOT EXISTS `category` VARCHAR(50) DEFAULT NULL COMMENT '分类',
  ADD COLUMN IF NOT EXISTS `due_date` DATE DEFAULT NULL COMMENT '原截止日期（冗余）',
  ADD COLUMN IF NOT EXISTS `category_icon` VARCHAR(10) DEFAULT NULL COMMENT '分类图标（冗余）',
  ADD COLUMN IF NOT EXISTS `completion_status` VARCHAR(20) DEFAULT 'completed' COMMENT '完成状态',
  ADD COLUMN IF NOT EXISTS `completion_time` TIME DEFAULT NULL COMMENT '完成时间',
  CHANGE COLUMN `completed_date` `completion_date` DATE NOT NULL COMMENT '完成日期',
  CHANGE COLUMN `completed_at` `completion_time` TIME DEFAULT NULL COMMENT '完成时间（如有重复则忽略此条）';

-- ── user_profile: 补代码引用的列 ──
ALTER TABLE `user_profile`
  ADD COLUMN IF NOT EXISTS `age` INT DEFAULT NULL COMMENT '年龄',
  ADD COLUMN IF NOT EXISTS `realname` VARCHAR(255) DEFAULT NULL COMMENT '真实姓名',
  ADD COLUMN IF NOT EXISTS `dietary_preferences` VARCHAR(255) DEFAULT NULL COMMENT '饮食偏好',
  ADD COLUMN IF NOT EXISTS `diet_other_text` VARCHAR(255) DEFAULT NULL COMMENT '饮食偏好补充',
  ADD COLUMN IF NOT EXISTS `allergies` VARCHAR(255) DEFAULT NULL COMMENT '过敏信息',
  ADD COLUMN IF NOT EXISTS `work_rest_habit` VARCHAR(255) DEFAULT NULL COMMENT '作息习惯',
  ADD COLUMN IF NOT EXISTS `sleep_habit` VARCHAR(255) DEFAULT NULL COMMENT '睡眠习惯',
  ADD COLUMN IF NOT EXISTS `health_goals` VARCHAR(255) DEFAULT NULL COMMENT '健康目标',
  ADD COLUMN IF NOT EXISTS `goal_other_text` VARCHAR(255) DEFAULT NULL COMMENT '健康目标补充',
  ADD COLUMN IF NOT EXISTS `goal_type` VARCHAR(255) DEFAULT NULL COMMENT '目标类型',
  ADD COLUMN IF NOT EXISTS `diseases` VARCHAR(255) DEFAULT '无' COMMENT '疾病信息',
  ADD COLUMN IF NOT EXISTS `remark` VARCHAR(255) DEFAULT '无' COMMENT '备注',
  MODIFY COLUMN `gender` VARCHAR(16) DEFAULT NULL,
  MODIFY COLUMN `activity_level` VARCHAR(32) DEFAULT NULL,
  DROP COLUMN IF EXISTS `diet_type`,
  DROP COLUMN IF EXISTS `diet_allergies`,
  DROP COLUMN IF EXISTS `sleep_preference`;
