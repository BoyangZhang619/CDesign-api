-- ============================================================
-- 像素头像系统
-- 每像素 1 hex 字符 (0-F)，16 色调色板
-- 分辨率等级: 16×16 / 32×32 / 64×64 / 128×128
-- ============================================================

DROP TABLE IF EXISTS `pixel_avatars`;

CREATE TABLE `pixel_avatars` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id`     BIGINT       NOT NULL              COMMENT '用户ID，NULL表示系统默认头像',
  `level`       TINYINT      NOT NULL DEFAULT 16   COMMENT '分辨率等级: 16/32/64/128',
  `pixel_data`  TEXT         NOT NULL              COMMENT '像素数据：每像素1个hex字符(0-F)，按行连续排列，无分隔符',
  `is_current`  TINYINT(1)   NOT NULL DEFAULT 0    COMMENT '是否当前正在使用的头像',
  `is_default`  TINYINT(1)   NOT NULL DEFAULT 0    COMMENT '是否系统默认头像（user_id IS NULL 时生效）',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  PRIMARY KEY (`id`),
  KEY `idx_user_current` (`user_id`, `is_current`),
  KEY `idx_level`        (`level`),
  KEY `idx_default`      (`is_default`),

  CONSTRAINT `pixel_avatars_ibfk_1`
    FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='像素头像表：16色hex字符编码，支持16/32/64/128四级分辨率';

-- ============================================================
-- 调色板定义（硬编码在应用层，此注释仅供文档参考）
--
--  0 = transparent   #00000000
--  1 = black         #262626
--  2 = white         #FFFFFF
--  3 = accent        #0095F6
--  4 = red           #ED4956
--  5 = green         #78C850
--  6 = yellow        #F7B955
--  7 = purple        #833AB4
--  8 = orange        #F58529
--  9 = pink          #DD2A7B
--  A = blue          #405DE6
--  B = indigo        #5851DB
--  C = bright-red    #FD1D1D
--  D = warm-orange   #F77737
--  E = light-gray    #F5F5F5
--  F = dark-gray     #8E8E8E
--
-- 像素数据格式: 无分隔符连续hex字符串
--   16×16 = 256 chars
--   32×32 = 1024 chars
--   64×64 = 4096 chars
--   128×128 = 16384 chars
--
-- 渲染时按 level 确定的宽度换行，每字符查调色板得 RGBA
-- ============================================================
