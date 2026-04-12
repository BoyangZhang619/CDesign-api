-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: cdesign_db
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:15:16
