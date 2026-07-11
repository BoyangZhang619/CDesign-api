-- ============================================================
-- Schema 06: 像素头像系统
-- 表: character_avatar, pixel_avatars
-- ============================================================

-- ── character_avatar: 角色像素头像 ──
CREATE TABLE `character_avatar` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '头像ID',
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `avatar_size` INT NOT NULL COMMENT '尺寸: 8, 16, 或 32',
  `avatar_data` LONGTEXT NOT NULL COMMENT '像素数据 (#RRGGBBAA 格式, 每像素1个hex字符, 逗号分隔)',
  `is_current` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为当前使用头像',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_size` (`user_id`, `avatar_size`),
  KEY `idx_user_current` (`user_id`, `is_current`),
  CONSTRAINT `fk_char_avatar_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色像素头像';

-- ── pixel_avatars: 像素头像库 ──
CREATE TABLE `pixel_avatars` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT '关联 user_account.id',
  `level` INT DEFAULT 1 COMMENT '头像等级',
  `pixel_data` LONGTEXT NOT NULL COMMENT '像素数据（16色，每像素1个hex字符）',
  `is_current` TINYINT(1) DEFAULT 0 COMMENT '是否为当前头像',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否为默认头像',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_current` (`user_id`, `is_current`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='像素头像库';
