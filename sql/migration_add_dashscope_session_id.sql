-- =====================================================
-- AI Chat 多轮对话支持 - 数据库迁移脚本
-- =====================================================

-- 为 ai_chat_sessions 表添加 dashscope_session_id 字段
-- 用于存储阿里云 DashScope API 返回的 session_id，以支持多轮对话记忆

ALTER TABLE `ai_chat_sessions` 
ADD COLUMN `dashscope_session_id` VARCHAR(100) COMMENT '阿里云 DashScope session_id（用于多轮对话记忆）' 
AFTER `ai_app_id`;

-- 添加索引以提高查询性能
ALTER TABLE `ai_chat_sessions` 
ADD KEY `idx_dashscope_session_id` (`dashscope_session_id`);

-- 验证修改
-- SELECT * FROM `ai_chat_sessions` LIMIT 1;
