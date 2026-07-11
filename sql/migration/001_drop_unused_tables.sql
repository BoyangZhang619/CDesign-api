-- ============================================================
-- Migration 001: 删除无引用/废弃的数据库表
-- 基准: total_database_full.sql 审计结果 (2026-07-11)
-- 确认: 所有被删除的表在全部业务代码中均无引用
-- ============================================================

-- OLD 打卡系统表 (旧 checkinRouters/checkinController 已删除，无代码引用)
DROP TABLE IF EXISTS `checkin_daily`;
DROP TABLE IF EXISTS `checkin_exercise`;
DROP TABLE IF EXISTS `checkin_meal`;
DROP TABLE IF EXISTS `checkin_sleep`;

-- 数字孪生画像 (无代码引用、功能未实现)
DROP TABLE IF EXISTS `digital_twin_profile`;

-- 通知消息 (无代码引用、功能未实现)
DROP TABLE IF EXISTS `notification_message`;

-- 健康目标 + 进度日志 (无代码引用、功能未实现)
-- 注意: user_profile.health_goals 列是独立存在的，不受此影响
DROP TABLE IF EXISTS `goal_progress_log`;
DROP TABLE IF EXISTS `health_goal`;
