-- =====================================================
-- AI Agent 聊天系统数据库表结构
-- =====================================================

-- 1. AI 聊天会话表（聊天本体信息）
CREATE TABLE IF NOT EXISTS `ai_chat_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '聊天会话ID',
  `uuid` VARCHAR(36) NOT NULL UNIQUE COMMENT '会话唯一标识符 (UUID)',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `session_name` VARCHAR(100) NOT NULL DEFAULT '新聊天' COMMENT '会话名称（用户可自定义）',
  `description` TEXT COMMENT '会话描述',
  `ai_model` VARCHAR(50) NOT NULL DEFAULT 'dashscope' COMMENT 'AI 模型类型 (dashscope/gpt-4/etc)',
  `ai_app_id` VARCHAR(100) COMMENT '阿里云 AI Agent App ID',
  `system_prompt` TEXT COMMENT '系统提示词',
  `temperature` DECIMAL(3,2) DEFAULT 0.7 COMMENT '模型温度参数 (0-1)',
  `max_tokens` INT DEFAULT 2048 COMMENT '最大 token 数',
  `message_count` INT UNSIGNED DEFAULT 0 COMMENT '聊天消息总数',
  `total_input_tokens` BIGINT UNSIGNED DEFAULT 0 COMMENT '总输入 token 数',
  `total_output_tokens` BIGINT UNSIGNED DEFAULT 0 COMMENT '总输出 token 数',
  `total_tokens` BIGINT UNSIGNED DEFAULT 0 COMMENT '总 token 数',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否活跃（软删除）',
  `is_starred` BOOLEAN DEFAULT FALSE COMMENT '是否标星',
  `tags` VARCHAR(255) COMMENT '标签（逗号分隔）',
  `last_message_at` DATETIME COMMENT '最后消息时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_uuid` (`uuid`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_created_at` (`user_id`, `created_at`),
  KEY `idx_user_active` (`user_id`, `is_active`),
  KEY `idx_ai_model` (`ai_model`),
  KEY `idx_last_message_at` (`last_message_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 聊天会话表';

-- 2. AI 聊天消息表（详细聊天数据）
CREATE TABLE IF NOT EXISTS `ai_chat_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `session_id` BIGINT UNSIGNED NOT NULL COMMENT '所属会话ID（外键）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID（冗余存储便于查询）',
  `message_index` INT UNSIGNED NOT NULL COMMENT '消息在会话中的序号',
  `role` ENUM('user', 'assistant', 'system') NOT NULL COMMENT '消息角色',
  `content` LONGTEXT NOT NULL COMMENT '消息内容',
  `content_type` ENUM('text', 'image', 'file', 'mixed') NOT NULL DEFAULT 'text' COMMENT '内容类型',
  `input_tokens` INT UNSIGNED DEFAULT 0 COMMENT '此条消息的输入 token 数',
  `output_tokens` INT UNSIGNED DEFAULT 0 COMMENT '此条消息的输出 token 数',
  `total_tokens` INT UNSIGNED DEFAULT 0 COMMENT '此条消息的总 token 数',
  `usage_tokens` JSON COMMENT '详细的 token 使用信息（JSON 格式）',
  `model_name` VARCHAR(100) COMMENT '使用的模型名称',
  `finish_reason` VARCHAR(50) COMMENT '完成原因 (stop/length/error/etc)',
  `response_time_ms` INT UNSIGNED COMMENT '响应耗时（毫秒）',
  `error_message` TEXT COMMENT '错误信息（如果有）',
  `metadata` JSON COMMENT '元数据（JSON 格式，用于存储额外信息）',
  `is_edited` BOOLEAN DEFAULT FALSE COMMENT '是否被编辑过',
  `edited_at` DATETIME COMMENT '编辑时间',
  `edited_content` LONGTEXT COMMENT '编辑后的内容',
  `is_deleted` BOOLEAN DEFAULT FALSE COMMENT '是否被删除（软删除）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_session_message_index` (`session_id`, `message_index`),
  KEY `idx_role` (`role`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_session_created_at` (`session_id`, `created_at`),
  FOREIGN KEY (`session_id`) REFERENCES `ai_chat_sessions` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 聊天消息表';

-- =====================================================
-- 视图和辅助对象
-- =====================================================

-- 创建视图：聊天会话统计
CREATE OR REPLACE VIEW v_ai_chat_session_stats AS
SELECT 
  s.id,
  s.uuid,
  s.user_id,
  s.session_name,
  s.ai_model,
  s.message_count,
  s.total_input_tokens,
  s.total_output_tokens,
  s.total_tokens,
  s.created_at,
  s.last_message_at,
  COUNT(m.id) as actual_message_count,
  MAX(m.created_at) as actual_last_message_at
FROM ai_chat_sessions s
LEFT JOIN ai_chat_messages m ON s.id = m.session_id AND m.is_deleted = FALSE
GROUP BY s.id;

-- 创建视图：用户聊天统计
CREATE OR REPLACE VIEW v_ai_user_chat_stats AS
SELECT 
  user_id,
  COUNT(DISTINCT id) as total_sessions,
  SUM(message_count) as total_messages,
  SUM(total_tokens) as total_tokens,
  COUNT(DISTINCT DATE(created_at)) as days_with_chats,
  MAX(last_message_at) as latest_message_time,
  MIN(created_at) as first_session_time
FROM ai_chat_sessions
WHERE is_active = TRUE
GROUP BY user_id;

-- =====================================================
-- 索引优化
-- =====================================================

-- 注：以上已包含主要索引，以下是可选的优化索引

-- 如果需要快速查询最近的对话
-- ALTER TABLE `ai_chat_sessions` ADD INDEX `idx_user_recent` (`user_id`, `last_message_at` DESC);

-- 如果需要快速统计用户的 token 消费
-- ALTER TABLE `ai_chat_sessions` ADD INDEX `idx_user_tokens` (`user_id`, `total_tokens`);
