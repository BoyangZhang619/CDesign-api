-- 为 user_account 表添加新字段：个人简介、网站、地址
-- 这些字段用于扩展用户档案信息

-- 1. 添加个人简介字段 (bio)
ALTER TABLE `user_account` 
ADD COLUMN `bio` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '个人简介' AFTER `phone`;

-- 2. 添加个人网站字段 (website)
ALTER TABLE `user_account` 
ADD COLUMN `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '个人网站或博客链接' AFTER `bio`;

-- 3. 添加地址字段 (location)
ALTER TABLE `user_account` 
ADD COLUMN `location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户所在地区' AFTER `website`;

-- 验证新增字段
-- SELECT * FROM `user_account` LIMIT 1;
