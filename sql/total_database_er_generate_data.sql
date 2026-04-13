-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: cdesign_db
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ai_chat_messages`
--

DROP TABLE IF EXISTS `ai_chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_chat_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `session_id` bigint NOT NULL COMMENT '所属会话ID（外键）',
  `user_id` bigint NOT NULL COMMENT '用户ID（冗余存储便于查询）',
  `message_index` int NOT NULL COMMENT '消息在会话中的序号',
  `role` enum('user','assistant','system') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息角色',
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息内容',
  `content_type` enum('text','image','file','mixed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text' COMMENT '内容类型',
  `input_tokens` int DEFAULT '0' COMMENT '此条消息的输入 token 数',
  `output_tokens` int DEFAULT '0' COMMENT '此条消息的输出 token 数',
  `total_tokens` int DEFAULT '0' COMMENT '此条消息的总 token 数',
  `usage_tokens` json DEFAULT NULL COMMENT '详细的 token 使用信息（JSON 格式）',
  `model_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '使用的模型名称',
  `finish_reason` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '完成原因 (stop/length/error/etc)',
  `response_time_ms` int DEFAULT NULL COMMENT '响应耗时（毫秒）',
  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT '错误信息（如果有）',
  `metadata` json DEFAULT NULL COMMENT '元数据（JSON 格式，用于存储额外信息）',
  `is_edited` tinyint(1) DEFAULT '0' COMMENT '是否被编辑过',
  `edited_at` datetime DEFAULT NULL COMMENT '编辑时间',
  `edited_content` longtext COLLATE utf8mb4_unicode_ci COMMENT '编辑后的内容',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '是否被删除（软删除）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_session_message_index` (`session_id`,`message_index`),
  KEY `idx_role` (`role`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_session_created_at` (`session_id`,`created_at`),
  CONSTRAINT `ai_chat_messages_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `ai_chat_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ai_chat_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 聊天消息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ai_chat_sessions`
--

DROP TABLE IF EXISTS `ai_chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_chat_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '聊天会话ID',
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会话唯一标识符 (UUID)',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `session_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '新聊天' COMMENT '会话名称（用户可自定义）',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '会话描述',
  `ai_model` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'dashscope' COMMENT 'AI 模型类型 (dashscope/gpt-4/etc)',
  `ai_app_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '阿里云 AI Agent App ID',
  `dashscope_session_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '阿里云 DashScope session_id（用于多轮对话记忆）',
  `system_prompt` text COLLATE utf8mb4_unicode_ci COMMENT '系统提示词',
  `temperature` decimal(3,2) DEFAULT '0.70' COMMENT '模型温度参数 (0-1)',
  `max_tokens` int DEFAULT '2048' COMMENT '最大 token 数',
  `message_count` int DEFAULT '0' COMMENT '聊天消息总数',
  `total_input_tokens` bigint DEFAULT '0' COMMENT '总输入 token 数',
  `total_output_tokens` bigint DEFAULT '0' COMMENT '总输出 token 数',
  `total_tokens` bigint DEFAULT '0' COMMENT '总 token 数',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否活跃（软删除）',
  `is_starred` tinyint(1) DEFAULT '0' COMMENT '是否标星',
  `tags` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标签（逗号分隔）',
  `last_message_at` datetime DEFAULT NULL COMMENT '最后消息时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `uk_uuid` (`uuid`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_created_at` (`user_id`,`created_at`),
  KEY `idx_user_active` (`user_id`,`is_active`),
  KEY `idx_ai_model` (`ai_model`),
  KEY `idx_last_message_at` (`last_message_at`),
  KEY `idx_dashscope_session_id` (`dashscope_session_id`),
  CONSTRAINT `ai_chat_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 聊天会话表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `character_avatar`
--

DROP TABLE IF EXISTS `character_avatar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `character_avatar` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `avatar_size` int NOT NULL COMMENT '头像大小: 8, 16, 或 32',
  `avatar_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '头像数据：多个#RRGGBBAA颜色字符串连接，如#eeccbba9,#eedd1199,...',
  `is_current` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否当前使用的头像',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_size` (`user_id`,`avatar_size`),
  KEY `idx_user_current` (`user_id`,`is_current`),
  CONSTRAINT `character_avatar_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户字符化头像表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `checkin_ai_summary`
--

DROP TABLE IF EXISTS `checkin_ai_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin_ai_summary` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `daily_checkin_id` bigint NOT NULL COMMENT '关联的daily_checkin表的ID',
  `meal_ai_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'AI分析总结',
  `exercise_ai_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'AI分析总结',
  `sleep_ai_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'AI分析总结',
  `total_ai_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'AI分析总结',
  `is_meal_summary_updated` tinyint(1) DEFAULT '0' COMMENT '餐饮总结是否已更新',
  `is_exercise_summary_updated` tinyint(1) DEFAULT '0' COMMENT '运动总结是否已更新',
  `is_sleep_summary_updated` tinyint(1) DEFAULT '0' COMMENT '睡眠总结是否已更新',
  `is_total_summary_updated` tinyint(1) DEFAULT '0' COMMENT '整体总结是否已更新',
  PRIMARY KEY (`id`),
  KEY `dc_daily_ai_summary` (`daily_checkin_id`),
  CONSTRAINT `dc_daily_ai_summary` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `checkin_exercise_record`
--

DROP TABLE IF EXISTS `checkin_exercise_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin_exercise_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `daily_checkin_id` bigint NOT NULL COMMENT '关联daily_checkin.id',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `activity_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '跑步/步行/力量训练/球类等',
  `duration_min` int DEFAULT NULL COMMENT '时长',
  `intensity` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'low/medium/high',
  `calories_burned` decimal(10,2) DEFAULT NULL COMMENT 'ai给到的估算消耗热量',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `ai_recognition_flag` tinyint DEFAULT NULL COMMENT '是否AI辅助',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `suggestion` text COLLATE utf8mb4_unicode_ci COMMENT 'ai给的建议',
  `evaluation` text COLLATE utf8mb4_unicode_ci COMMENT 'ai给的评价',
  PRIMARY KEY (`id`),
  KEY `idx_daily_checkin_id` (`daily_checkin_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `checkin_exercise_record_ibfk_1` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin` (`id`) ON DELETE CASCADE,
  CONSTRAINT `checkin_exercise_record_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡运动明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `checkin_meal_record`
--

DROP TABLE IF EXISTS `checkin_meal_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin_meal_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `daily_checkin_id` bigint NOT NULL COMMENT '关联daily_checkin.id',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `meal_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'breakfast/lunch/dinner/snack',
  `food_source` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'canteen/takeout/dormitory/other',
  `food_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '食物名称或套餐名称',
  `food_detail` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '食物明细，可json文本',
  `calories` decimal(10,2) DEFAULT NULL COMMENT '热量',
  `protein_g` decimal(10,2) DEFAULT NULL COMMENT '蛋白质',
  `fat_g` decimal(10,2) DEFAULT NULL COMMENT '脂肪',
  `carbohydrate_g` decimal(10,2) DEFAULT NULL COMMENT '碳水',
  `fiber_g` decimal(10,2) DEFAULT NULL COMMENT '膳食纤维，可选',
  `sugar_g` decimal(10,2) DEFAULT NULL COMMENT '糖分，可选',
  `meal_time` datetime DEFAULT NULL COMMENT '用餐时间',
  `ai_recognition_flag` tinyint DEFAULT NULL COMMENT '是否来自AI识别',
  `image_id` bigint DEFAULT NULL COMMENT '关联上传图片，可空',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_daily_checkin_id` (`daily_checkin_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `checkin_meal_record_ibfk_1` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin` (`id`) ON DELETE CASCADE,
  CONSTRAINT `checkin_meal_record_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡饮食明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `checkin_records`
--

DROP TABLE IF EXISTS `checkin_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin_records` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `checkin_type` enum('exercise','meal','sleep') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '打卡类型',
  `checkin_date` date NOT NULL COMMENT '打卡日期',
  `completed` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已完成',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_type_date` (`user_id`,`checkin_type`,`checkin_date`),
  KEY `idx_user_checkin_type` (`user_id`,`checkin_type`),
  KEY `idx_checkin_date` (`checkin_date`),
  CONSTRAINT `checkin_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `checkin_sleep_record`
--

DROP TABLE IF EXISTS `checkin_sleep_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin_sleep_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `daily_checkin_id` bigint NOT NULL COMMENT '关联daily_checkin.id',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `sleep_start_time` datetime DEFAULT NULL COMMENT '入睡时间',
  `wake_up_time` datetime DEFAULT NULL COMMENT '起床时间',
  `sleep_duration_hours` decimal(4,2) DEFAULT NULL COMMENT '睡眠时长',
  `sleep_quality_score` int DEFAULT NULL COMMENT 'ai给的睡眠质量评分，0-100',
  `is_nap` tinyint DEFAULT '0' COMMENT '是否是小憩',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `wake_up_times` int(10) unsigned zerofill DEFAULT NULL COMMENT '睡眠中苏醒次数',
  `sleep_feeling` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '个人感觉',
  `suggestion` text COLLATE utf8mb4_unicode_ci COMMENT 'ai给的建议',
  `evaluation` text COLLATE utf8mb4_unicode_ci COMMENT 'ai给这次睡眠的评价',
  PRIMARY KEY (`id`),
  KEY `idx_daily_checkin_id` (`daily_checkin_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `checkin_sleep_record_ibfk_1` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin` (`id`) ON DELETE CASCADE,
  CONSTRAINT `checkin_sleep_record_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡睡眠明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `daily_checkin`
--

DROP TABLE IF EXISTS `daily_checkin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_checkin` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `checkin_date` date NOT NULL COMMENT '打卡日期',
  `total_calories_intake` decimal(10,2) DEFAULT NULL COMMENT '当日总摄入热量',
  `total_calories_burned` decimal(10,2) DEFAULT NULL COMMENT '当日总消耗热量',
  `water_intake_ml` int DEFAULT NULL COMMENT '饮水量',
  `exercise_duration_min` int DEFAULT NULL COMMENT '运动总时长',
  `sleep_start_time` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '入睡时间',
  `sleep_duration_hours` decimal(4,2) DEFAULT NULL COMMENT '睡眠时长',
  `body_weight_kg` decimal(5,2) DEFAULT NULL COMMENT '当日体重',
  `energy_level` int DEFAULT NULL COMMENT '精力状态，1-5或1-10',
  `habit_tags` json DEFAULT NULL COMMENT '习惯标签，可json',
  `note` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户备注',
  `completion_rate` decimal(5,2) DEFAULT NULL COMMENT '当日打卡完成度',
  `ai_analysis_summary` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'AI简要分析',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
  `breakfast` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '早餐',
  `lunch` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '午餐',
  `dinner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '晚餐',
  `midnight_snack` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'nothing right now' COMMENT '夜宵',
  `mood` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '心情',
  `sleep_quality` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '睡眠状态描述',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`,`checkin_date`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_checkin_date` (`checkin_date`),
  CONSTRAINT `daily_checkin_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日打卡主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `digital_twin_profile`
--

DROP TABLE IF EXISTS `digital_twin_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `digital_twin_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `profile_date` date DEFAULT NULL COMMENT '画像日期',
  `model_version` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模型版本',
  `lifestyle_tags` json DEFAULT NULL COMMENT '晚睡型、外卖依赖型等标签',
  `diet_score` decimal(5,2) DEFAULT NULL COMMENT '饮食评分',
  `exercise_score` decimal(5,2) DEFAULT NULL COMMENT '运动评分',
  `sleep_score` decimal(5,2) DEFAULT NULL COMMENT '睡眠评分',
  `water_score` decimal(5,2) DEFAULT NULL COMMENT '饮水评分',
  `health_score` decimal(5,2) DEFAULT NULL COMMENT '综合健康评分',
  `behavior_summary` text COLLATE utf8mb4_unicode_ci COMMENT 'AI行为模式总结',
  `influencing_factors` text COLLATE utf8mb4_unicode_ci COMMENT '主要影响因素',
  `risk_labels` json DEFAULT NULL COMMENT '风险标签',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_profile_date` (`profile_date`),
  CONSTRAINT `digital_twin_profile_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数字孪生健康画像表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `goal_progress_log`
--

DROP TABLE IF EXISTS `goal_progress_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `goal_progress_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `goal_id` bigint NOT NULL COMMENT '目标ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `record_date` date DEFAULT NULL COMMENT '记录日期',
  `current_value` decimal(10,2) DEFAULT NULL COMMENT '当日进度值',
  `completion_rate` decimal(5,2) DEFAULT NULL COMMENT '完成率',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '说明',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_goal_id` (`goal_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `goal_progress_log_ibfk_1` FOREIGN KEY (`goal_id`) REFERENCES `health_goal` (`id`) ON DELETE CASCADE,
  CONSTRAINT `goal_progress_log_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='目标进度日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `health_goal`
--

DROP TABLE IF EXISTS `health_goal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `health_goal` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `goal_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'weight/exercise/sleep/water/diet/custom',
  `goal_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目标名称',
  `target_value` decimal(10,2) DEFAULT NULL COMMENT '目标值',
  `current_value` decimal(10,2) DEFAULT NULL COMMENT '当前值，可冗余',
  `unit` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'kg/min/day/ml等',
  `start_date` date DEFAULT NULL COMMENT '开始日期',
  `end_date` date DEFAULT NULL COMMENT '结束日期',
  `plan_cycle` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'daily/weekly/monthly',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ongoing/completed/cancelled',
  `estimated_finish_date` date DEFAULT NULL COMMENT '预计达成时间',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `health_goal_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康目标表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `health_portrait`
--

DROP TABLE IF EXISTS `health_portrait`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `health_portrait` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `exercise_score` int NOT NULL DEFAULT '0' COMMENT '运动评分 (0-100)',
  `meal_score` int NOT NULL DEFAULT '0' COMMENT '饮食评分 (0-100)',
  `sleep_score` int NOT NULL DEFAULT '0' COMMENT '睡眠评分 (0-100)',
  `overall_score` int NOT NULL DEFAULT '0' COMMENT '总体评分 (0-100)',
  `bmi` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'BMI指数',
  `bmi_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT 'BMI状态: underweight|normal|overweight|obese',
  `cardio_level` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '一般' COMMENT '心肺功能等级描述',
  `cardio_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '心肺功能状态: excellent|good|normal|poor',
  `metabolism` int NOT NULL DEFAULT '0' COMMENT '代谢指数 (0-100)',
  `metabolism_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '代谢状态: high|normal|low',
  `sleep_quality` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '一般' COMMENT '睡眠质量描述',
  `sleep_quality_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '睡眠质量状态: excellent|good|normal|poor',
  `radar_data` json DEFAULT NULL COMMENT '雷达图数据: {exercise, meal, sleep, cardio, metabolism, stressManagement}',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康画像表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `health_profile_setup`
--

DROP TABLE IF EXISTS `health_profile_setup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `health_profile_setup` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `is_completed` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已完成设置',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  `basic_info_completed` tinyint(1) NOT NULL DEFAULT '0' COMMENT '基础信息是否已填写',
  `health_exam_completed` tinyint(1) NOT NULL DEFAULT '0' COMMENT '体检数据是否已上传',
  `health_goals_completed` tinyint(1) NOT NULL DEFAULT '0' COMMENT '健康目标是否已设定',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康档案设置状态表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `health_recommendations`
--

DROP TABLE IF EXISTS `health_recommendations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `health_recommendations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `icon` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0xF09F92A1 COMMENT 'Emoji 图标',
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '建议标题',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '建议详情',
  `priority` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium' COMMENT '优先级: high|medium|low',
  `source_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '建议来源: exercise|meal|sleep|cardio|stress|water',
  `source_score` int DEFAULT NULL COMMENT '源指标的评分',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否活跃',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2026 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康建议表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `health_timeline`
--

DROP TABLE IF EXISTS `health_timeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `health_timeline` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `event_date` date NOT NULL COMMENT '事件日期',
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件标题',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件描述',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '状态: completed|in-progress|pending',
  `event_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '事件类型: profile_init|exercise_milestone|meal_milestone|sleep_milestone|overall_achievement|streak|custom',
  `related_score_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '相关评分类型: exercise|meal|sleep|overall',
  `related_score_value` int DEFAULT NULL COMMENT '相关的评分值',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_event_date` (`event_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康进度时间轴表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_message`
--

DROP TABLE IF EXISTS `notification_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_message` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `message_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'checkin/drink/sleep/alert/summary/system',
  `title` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标题',
  `content` text COLLATE utf8mb4_unicode_ci COMMENT '内容',
  `related_date` date DEFAULT NULL COMMENT '关联日期',
  `read_status` tinyint DEFAULT '0' COMMENT '已读状态',
  `trigger_source` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '规则触发来源',
  `send_time` datetime DEFAULT NULL COMMENT '发送时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_read_status` (`read_status`),
  KEY `idx_send_time` (`send_time`),
  CONSTRAINT `notification_message_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息提醒表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `refk_refresh_user` (`user_id`),
  CONSTRAINT `refk_refresh_user` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=162 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_completion_records`
--

DROP TABLE IF EXISTS `task_completion_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_completion_records` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `task_id` bigint DEFAULT NULL COMMENT '任务ID（可为NULL，用于删除的任务）',
  `task_title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务标题（快照）',
  `task_type` enum('checkin_exercise','checkin_meal','checkin_sleep','custom','ai_suggested') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务类型',
  `category` enum('diet','exercise','sleep','custom') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'custom' COMMENT '任务类别',
  `preset_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '预设类型',
  `task_priority` enum('high','medium','low') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium' COMMENT '优先级',
  `completion_date` date NOT NULL COMMENT '完成日期',
  `completion_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '完成时间',
  `due_date` date DEFAULT NULL COMMENT '原始截止日期',
  `category_icon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类图标',
  `completion_status` enum('on_time','late','early') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'on_time' COMMENT '完成状态（准时/迟到/提前）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_completion_date` (`user_id`,`completion_date`),
  KEY `idx_user_task_type` (`user_id`,`task_type`),
  KEY `idx_completion_date` (`completion_date`),
  KEY `idx_user_category` (`user_id`,`category`),
  CONSTRAINT `task_completion_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务完成记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_statistics`
--

DROP TABLE IF EXISTS `task_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_statistics` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '统计ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `statistic_date` date NOT NULL COMMENT '统计日期',
  `total` int unsigned DEFAULT '0' COMMENT '总任务数',
  `completed` int unsigned DEFAULT '0' COMMENT '已完成数',
  `pending` int unsigned DEFAULT '0' COMMENT '待完成数',
  `overdue` int unsigned DEFAULT '0' COMMENT '逾期数',
  `completion_rate` decimal(5,2) DEFAULT '0.00' COMMENT '完成率',
  `checkin_exercise_count` int unsigned DEFAULT '0' COMMENT '运动打卡数',
  `checkin_meal_count` int unsigned DEFAULT '0' COMMENT '饮食打卡数',
  `diet_count` int unsigned DEFAULT '0' COMMENT '饮食任务数',
  `exercise_count` int unsigned DEFAULT '0' COMMENT '运动任务数',
  `sleep_count` int unsigned DEFAULT '0' COMMENT '睡眠任务数',
  `preset_count` int unsigned DEFAULT '0' COMMENT '预设任务数',
  `diet_completed` int unsigned DEFAULT '0' COMMENT '饮食已完成数',
  `exercise_completed` int unsigned DEFAULT '0' COMMENT '运动已完成数',
  `sleep_completed` int unsigned DEFAULT '0' COMMENT '睡眠已完成数',
  `preset_completed` int unsigned DEFAULT '0' COMMENT '预设已完成数',
  `checkin_sleep_count` int unsigned DEFAULT '0' COMMENT '睡眠打卡数',
  `custom_count` int unsigned DEFAULT '0' COMMENT '自定义任务数',
  `ai_suggested_count` int unsigned DEFAULT '0' COMMENT 'AI建议任务数',
  `high_priority_count` int unsigned DEFAULT '0' COMMENT '高优先级数',
  `medium_priority_count` int unsigned DEFAULT '0' COMMENT '中优先级数',
  `low_priority_count` int unsigned DEFAULT '0' COMMENT '低优先级数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`,`statistic_date`),
  KEY `idx_user_date` (`user_id`,`statistic_date`),
  CONSTRAINT `task_statistics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务统计表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `user_id` bigint unsigned NOT NULL COMMENT '用户ID',
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务标题',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '任务描述',
  `type` enum('checkin_exercise','checkin_meal','checkin_sleep','custom','ai_suggested') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'custom' COMMENT '任务类型',
  `category` enum('diet','exercise','sleep','custom') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'custom' COMMENT '任务类别（新的四种分类）',
  `status` enum('pending','completed','overdue') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '任务状态',
  `priority` enum('high','medium','low') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium' COMMENT '优先级',
  `due_date` date NOT NULL COMMENT '截止日期',
  `due_time` time DEFAULT NULL COMMENT '截止时间',
  `is_daily` tinyint(1) DEFAULT '0' COMMENT '是否为日常任务',
  `completed_date` date DEFAULT NULL COMMENT '完成日期',
  `category_icon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类图标（emoji）',
  `ai_suggestion_reason` text COLLATE utf8mb4_unicode_ci COMMENT 'AI建议原因',
  `checkin_type` enum('exercise','meal','sleep') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '打卡类型',
  `checkin_recurrence` enum('tomorrow','everyday','workday','weekend') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '打卡重复方式',
  `date_type` enum('tomorrow','workday','weekend','everyday') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'tomorrow' COMMENT '日期类型（前端选择的日期选项）',
  `checkin_preset` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '打卡预设选项',
  `preset_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '预设类型（用于区分预设任务）',
  `ai_prompt` text COLLATE utf8mb4_unicode_ci COMMENT 'AI提示词',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_user_due_date` (`user_id`,`due_date`),
  KEY `idx_user_type` (`user_id`,`type`),
  KEY `idx_user_created_at` (`user_id`,`created_at`),
  KEY `idx_status_due_date` (`status`,`due_date`),
  KEY `idx_user_category` (`user_id`,`category`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_account`
--

DROP TABLE IF EXISTS `user_account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_account` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '登录账号，建议唯一',
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码哈希',
  `nickname` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称',
  `avatar_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像',
  `phone` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '手机号，可空',
  `role` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'student' COMMENT '用户角色，默认student',
  `status` tinyint DEFAULT '1' COMMENT '账号状态，1正常0禁用',
  `admin` tinyint DEFAULT '0' COMMENT '是否管理员，0普通用户1管理员',
  `last_login_time` datetime DEFAULT NULL COMMENT '最近登录时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` datetime DEFAULT NULL COMMENT '逻辑删除时间，可空',
  `credits` bigint NOT NULL DEFAULT '10000000' COMMENT '模型额度',
  PRIMARY KEY (`id`),
  UNIQUE KEY `account` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户账号表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_profile`
--

DROP TABLE IF EXISTS `user_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '关联user_account.id，一个用户一条主档案',
  `gender` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '性别',
  `birthday` date DEFAULT NULL COMMENT '生日，用于精确计算年龄',
  `age` int DEFAULT NULL COMMENT '冗余年龄，可选',
  `height_cm` decimal(5,2) DEFAULT NULL COMMENT '身高',
  `current_weight_kg` decimal(5,2) DEFAULT NULL COMMENT '当前体重',
  `target_weight_kg` decimal(5,2) DEFAULT NULL COMMENT '目标体重',
  `goal_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '增肌/减脂/维持/规律作息等',
  `dietary_preferences` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '饮食偏好，建议json或字符串',
  `allergies` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '过敏信息',
  `work_rest_habit` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '作息习惯描述',
  `activity_level` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日常活动水平',
  `health_goals` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '健康目标补充说明',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `realname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户自己写的真实名称',
  `diet_other_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sleep_habit` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `goal_other_text` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `user_profile_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户健康档案表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_settings`
--

DROP TABLE IF EXISTS `user_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_settings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `privacy_level` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '隐私等级',
  `notification_switch` tinyint DEFAULT '1' COMMENT '消息提醒总开关',
  `checkin_reminder_switch` tinyint DEFAULT '1' COMMENT '打卡提醒开关',
  `checkin_reminder_time` time DEFAULT NULL COMMENT '打卡提醒时间',
  `drink_reminder_switch` tinyint DEFAULT '1' COMMENT '饮水提醒开关',
  `drink_reminder_frequency` int DEFAULT NULL COMMENT '饮水提醒频率，单位分钟',
  `sleep_reminder_switch` tinyint DEFAULT '1' COMMENT '睡眠提醒开关',
  `sleep_reminder_time` time DEFAULT NULL COMMENT '睡眠提醒时间',
  `weekly_summary_switch` tinyint DEFAULT '1' COMMENT '周报开关',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户设置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_ai_chat_session_stats`
--

DROP TABLE IF EXISTS `v_ai_chat_session_stats`;
/*!50001 DROP VIEW IF EXISTS `v_ai_chat_session_stats`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_ai_chat_session_stats` AS SELECT 
 1 AS `id`,
 1 AS `uuid`,
 1 AS `user_id`,
 1 AS `session_name`,
 1 AS `ai_model`,
 1 AS `message_count`,
 1 AS `total_input_tokens`,
 1 AS `total_output_tokens`,
 1 AS `total_tokens`,
 1 AS `created_at`,
 1 AS `last_message_at`,
 1 AS `actual_message_count`,
 1 AS `actual_last_message_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_ai_user_chat_stats`
--

DROP TABLE IF EXISTS `v_ai_user_chat_stats`;
/*!50001 DROP VIEW IF EXISTS `v_ai_user_chat_stats`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_ai_user_chat_stats` AS SELECT 
 1 AS `user_id`,
 1 AS `total_sessions`,
 1 AS `total_messages`,
 1 AS `total_tokens`,
 1 AS `days_with_chats`,
 1 AS `latest_message_time`,
 1 AS `first_session_time`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_task_completion_stats_by_date`
--

DROP TABLE IF EXISTS `v_task_completion_stats_by_date`;
/*!50001 DROP VIEW IF EXISTS `v_task_completion_stats_by_date`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_task_completion_stats_by_date` AS SELECT 
 1 AS `user_id`,
 1 AS `completion_date`,
 1 AS `total_completed`,
 1 AS `on_time_count`,
 1 AS `late_count`,
 1 AS `early_count`,
 1 AS `unique_task_types`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_task_completion_stats_by_type`
--

DROP TABLE IF EXISTS `v_task_completion_stats_by_type`;
/*!50001 DROP VIEW IF EXISTS `v_task_completion_stats_by_type`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_task_completion_stats_by_type` AS SELECT 
 1 AS `user_id`,
 1 AS `task_type`,
 1 AS `total_completed`,
 1 AS `days_with_completion`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `v_ai_chat_session_stats`
--

/*!50001 DROP VIEW IF EXISTS `v_ai_chat_session_stats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`Zhangby619`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_ai_chat_session_stats` AS select `s`.`id` AS `id`,`s`.`uuid` AS `uuid`,`s`.`user_id` AS `user_id`,`s`.`session_name` AS `session_name`,`s`.`ai_model` AS `ai_model`,`s`.`message_count` AS `message_count`,`s`.`total_input_tokens` AS `total_input_tokens`,`s`.`total_output_tokens` AS `total_output_tokens`,`s`.`total_tokens` AS `total_tokens`,`s`.`created_at` AS `created_at`,`s`.`last_message_at` AS `last_message_at`,count(`m`.`id`) AS `actual_message_count`,max(`m`.`created_at`) AS `actual_last_message_at` from (`ai_chat_sessions` `s` left join `ai_chat_messages` `m` on(((`s`.`id` = `m`.`session_id`) and (`m`.`is_deleted` = false)))) group by `s`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_ai_user_chat_stats`
--

/*!50001 DROP VIEW IF EXISTS `v_ai_user_chat_stats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`Zhangby619`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_ai_user_chat_stats` AS select `ai_chat_sessions`.`user_id` AS `user_id`,count(distinct `ai_chat_sessions`.`id`) AS `total_sessions`,sum(`ai_chat_sessions`.`message_count`) AS `total_messages`,sum(`ai_chat_sessions`.`total_tokens`) AS `total_tokens`,count(distinct cast(`ai_chat_sessions`.`created_at` as date)) AS `days_with_chats`,max(`ai_chat_sessions`.`last_message_at`) AS `latest_message_time`,min(`ai_chat_sessions`.`created_at`) AS `first_session_time` from `ai_chat_sessions` where (`ai_chat_sessions`.`is_active` = true) group by `ai_chat_sessions`.`user_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_task_completion_stats_by_date`
--

/*!50001 DROP VIEW IF EXISTS `v_task_completion_stats_by_date`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`Zhangby619`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_task_completion_stats_by_date` AS select `task_completion_records`.`user_id` AS `user_id`,`task_completion_records`.`completion_date` AS `completion_date`,count(0) AS `total_completed`,sum((case when (`task_completion_records`.`completion_status` = 'on_time') then 1 else 0 end)) AS `on_time_count`,sum((case when (`task_completion_records`.`completion_status` = 'late') then 1 else 0 end)) AS `late_count`,sum((case when (`task_completion_records`.`completion_status` = 'early') then 1 else 0 end)) AS `early_count`,count(distinct `task_completion_records`.`task_type`) AS `unique_task_types` from `task_completion_records` group by `task_completion_records`.`user_id`,`task_completion_records`.`completion_date` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_task_completion_stats_by_type`
--

/*!50001 DROP VIEW IF EXISTS `v_task_completion_stats_by_type`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`Zhangby619`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_task_completion_stats_by_type` AS select `task_completion_records`.`user_id` AS `user_id`,`task_completion_records`.`task_type` AS `task_type`,count(0) AS `total_completed`,count(distinct cast(`task_completion_records`.`completion_time` as date)) AS `days_with_completion` from `task_completion_records` group by `task_completion_records`.`user_id`,`task_completion_records`.`task_type` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-13 16:17:41
