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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:16:57
