-- ============================================================
-- Schema 03: AI 聊天
-- 表: ai_chat_sessions, ai_chat_messages
-- ============================================================

-- ── ai_chat_sessions: AI 聊天会话 ──
DROP TABLE IF EXISTS `ai_chat_sessions`;
CREATE TABLE `ai_chat_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '会话ID',
  `uuid` VARCHAR(36) NOT NULL COMMENT '会话唯一标识(UUID)',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `session_name` VARCHAR(100) NOT NULL DEFAULT '新会话' COMMENT '会话名称（可自定义或自动截取首条消息）',
  `description` TEXT COMMENT '会话描述',
  `ai_model` VARCHAR(50) NOT NULL DEFAULT 'dashscope' COMMENT 'AI 模型 (dashscope/gpt-4/etc)',
  `ai_app_id` VARCHAR(100) DEFAULT NULL COMMENT 'DashScope AI Agent App ID',
  `dashscope_session_id` VARCHAR(100) DEFAULT NULL COMMENT 'DashScope session_id（用于多轮对话记忆）',
  `system_prompt` TEXT COMMENT '系统提示词',
  `temperature` DECIMAL(3,2) DEFAULT 0.70 COMMENT 'AI 温度参数 (0-1)',
  `max_tokens` INT DEFAULT 2048 COMMENT '最大 token 数',
  `message_count` INT DEFAULT 0 COMMENT '会话消息数量（冗余缓存）',
  `total_input_tokens` BIGINT DEFAULT 0 COMMENT '累计输入 token',
  `total_output_tokens` BIGINT DEFAULT 0 COMMENT '累计输出 token',
  `total_tokens` BIGINT DEFAULT 0 COMMENT '累计总 token',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否活跃（非活跃会话定期清理）',
  `is_starred` TINYINT(1) DEFAULT 0 COMMENT '是否收藏',
  `tags` VARCHAR(255) DEFAULT NULL COMMENT '标签（逗号分隔）',
  `last_message_at` DATETIME DEFAULT NULL COMMENT '最后一条消息时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_uuid` (`uuid`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_created_at` (`user_id`, `created_at`),
  KEY `idx_user_active` (`user_id`, `is_active`),
  KEY `idx_ai_model` (`ai_model`),
  KEY `idx_last_message_at` (`last_message_at`),
  KEY `idx_dashscope_session_id` (`dashscope_session_id`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 聊天会话';

-- ── ai_chat_messages: AI 聊天消息 ──
DROP TABLE IF EXISTS `ai_chat_messages`;
CREATE TABLE `ai_chat_messages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `session_id` BIGINT NOT NULL COMMENT '所属会话ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID（冗余，加速查询）',
  `message_index` INT NOT NULL COMMENT '消息序号（会话内排序）',
  `role` ENUM('user', 'assistant', 'system') NOT NULL COMMENT '角色',
  `content` LONGTEXT NOT NULL COMMENT '消息内容',
  `content_type` ENUM('text', 'image', 'file', 'mixed') NOT NULL DEFAULT 'text' COMMENT '内容类型',
  `input_tokens` INT DEFAULT 0 COMMENT '输入 token（仅 user/system 消息有效）',
  `output_tokens` INT DEFAULT 0 COMMENT '输出 token（仅 assistant 消息有效）',
  `total_tokens` INT DEFAULT 0 COMMENT '总 token',
  `usage_tokens` JSON DEFAULT NULL COMMENT '完整 token 使用详情 JSON',
  `model_name` VARCHAR(100) DEFAULT NULL COMMENT '使用的模型名称',
  `finish_reason` VARCHAR(50) DEFAULT NULL COMMENT '结束原因 (stop/length/error/etc)',
  `response_time_ms` INT DEFAULT NULL COMMENT '响应耗时（毫秒）',
  `error_message` TEXT COMMENT '错误消息',
  `metadata` JSON DEFAULT NULL COMMENT '扩展元数据 JSON',
  `is_edited` TINYINT(1) DEFAULT 0 COMMENT '是否被编辑过',
  `edited_at` DATETIME DEFAULT NULL COMMENT '编辑时间',
  `edited_content` LONGTEXT COMMENT '编辑前的原始内容',
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '软删除标记',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_session_message_index` (`session_id`, `message_index`),
  KEY `idx_role` (`role`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_session_created_at` (`session_id`, `created_at`),
  CONSTRAINT `fk_message_session` FOREIGN KEY (`session_id`) REFERENCES `ai_chat_sessions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_message_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 聊天消息';

