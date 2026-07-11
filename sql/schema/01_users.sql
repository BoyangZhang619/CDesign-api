-- ============================================================
-- Schema 01: 用户与认证
-- 表: user_account, user_profile, user_settings, refresh_tokens
-- ============================================================

-- ── user_account: 核心用户账户 ──
DROP TABLE IF EXISTS `user_account`;
CREATE TABLE `user_account` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `email` VARCHAR(255) NOT NULL COMMENT '邮箱（登录名）',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt 密码哈希',
  `nickname` VARCHAR(100) DEFAULT NULL COMMENT '昵称',
  `avatar_url` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `role` VARCHAR(50) NOT NULL DEFAULT 'user' COMMENT '角色: user/admin',
  `is_admin` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否管理员',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '账户状态: active/disabled/banned',
  `credits` BIGINT NOT NULL DEFAULT 0 COMMENT 'AI 调用额度',
  `bio` TEXT COMMENT '个人简介',
  `website` VARCHAR(255) DEFAULT NULL COMMENT '个人网站',
  `location` VARCHAR(255) DEFAULT NULL COMMENT '所在地',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户账户';

-- ── user_profile: 健康档案 ──
DROP TABLE IF EXISTS `user_profile`;
CREATE TABLE `user_profile` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `gender` VARCHAR(16) DEFAULT NULL COMMENT '性别: male/female/other',
  `birthday` DATE DEFAULT NULL COMMENT '出生日期',
  `age` INT DEFAULT NULL COMMENT '年龄（冗余，可通过 birthday 计算）',
  `realname` VARCHAR(255) DEFAULT NULL COMMENT '真实姓名',
  `height_cm` DECIMAL(5,2) DEFAULT NULL COMMENT '身高(cm)',
  `current_weight_kg` DECIMAL(5,2) DEFAULT NULL COMMENT '当前体重(kg)',
  `target_weight_kg` DECIMAL(5,2) DEFAULT NULL COMMENT '目标体重(kg)',
  `goal_type` VARCHAR(255) DEFAULT NULL COMMENT '目标类型: 增肌/减脂/维持/规律作息等',
  `dietary_preferences` VARCHAR(255) DEFAULT NULL COMMENT '饮食偏好',
  `diet_other_text` VARCHAR(255) DEFAULT NULL COMMENT '饮食偏好补充说明',
  `allergies` VARCHAR(255) DEFAULT NULL COMMENT '过敏信息',
  `work_rest_habit` VARCHAR(255) DEFAULT NULL COMMENT '作息习惯描述',
  `sleep_habit` VARCHAR(255) DEFAULT NULL COMMENT '睡眠习惯',
  `activity_level` VARCHAR(32) DEFAULT NULL COMMENT '日常活动水平',
  `health_goals` VARCHAR(255) DEFAULT NULL COMMENT '健康目标补充说明',
  `goal_other_text` VARCHAR(255) DEFAULT NULL COMMENT '健康目标补充',
  `diseases` VARCHAR(255) DEFAULT '无' COMMENT '历史/当前疾病',
  `remark` VARCHAR(255) DEFAULT '无' COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_profile_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户健康档案';

-- ── user_settings: 用户偏好设置 ──
DROP TABLE IF EXISTS `user_settings`;
CREATE TABLE `user_settings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `theme` VARCHAR(20) DEFAULT 'light' COMMENT '主题: light/dark',
  `language` VARCHAR(10) DEFAULT 'zh-CN' COMMENT '语言偏好',
  `notification_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用通知',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  CONSTRAINT `fk_settings_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户偏好设置';

-- ── refresh_tokens: JWT 刷新令牌 ──
DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL COMMENT 'SHA-256 哈希后的 refresh token',
  `expires_at` DATETIME NOT NULL COMMENT '过期时间',
  `revoked_at` DATETIME DEFAULT NULL COMMENT '吊销时间（NULL=有效）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT 'User-Agent',
  `ip_address` VARCHAR(64) DEFAULT NULL COMMENT 'IP 地址',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_refresh_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='JWT 刷新令牌';

