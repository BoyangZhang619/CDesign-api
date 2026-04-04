-- 字符化头像表
-- 用于存储 8x8、16x16、32x32 三种大小的头像
-- 每个头像由多个 RGBA 颜色字符串 (#RRGGBBAA) 连接而成
CREATE TABLE `character_avatar` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` bigint NOT NULL COMMENT '用户ID',
    `avatar_size` int NOT NULL COMMENT '头像大小: 8, 16, 或 32',
    `avatar_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '头像数据：多个#RRGGBBAA颜色字符串连接，如#eeccbba9,#eedd1199,...',
    `is_current` boolean NOT NULL DEFAULT false COMMENT '是否当前使用的头像',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE,
    KEY `idx_user_id` (`user_id`),
    KEY `idx_user_size` (`user_id`, `avatar_size`),
    KEY `idx_user_current` (`user_id`, `is_current`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户字符化头像表';

-- 提示：
-- avatar_size 有效值：8, 16, 32
-- avatar_data 格式示例：
--   8x8 头像: #eeccbba9,#eedd1199,#aabbccdd,... (共 64 个颜色)
--   16x16 头像: #eeccbba9,#eedd1199,#aabbccdd,... (共 256 个颜色)
--   32x32 头像: #eeccbba9,#eedd1199,#aabbccdd,... (共 1024 个颜色)
-- is_current 为 true 表示该头像当前正在使用（每个用户的每个大小应只有一个 is_current=true）
