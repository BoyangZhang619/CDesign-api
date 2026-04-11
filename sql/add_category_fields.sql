-- =====================================================
-- 新增 category 列用于支持四种任务分类
-- =====================================================

-- 为 tasks 表添加 category 列
ALTER TABLE `tasks` 
ADD COLUMN `category` ENUM('diet', 'exercise', 'sleep', 'custom') DEFAULT 'custom' COMMENT '任务分类（饮食/运动/睡眠/自定义）' AFTER `type`;

-- 为 tasks 表添加 preset_type 列
ALTER TABLE `tasks` 
ADD COLUMN `preset_type` VARCHAR(50) COMMENT '预设类型' AFTER `category`;

-- 为 tasks 表添加 date_type 列
ALTER TABLE `tasks` 
ADD COLUMN `date_type` ENUM('tomorrow', 'workday', 'weekend', 'everyday') COMMENT '日期类型' AFTER `preset_type`;

-- 为 tasks 表添加新的复合索引
ALTER TABLE `tasks` 
ADD KEY `idx_user_category` (`user_id`, `category`);

-- 为 task_completion_records 表添加 category 列
ALTER TABLE `task_completion_records` 
ADD COLUMN `category` ENUM('diet', 'exercise', 'sleep', 'custom') COMMENT '任务分类' AFTER `task_type`;

-- 为 task_completion_records 表添加 preset_type 列
ALTER TABLE `task_completion_records` 
ADD COLUMN `preset_type` VARCHAR(50) COMMENT '预设类型' AFTER `category`;

-- 为 task_completion_records 表添加新的复合索引
ALTER TABLE `task_completion_records` 
ADD KEY `idx_user_category` (`user_id`, `category`);

-- 为 task_statistics 表添加按类别统计的列
ALTER TABLE `task_statistics` 
ADD COLUMN `category_diet_count` INT DEFAULT 0 COMMENT '饮食类任务数' AFTER `total_count`,
ADD COLUMN `category_exercise_count` INT DEFAULT 0 COMMENT '运动类任务数' AFTER `category_diet_count`,
ADD COLUMN `category_sleep_count` INT DEFAULT 0 COMMENT '睡眠类任务数' AFTER `category_exercise_count`,
ADD COLUMN `category_custom_count` INT DEFAULT 0 COMMENT '自定义任务数' AFTER `category_sleep_count`,
ADD COLUMN `category_diet_completed` INT DEFAULT 0 COMMENT '已完成饮食类任务数' AFTER `category_custom_count`,
ADD COLUMN `category_exercise_completed` INT DEFAULT 0 COMMENT '已完成运动类任务数' AFTER `category_diet_completed`,
ADD COLUMN `category_sleep_completed` INT DEFAULT 0 COMMENT '已完成睡眠类任务数' AFTER `category_exercise_completed`,
ADD COLUMN `category_custom_completed` INT DEFAULT 0 COMMENT '已完成自定义任务数' AFTER `category_sleep_completed`;
