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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:15:15
